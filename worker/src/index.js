const DEFAULT_ERROR_MESSAGE =
  "Nao conseguimos enviar sua solicitacao agora. Tente novamente ou fale conosco pelo WhatsApp.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const ALLOWED_SERVICE_INTERESTS = new Set([
  "automacao", "sites", "trafego", "gestao", "consultoria", "outro",
  "automation", "website", "traffic", "management", "consulting", "other",
  "diagnóstico estratégico", "gestão de tráfego", "identidade visual e design gráfico", "captação",
  "diagnóstico gratuito", "solução personalizada", "dúvida comercial",
]);
const HTML_TAG_PATTERN = /<[^>]*>/g;
const MAX_BODY_BYTES = 64 * 1024;

// Best-effort protection for repeated attempts inside a warm Worker isolate.
const rateLimitStore = new Map();
const leadFingerprintStore = new Map();

const nullableString = (value) => {
  const text = String(value ?? "").replace(HTML_TAG_PATTERN, "").trim();
  return text || null;
};

const requiredString = (value) => String(value ?? "").replace(HTML_TAG_PATTERN, "").trim();

const isTruthy = (value) => ["1", "true", "yes"].includes(String(value || "").toLowerCase());

const normalizePhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }

  return digits;
};

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "");

const isProductionEnvironment = (env) =>
  ["production", "prod"].includes(String(env.APP_ENV || "sandbox").toLowerCase());

const getAllowedOrigins = (env) =>
  `${env.FRONTEND_URL || ""},${env.ALLOWED_ORIGINS || ""}`
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const isLocalDevOrigin = (origin, env) => {
  if (isProductionEnvironment(env) && !isTruthy(env.ALLOW_LOCAL_ORIGINS)) {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
};

const getCors = (request, env) => {
  const origin = normalizeOrigin(request.headers.get("Origin"));

  if (!origin) {
    return { allowed: true, headers: {} };
  }

  if (getAllowedOrigins(env).includes(origin) || isLocalDevOrigin(origin, env)) {
    return {
      allowed: true,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    };
  }

  return { allowed: false, headers: { Vary: "Origin" } };
};

const securityHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const jsonResponse = (data, { status = 200, cors = {}, requestId = null } = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...securityHeaders,
      ...cors.headers,
      ...(requestId ? { "X-Request-Id": requestId } : {}),
    },
  });

const log = (level, event, details = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const logger = level === "error" ? console.error : console.log;
  logger(JSON.stringify(payload));
};

const pruneExpiringMap = (store, now = Date.now()) => {
  for (const [key, value] of store.entries()) {
    if ((value.expiresAt ?? value.resetAt) <= now) {
      store.delete(key);
    }
  }
};

const getClientIp = (request) =>
  request.headers.get("CF-Connecting-IP") ||
  request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
  null;

const checkRateLimit = async (request, env) => {
  const now = Date.now();
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS || 60000);
  const max = Number(env.RATE_LIMIT_MAX || 20);
  const key = getClientIp(request) || "unknown";
  if (env.LEADS_DB) {
    const bucket = Math.floor(now / windowMs);
    const bucketKey = await sha256Hex(`${key}:${bucket}`);
    const expiresAt = new Date((bucket + 2) * windowMs).toISOString();
    const row = await env.LEADS_DB.prepare(
      `INSERT INTO rate_limits (bucket_key, request_count, expires_at) VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET request_count = request_count + 1
       RETURNING request_count`
    ).bind(bucketKey, expiresAt).first();
    if (Number(row?.request_count || 1) > max) {
      return { ok: false, retryAfterSeconds: Math.ceil(((bucket + 1) * windowMs - now) / 1000) };
    }
    return { ok: true };
  }
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    pruneExpiringMap(rateLimitStore, now);
    return { ok: true };
  }

  current.count += 1;

  if (current.count > max) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  return { ok: true };
};

const verifyTurnstile = async (body, request, env) => {
  if (!env.TURNSTILE_SECRET_KEY) return { success: true, disabled: true };
  const token = requiredString(body.turnstileToken);
  if (!token || token.length > 2048) return { success: false };
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: getClientIp(request) }),
  });
  const result = await response.json();
  const allowedHostnames = new Set(getAllowedOrigins(env).map((origin) => {
    try { return new URL(origin).hostname; } catch { return null; }
  }).filter(Boolean));
  return {
    success: result.success === true && result.action === "lead_form" && allowedHostnames.has(result.hostname),
  };
};

const parseJsonBody = async (request) => {
  const contentLength = Number(request.headers.get("Content-Length") || 0);

  if (contentLength > MAX_BODY_BYTES) {
    const error = new Error("Payload too large.");
    error.status = 413;
    throw error;
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const error = new Error("Content-Type must be application/json.");
    error.status = 415;
    throw error;
  }

  const text = await request.text();

  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    const error = new Error("Payload too large.");
    error.status = 413;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Invalid JSON.");
    error.status = 400;
    throw error;
  }
};

const normalizeUtm = (utm = {}) => ({
  source: nullableString(utm.source ?? utm.utm_source),
  medium: nullableString(utm.medium ?? utm.utm_medium),
  campaign: nullableString(utm.campaign ?? utm.utm_campaign),
  term: nullableString(utm.term ?? utm.utm_term),
  content: nullableString(utm.content ?? utm.utm_content),
});

const buildMessage = (payload) => {
  const explicitMessage = nullableString(payload.lead?.message ?? payload.message);

  if (explicitMessage) {
    return explicitMessage;
  }

  const parts = [
    payload.nicho ? `Nicho da empresa: ${payload.nicho}` : null,
    payload.faturamento ? `Faturamento mensal: ${payload.faturamento}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join("\n") : null;
};

const normalizeLeadPayload = (payload = {}, env, context = {}) => {
  const lead = payload.lead || {};

  return {
    company: requiredString(payload.company) || env.COMPANY_NAME || "BACKE.co",
    environment: requiredString(payload.environment) || env.APP_ENV || "production",
    source: requiredString(payload.source) || "website",
    formId: requiredString(payload.formId) || context.formId || "website-contact-form",
    pageUrl: requiredString(payload.pageUrl) || context.pageUrl || "",
    pageTitle: requiredString(payload.pageTitle) || context.pageTitle || "",
    utm: normalizeUtm(payload.utm || {}),
    lead: {
      name: requiredString(lead.name ?? payload.nome ?? payload.name),
      email: nullableString(lead.email ?? payload.email)?.toLowerCase() || null,
      phone: normalizePhone(lead.phone ?? payload.whatsapp ?? payload.phone),
      message: buildMessage(payload),
      serviceInterest: nullableString(
        lead.serviceInterest ?? payload.serviceInterest ?? payload.interesse
      ),
      companyName: nullableString(lead.companyName ?? payload.empresa ?? payload.companyName),
    },
    seller: {
      name: nullableString(payload.seller?.name ?? env.DEFAULT_SELLER_NAME),
      phone: normalizePhone(payload.seller?.phone ?? env.DEFAULT_SELLER_PHONE) || null,
    },
    metadata: {
      submittedAt: new Date().toISOString(),
    },
  };
};

const hasHoneypotValue = (payload = {}) => {
  const honeypotFields = ["website", "url", "companyWebsite", "contact_me_by_fax_only"];
  return honeypotFields.some((field) => requiredString(payload[field]));
};

const validateLeadPayload = (payload) => {
  if (!payload.lead.name) {
    return { ok: false, message: "Informe seu nome." };
  }

  if (!payload.lead.phone) {
    return { ok: false, message: "Informe seu WhatsApp." };
  }

  if (payload.lead.email && !EMAIL_PATTERN.test(payload.lead.email)) {
    return { ok: false, message: "Informe um email valido." };
  }

  const phoneDigits = payload.lead.phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, message: "Informe um WhatsApp valido." };
  }

  if (payload.lead.name.length > 120 || (payload.lead.companyName?.length || 0) > 120) {
    return { ok: false, message: "Campos de texto excedem o limite permitido." };
  }

  if ((payload.lead.email?.length || 0) > 255 || payload.lead.phone.length > 20) {
    return { ok: false, message: "Campos excedem o limite permitido." };
  }

  if (
    payload.lead.serviceInterest &&
    !ALLOWED_SERVICE_INTERESTS.has(payload.lead.serviceInterest.toLowerCase())
  ) {
    return { ok: false, message: "Selecione uma opcao valida para o servico de interesse." };
  }

  const hasAnyLeadSignal = [
    payload.lead.name,
    payload.lead.email,
    payload.lead.phone,
    payload.lead.message,
    payload.lead.serviceInterest,
    payload.lead.companyName,
  ].some(Boolean);

  if (!hasAnyLeadSignal) {
    return { ok: false, message: "Preencha os campos obrigatorios." };
  }

  return { ok: true };
};

const sha256Hex = async (value) => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const createLeadFingerprint = (leadPayload) =>
  sha256Hex(
    JSON.stringify({
      company: leadPayload.company,
      environment: leadPayload.environment,
      formId: leadPayload.formId,
      pageUrl: leadPayload.pageUrl,
      name: leadPayload.lead.name.toLowerCase(),
      email: leadPayload.lead.email,
      phone: leadPayload.lead.phone,
      serviceInterest: leadPayload.lead.serviceInterest,
      companyName: leadPayload.lead.companyName,
    })
  );

const parseJsonResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryRequest = (error) => {
  if (error.name === "AbortError") {
    return true;
  }

  if (typeof error.status === "number") {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }

  return !error.status;
};

const requestJsonOnce = async (url, env, options = {}) => {
  const timeoutMs = Number(env.META_REQUEST_TIMEOUT_MS || 10000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await parseJsonResponse(response);

    if (!response.ok || data?.ok === false) {
      const error = new Error("External API request failed.");
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data || { ok: true };
  } finally {
    clearTimeout(timeout);
  }
};

const requestJson = async (url, env, options = {}) => {
  if (!url) {
    throw new Error("Webhook URL is not configured.");
  }

  const attempts = Math.max(1, Number(env.META_RETRY_ATTEMPTS || 3));
  const baseDelayMs = Number(env.META_RETRY_BASE_DELAY_MS || 500);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestJsonOnce(url, env, options);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetryRequest(error)) {
        throw error;
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError;
};

const getMetaUrl = (env) => {
  if (!env.META_WHATSAPP_PHONE_NUMBER_ID) throw new Error("Meta WhatsApp is not configured.");
  return `https://graph.facebook.com/${env.META_GRAPH_API_VERSION || "v23.0"}/${env.META_WHATSAPP_PHONE_NUMBER_ID}`;
};

const isMetaConfigured = (env) => Boolean(
  env.META_WHATSAPP_ACCESS_TOKEN &&
  env.META_WHATSAPP_PHONE_NUMBER_ID &&
  env.META_WHATSAPP_TEMPLATE_NAME
);

const buildMetaTemplateRequest = (leadPayload, env) => {
  if (!env.META_WHATSAPP_TEMPLATE_NAME) throw new Error("Meta WhatsApp template is not configured.");
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: leadPayload.lead.phone,
    type: "template",
    template: {
      name: env.META_WHATSAPP_TEMPLATE_NAME,
      language: { code: env.META_WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR" },
      components: [{ type: "body", parameters: [
        { type: "text", text: leadPayload.lead.name },
        { type: "text", text: leadPayload.lead.serviceInterest || "atendimento e automacao" },
      ] }],
    },
  };
};

const sendLeadToMeta = async (leadPayload, env) => {
  if (!env.META_WHATSAPP_ACCESS_TOKEN) throw new Error("Meta WhatsApp is not configured.");
  const data = await requestJson(`${getMetaUrl(env)}/messages`, env, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}` },
    body: JSON.stringify(buildMetaTemplateRequest(leadPayload, env)),
  });
  return { ok: true, messageId: data?.messages?.[0]?.id || null };
};

const checkMetaHealth = (env) => {
  if (!env.META_WHATSAPP_ACCESS_TOKEN) throw new Error("Meta WhatsApp is not configured.");
  return requestJson(`${getMetaUrl(env)}?fields=id,display_phone_number`, env, {
    method: "GET",
    headers: { Authorization: `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}` },
  });
};

const saveLead = async (env, fingerprint, leadPayload) => {
  if (!env.LEADS_DB) throw new Error("LEADS_DB binding is required.");
  await env.LEADS_DB.prepare(
    `INSERT OR IGNORE INTO leads (idempotency_key, status, payload_json, attempts, next_attempt_at)
     VALUES (?, 'received', ?, 0, datetime('now'))`
  ).bind(fingerprint, JSON.stringify(leadPayload)).run();
  return env.LEADS_DB.prepare("SELECT id, status FROM leads WHERE idempotency_key = ?").bind(fingerprint).first();
};

const markLeadSent = (env, id, response) => env.LEADS_DB.prepare(
  "UPDATE leads SET status = 'meta_sent', meta_message_id = ?, error_message = NULL, updated_at = datetime('now') WHERE id = ?"
).bind(response.messageId, id).run();

const markLeadFailed = (env, id, error) => env.LEADS_DB.prepare(
  `UPDATE leads SET status = 'meta_failed', attempts = attempts + 1, error_message = ?,
   next_attempt_at = datetime('now', '+' || min(60, (attempts + 1) * 5) || ' minutes'), updated_at = datetime('now') WHERE id = ?`
).bind(String(error?.message || "Meta send failed").slice(0, 500), id).run();

const claimLead = async (env, id) => {
  const result = await env.LEADS_DB.prepare(
    `UPDATE leads SET status = 'processing', lease_until = datetime('now', '+2 minutes'), updated_at = datetime('now')
     WHERE id = ? AND (status IN ('received', 'meta_failed') OR (status = 'processing' AND lease_until < datetime('now')))`
  ).bind(id).run();
  return Number(result.meta?.changes || 0) === 1;
};

const retryPendingLeads = async (env) => {
  if (!env.LEADS_DB || !isMetaConfigured(env)) return;
  const { results = [] } = await env.LEADS_DB.prepare(
    "SELECT id, payload_json FROM leads WHERE (status IN ('received', 'meta_failed') OR (status = 'processing' AND lease_until < datetime('now'))) AND attempts < 12 AND next_attempt_at <= datetime('now') ORDER BY created_at LIMIT 25"
  ).all();
  for (const row of results) {
    if (!(await claimLead(env, row.id))) continue;
    try {
      const response = await sendLeadToMeta(JSON.parse(row.payload_json), env);
      await markLeadSent(env, row.id, response);
    } catch (error) {
      await markLeadFailed(env, row.id, error);
      log("error", "lead_retry_failed", { leadId: row.id, message: error.message, status: error.status });
    }
  }
};

const handleOptions = (request, env, requestId) => {
  const cors = getCors(request, env);

  if (!cors.allowed) {
    return jsonResponse({ ok: false, message: "Origem nao autorizada." }, { status: 403, cors, requestId });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...cors.headers,
      ...(requestId ? { "X-Request-Id": requestId } : {}),
    },
  });
};

const handleLeadPost = async (request, env, cors, requestId) => {
  const rateLimit = await checkRateLimit(request, env);

  if (!rateLimit.ok) {
    log("warn", "lead_rate_limited", {
      requestId,
      ip: getClientIp(request),
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    return jsonResponse(
      {
        ok: false,
        message: "Recebemos muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.",
      },
      {
        status: 429,
        cors: {
          ...cors,
          headers: {
            ...cors.headers,
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
        requestId,
      }
    );
  }

  let body;

  try {
    body = await parseJsonBody(request);
  } catch (error) {
    const message =
      error.status === 400
        ? "JSON invalido no corpo da requisicao."
        : error.status === 413
          ? "Solicitacao muito grande."
          : "Formato da solicitacao invalido.";

    return jsonResponse({ ok: false, message }, { status: error.status || 400, cors, requestId });
  }

  if (hasHoneypotValue(body)) {
    log("warn", "lead_honeypot_rejected", {
      requestId,
      ip: getClientIp(request),
    });

    return jsonResponse({ ok: false, message: DEFAULT_ERROR_MESSAGE }, { status: 400, cors, requestId });
  }

  let turnstile;
  try {
    turnstile = await verifyTurnstile(body, request, env);
  } catch (error) {
    log("error", "turnstile_unavailable", { requestId, message: error.message });
    return jsonResponse({ ok: false, message: DEFAULT_ERROR_MESSAGE }, { status: 503, cors, requestId });
  }
  if (!turnstile.success) {
    log("warn", "turnstile_rejected", { requestId });
    return jsonResponse({ ok: false, message: "Não foi possível validar o envio. Atualize a página e tente novamente." }, { status: 400, cors, requestId });
  }

  const leadPayload = normalizeLeadPayload(body, env, {
    formId: "website-contact-form",
    userAgent: request.headers.get("User-Agent") || null,
    ip: getClientIp(request),
  });
  const validation = validateLeadPayload(leadPayload);

  if (!validation.ok) {
    log("warn", "lead_validation_failed", {
      requestId,
      reason: validation.message,
    });

    return jsonResponse({ ok: false, message: validation.message }, { status: 400, cors, requestId });
  }

  const now = Date.now();
  const fingerprint = await createLeadFingerprint(leadPayload);
  const idempotencyWindowMs = Number(env.LEAD_IDEMPOTENCY_WINDOW_MS || 300000);
  pruneExpiringMap(leadFingerprintStore, now);

  if (leadFingerprintStore.has(fingerprint)) {
    log("info", "lead_duplicate_skipped", {
      requestId,
      formId: leadPayload.formId,
    });

    return jsonResponse(
      {
        ok: true,
        message: "Lead sent successfully",
        duplicate: true,
      },
      { status: 200, cors, requestId }
    );
  }

  leadPayload.metadata.idempotencyKey = fingerprint;

  let storedLead;
  try {
    storedLead = await saveLead(env, fingerprint, leadPayload);
  } catch (error) {
    log("error", "lead_persistence_failed", { requestId, message: error.message });
    return jsonResponse({ ok: false, message: DEFAULT_ERROR_MESSAGE }, { status: 503, cors, requestId });
  }

  if (storedLead.status === "meta_sent") {
    return jsonResponse({ ok: true, message: "Lead sent successfully", duplicate: true }, { status: 200, cors, requestId });
  }

  if (!isMetaConfigured(env)) {
    leadFingerprintStore.set(fingerprint, { expiresAt: now + idempotencyWindowMs });
    return jsonResponse(
      { ok: true, message: "Lead saved. Automation is awaiting activation.", automationStatus: "received" },
      { status: 202, cors, requestId }
    );
  }

  try {
    if (!(await claimLead(env, storedLead.id))) {
      return jsonResponse({ ok: true, message: "Lead is already being processed", duplicate: true }, { status: 200, cors, requestId });
    }
    const metaResponse = await sendLeadToMeta(leadPayload, env);
    await markLeadSent(env, storedLead.id, metaResponse);
    leadFingerprintStore.set(fingerprint, {
      expiresAt: now + idempotencyWindowMs,
    });

    log("info", "lead_sent_to_meta", {
      requestId,
      formId: leadPayload.formId,
      metaMessageId: metaResponse.messageId,
    });

    return jsonResponse(
      {
        ok: true,
        message: "Lead sent successfully",
        automationStatus: "meta_sent",
      },
      { status: 201, cors, requestId }
    );
  } catch (error) {
    await markLeadFailed(env, storedLead.id, error);
    log("error", "lead_forward_failed", {
      requestId,
      message: error.message,
      status: error.status,
    });

    leadFingerprintStore.set(fingerprint, { expiresAt: now + idempotencyWindowMs });
    return jsonResponse({ ok: true, message: "Lead saved. Automation is pending.", automationStatus: "meta_failed" }, { status: 202, cors, requestId });
  }
};

const handleRequest = async (request, env) => {
  const requestId = crypto.randomUUID();

  if (request.method === "OPTIONS") {
    return handleOptions(request, env, requestId);
  }

  const cors = getCors(request, env);

  if (!cors.allowed) {
    return jsonResponse({ ok: false, message: "Origem nao autorizada." }, { status: 403, cors, requestId });
  }

  const url = new URL(request.url);

  if ((url.pathname === "/" || url.pathname === "/health") && request.method === "GET") {
    return jsonResponse(
      {
        ok: true,
        company: env.COMPANY_NAME || "BACKE.co",
        environment: env.APP_ENV || "production",
        message: "Worker Backe online",
      },
      { cors, requestId }
    );
  }

  if (url.pathname === "/api/local-leads/health" && request.method === "GET") {
    return jsonResponse(
      {
        ok: true,
        enabled: false,
        message: "Local lead database is not available in Cloudflare Workers.",
      },
      { cors, requestId }
    );
  }

  if (url.pathname === "/api/admin/health" && request.method === "GET") {
    if (!env.ADMIN_HEALTH_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.ADMIN_HEALTH_TOKEN}`) {
      return jsonResponse({ ok: false, message: "Rota nao encontrada." }, { status: 404, cors, requestId });
    }
    const counts = await env.LEADS_DB.prepare(
      "SELECT status, COUNT(*) AS count FROM leads GROUP BY status"
    ).all();
    const exhausted = await env.LEADS_DB.prepare(
      "SELECT COUNT(*) AS count FROM leads WHERE status = 'meta_failed' AND attempts >= 12"
    ).first();
    return jsonResponse({
      ok: true,
      leadsByStatus: Object.fromEntries((counts.results || []).map((row) => [row.status, row.count])),
      exhaustedRetries: Number(exhausted?.count || 0),
    }, { cors, requestId });
  }

  if (url.pathname === "/api/meta/health" && request.method === "GET") {
    try {
      const meta = await checkMetaHealth(env);
      return jsonResponse({ ok: true, meta: { configured: true, phoneNumberId: meta.id, displayPhoneNumber: meta.display_phone_number || null } }, { cors, requestId });
    } catch (error) {
      log("error", "meta_health_failed", {
        requestId,
        message: error.message,
        status: error.status,
      });

      return jsonResponse(
        {
          ok: false,
          message: "Nao foi possivel verificar a API do WhatsApp agora.",
        },
        { status: 502, cors, requestId }
      );
    }
  }

  if (url.pathname === "/api/leads" && request.method === "POST") {
    return handleLeadPost(request, env, cors, requestId);
  }

  return jsonResponse({ ok: false, message: "Rota nao encontrada." }, { status: 404, cors, requestId });
};

export default {
  fetch: handleRequest,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(Promise.all([
      retryPendingLeads(env),
      env.LEADS_DB?.batch([
        env.LEADS_DB.prepare("DELETE FROM rate_limits WHERE expires_at < datetime('now')"),
      env.LEADS_DB.prepare("DELETE FROM leads WHERE status != 'processing' AND created_at < datetime('now', ?)")
        .bind(`-${Math.max(1, Number(env.LEAD_RETENTION_DAYS || 180))} days`),
      ]),
    ]));
  },
};
