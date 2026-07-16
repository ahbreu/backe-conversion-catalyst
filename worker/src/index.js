import { WorkflowEntrypoint } from "cloudflare:workers";

const DEFAULT_ERROR_MESSAGE =
  "Nao conseguimos enviar sua solicitacao agora. Tente novamente ou fale conosco pelo WhatsApp.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const ALLOWED_SERVICE_INTERESTS = new Set([
  "automacao", "sites", "trafego", "gestao", "consultoria", "outro",
  "automation", "website", "traffic", "management", "consulting", "other",
  "diagnóstico estratégico", "gestão de tráfego", "identidade visual e design gráfico", "captação",
  "diagnóstico gratuito", "solução personalizada", "dúvida comercial",
  "tráfego pago", "gestão de redes sociais", "estratégia & performance",
  "treinamento & capacitação de vendas", "branding & identidade visual",
  "design gráfico & motions", "criação de sites & landing pages",
  "captação audiovisual", "captação com drone", "whatsapp",
]);
const HTML_TAG_PATTERN = /<[^>]*>/g;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const MAX_BODY_BYTES = 64 * 1024;

// Best-effort protection for repeated attempts inside a warm Worker isolate.
const rateLimitStore = new Map();
const leadFingerprintStore = new Map();

const nullableString = (value) => {
  const text = String(value ?? "").replace(HTML_TAG_PATTERN, "").replace(CONTROL_CHARACTER_PATTERN, "").trim();
  return text || null;
};

const requiredString = (value) => String(value ?? "").replace(HTML_TAG_PATTERN, "").replace(CONTROL_CHARACTER_PATTERN, "").trim();
const limitedString = (value, maxLength) => requiredString(value).slice(0, maxLength);
const limitedNullableString = (value, maxLength) => limitedString(value, maxLength) || null;

const normalizePageUrl = (value) => {
  try {
    const url = new URL(requiredString(value));
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return "";
  }
};

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

const constantTimeEqual = (left, right) => {
  const first = String(left || "");
  const second = String(right || "");
  const length = Math.max(first.length, second.length);
  let mismatch = first.length ^ second.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }
  return mismatch === 0;
};

const isAdminAuthorized = (request, env) => {
  if (!env.ADMIN_HEALTH_TOKEN) return false;
  const received = String(request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return constantTimeEqual(received, env.ADMIN_HEALTH_TOKEN);
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
  if (!env.TURNSTILE_SECRET_KEY) {
    return { success: !isProductionEnvironment(env), disabled: true };
  }
  const token = requiredString(body.turnstileToken);
  if (!token || token.length > 2048) return { success: false };
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: getClientIp(request) }),
    signal: AbortSignal.timeout(10000),
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
  source: limitedNullableString(utm.source ?? utm.utm_source, 200),
  medium: limitedNullableString(utm.medium ?? utm.utm_medium, 200),
  campaign: limitedNullableString(utm.campaign ?? utm.utm_campaign, 200),
  term: limitedNullableString(utm.term ?? utm.utm_term, 200),
  content: limitedNullableString(utm.content ?? utm.utm_content, 200),
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
    company: limitedString(env.COMPANY_NAME || "BACKE.co", 120),
    environment: limitedString(env.APP_ENV || "production", 40),
    source: "website",
    formId: limitedString(context.formId || "website-contact-form", 120),
    pageUrl: normalizePageUrl(payload.pageUrl || context.pageUrl),
    pageTitle: limitedString(payload.pageTitle || context.pageTitle, 160),
    utm: normalizeUtm(payload.utm || {}),
    lead: {
      name: limitedString(lead.name ?? payload.nome ?? payload.name, 120),
      email: limitedNullableString(lead.email ?? payload.email, 255)?.toLowerCase() || null,
      phone: normalizePhone(lead.phone ?? payload.whatsapp ?? payload.phone),
      message: limitedNullableString(buildMessage(payload), 500),
      serviceInterest: limitedNullableString(
        lead.serviceInterest ?? payload.serviceInterest ?? payload.interesse, 120
      ),
      companyName: limitedNullableString(lead.companyName ?? payload.empresa ?? payload.companyName, 120),
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

const buildMetaTemplateRequest = (leadPayload, env, templateName = env.META_WHATSAPP_TEMPLATE_NAME) => {
  if (!templateName) throw new Error("Meta WhatsApp template is not configured.");
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: leadPayload.lead.phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: env.META_WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR" },
      components: [{ type: "body", parameters: [
        { type: "text", text: leadPayload.lead.name },
        { type: "text", text: leadPayload.lead.serviceInterest || "atendimento e automacao" },
      ] }],
    },
  };
};

const sendLeadToMeta = async (leadPayload, env, templateName = env.META_WHATSAPP_TEMPLATE_NAME) => {
  if (!env.META_WHATSAPP_ACCESS_TOKEN) throw new Error("Meta WhatsApp is not configured.");
  const data = await requestJson(`${getMetaUrl(env)}/messages`, env, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.META_WHATSAPP_ACCESS_TOKEN}` },
    body: JSON.stringify(buildMetaTemplateRequest(leadPayload, env, templateName)),
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

const startLeadWorkflow = async (env, leadId) => {
  if (!env.LEAD_AUTOMATION) return null;
  const existing = await env.LEADS_DB.prepare(
    "SELECT workflow_instance_id FROM leads WHERE id = ?"
  ).bind(leadId).first();
  if (existing?.workflow_instance_id) return existing.workflow_instance_id;
  const instanceId = `lead-${leadId}`;
  try {
    await env.LEAD_AUTOMATION.create({ id: instanceId, params: { leadId } });
  } catch (error) {
    if (!String(error.message || "").toLowerCase().includes("already")) throw error;
  }
  await env.LEADS_DB.prepare(
    "UPDATE leads SET workflow_instance_id = ?, updated_at = datetime('now') WHERE id = ? AND workflow_instance_id IS NULL"
  ).bind(instanceId, leadId).run();
  return instanceId;
};

const startPendingWorkflows = async (env) => {
  if (!env.LEAD_AUTOMATION || !isMetaConfigured(env)) return;
  const { results = [] } = await env.LEADS_DB.prepare(
    "SELECT id FROM leads WHERE status IN ('received', 'meta_failed') AND workflow_instance_id IS NULL AND attempts < 12 ORDER BY created_at LIMIT 25"
  ).all();
  for (const row of results) await startLeadWorkflow(env, row.id);
};

const retryPendingLeads = async (env) => {
  if (!env.LEADS_DB || !isMetaConfigured(env) || env.LEAD_AUTOMATION) return;
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

const generateAutomationReports = (env) => env.LEADS_DB.batch([
  env.LEADS_DB.prepare(
    `INSERT OR REPLACE INTO automation_reports
     SELECT 'daily', date('now'),
       (SELECT COUNT(*) FROM leads WHERE date(created_at) = date('now')),
       (SELECT COUNT(*) FROM lead_messages WHERE direction = 'outbound' AND date(created_at) = date('now')),
       (SELECT COUNT(*) FROM lead_messages WHERE status IN ('delivered', 'read') AND date(updated_at) = date('now')),
       (SELECT COUNT(*) FROM lead_messages WHERE status = 'failed' AND date(updated_at) = date('now')),
       (SELECT COUNT(*) FROM leads WHERE contact_status = 'replied' AND date(last_inbound_at) = date('now')),
       datetime('now')`
  ),
  env.LEADS_DB.prepare(
    `INSERT OR REPLACE INTO automation_reports
     SELECT 'weekly', strftime('%Y-W%W', 'now'),
       (SELECT COUNT(*) FROM leads WHERE created_at >= datetime('now', '-7 days')),
       (SELECT COUNT(*) FROM lead_messages WHERE direction = 'outbound' AND created_at >= datetime('now', '-7 days')),
       (SELECT COUNT(*) FROM lead_messages WHERE status IN ('delivered', 'read') AND updated_at >= datetime('now', '-7 days')),
       (SELECT COUNT(*) FROM lead_messages WHERE status = 'failed' AND updated_at >= datetime('now', '-7 days')),
       (SELECT COUNT(*) FROM leads WHERE contact_status = 'replied' AND last_inbound_at >= datetime('now', '-7 days')),
       datetime('now')`
  ),
]);

const handleOptions = (request, env, requestId) => {
  const cors = getCors(request, env);

  if (!cors.allowed) {
    return jsonResponse({ ok: false, message: "Origem nao autorizada." }, { status: 403, cors, requestId });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...securityHeaders,
      ...cors.headers,
      ...(requestId ? { "X-Request-Id": requestId } : {}),
    },
  });
};

const handleLeadPost = async (request, env, cors, requestId) => {
  if (isProductionEnvironment(env) && !request.headers.get("Origin")) {
    return jsonResponse({ ok: false, message: "Origem nao autorizada." }, { status: 403, cors, requestId });
  }

  const rateLimit = await checkRateLimit(request, env);

  if (!rateLimit.ok) {
    log("warn", "lead_rate_limited", {
      requestId,
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

  try {
    const workflowInstanceId = isMetaConfigured(env)
      ? await startLeadWorkflow(env, storedLead.id)
      : null;
    leadFingerprintStore.set(fingerprint, { expiresAt: now + idempotencyWindowMs });
    return jsonResponse(
      {
        ok: true,
        message: workflowInstanceId
          ? "Lead saved. Automation started."
          : "Lead saved. Automation is awaiting activation.",
        automationStatus: "received",
      },
      { status: 202, cors, requestId }
    );
  } catch (error) {
    log("error", "lead_workflow_start_failed", {
      requestId,
      message: error.message,
      status: error.status,
    });
    return jsonResponse({ ok: true, message: "Lead saved. Automation is pending.", automationStatus: "received" }, { status: 202, cors, requestId });
  }
};

const verifyMetaSignature = async (rawBody, signatureHeader, appSecret) => {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${[...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== signatureHeader.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signatureHeader.charCodeAt(index);
  return mismatch === 0;
};

const handleMetaWebhookVerification = (url, env, cors, requestId) => {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (env.META_WEBHOOK_VERIFY_TOKEN && mode === "subscribe" && token === env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200, headers: { ...cors.headers, "Content-Type": "text/plain", "X-Request-Id": requestId } });
  }
  return jsonResponse({ ok: false, message: "Webhook verification failed." }, { status: 403, cors, requestId });
};

const findLeadByPhone = (env, phone) => env.LEADS_DB.prepare(
  "SELECT id, workflow_instance_id FROM leads WHERE json_extract(payload_json, '$.lead.phone') = ? ORDER BY created_at DESC LIMIT 1"
).bind(normalizePhone(phone)).first();

const handleMetaWebhook = async (request, env, cors, requestId) => {
  if (!env.META_APP_SECRET) return jsonResponse({ ok: false, message: "Webhook not configured." }, { status: 503, cors, requestId });
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, message: "Payload too large." }, { status: 413, cors, requestId });
  }
  if (!(await verifyMetaSignature(rawBody, request.headers.get("X-Hub-Signature-256"), env.META_APP_SECRET))) {
    log("warn", "meta_webhook_signature_rejected", { requestId });
    return jsonResponse({ ok: false, message: "Invalid signature." }, { status: 401, cors, requestId });
  }
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return jsonResponse({ ok: false, message: "Invalid JSON." }, { status: 400, cors, requestId }); }
  const eventHash = await sha256Hex(rawBody);
  const inserted = await env.LEADS_DB.prepare(
    "INSERT OR IGNORE INTO webhook_events (event_hash, event_type) VALUES (?, 'meta')"
  ).bind(eventHash).run();
  if (Number(inserted.meta?.changes || 0) === 0) return jsonResponse({ ok: true, duplicate: true }, { cors, requestId });

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const status of value.statuses || []) {
        const nextStatus = ["sent", "delivered", "read", "failed"].includes(status.status) ? status.status : null;
        if (!nextStatus) continue;
        await env.LEADS_DB.prepare(
          `UPDATE lead_messages SET status = ?, error_code = ?, error_message = ?, occurred_at = datetime(?, 'unixepoch'), updated_at = datetime('now')
           WHERE meta_message_id = ?`
        ).bind(
          nextStatus,
          nullableString(status.errors?.[0]?.code),
          nullableString(status.errors?.[0]?.title),
          Number(status.timestamp || Math.floor(Date.now() / 1000)),
          status.id
        ).run();
      }
      for (const message of value.messages || []) {
        const lead = await findLeadByPhone(env, message.from);
        if (!lead) continue;
        await env.LEADS_DB.batch([
          env.LEADS_DB.prepare(
            `INSERT OR IGNORE INTO lead_messages (lead_id, direction, message_type, meta_message_id, status, occurred_at)
             VALUES (?, 'inbound', ?, ?, 'received', datetime(?, 'unixepoch'))`
          ).bind(lead.id, requiredString(message.type) || "unknown", message.id, Number(message.timestamp || Math.floor(Date.now() / 1000))),
          env.LEADS_DB.prepare(
            "UPDATE leads SET contact_status = 'replied', last_inbound_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
          ).bind(lead.id),
        ]);
        if (lead.workflow_instance_id && env.LEAD_AUTOMATION) {
          try {
            const instance = await env.LEAD_AUTOMATION.get(lead.workflow_instance_id);
            await instance.sendEvent({ type: "whatsapp-inbound", payload: { messageId: message.id } });
          } catch (error) {
            log("error", "workflow_inbound_event_failed", { requestId, leadId: lead.id, message: error.message });
          }
        }
      }
    }
  }
  return jsonResponse({ ok: true }, { cors, requestId });
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

  if (url.pathname === "/api/meta/webhook" && request.method === "GET") {
    return handleMetaWebhookVerification(url, env, cors, requestId);
  }

  if (url.pathname === "/api/meta/webhook" && request.method === "POST") {
    return handleMetaWebhook(request, env, cors, requestId);
  }

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
    if (!isAdminAuthorized(request, env)) {
      return jsonResponse({ ok: false, message: "Rota nao encontrada." }, { status: 404, cors, requestId });
    }
    const counts = await env.LEADS_DB.prepare(
      "SELECT status, COUNT(*) AS count FROM leads GROUP BY status"
    ).all();
    const exhausted = await env.LEADS_DB.prepare(
      "SELECT COUNT(*) AS count FROM leads WHERE contact_status IN ('automation_failed', 'followup_failed')"
    ).first();
    const unassigned = await env.LEADS_DB.prepare(
      "SELECT COUNT(*) AS count FROM leads WHERE seller_id IS NULL AND created_at < datetime('now', '-1 hour')"
    ).first();
    const reports = await env.LEADS_DB.prepare(
      "SELECT * FROM automation_reports ORDER BY period_start DESC LIMIT 8"
    ).all();
    const activeSellers = await env.LEADS_DB.prepare(
      "SELECT COUNT(*) AS count FROM sellers WHERE active = 1"
    ).first();
    return jsonResponse({
      ok: true,
      leadsByStatus: Object.fromEntries((counts.results || []).map((row) => [row.status, row.count])),
      exhaustedRetries: Number(exhausted?.count || 0),
      unassignedLeads: Number(unassigned?.count || 0),
      activeSellers: Number(activeSellers?.count || 0),
      recentReports: reports.results || [],
    }, { cors, requestId });
  }

  if (url.pathname === "/api/meta/health" && request.method === "GET") {
    if (!isAdminAuthorized(request, env)) {
      return jsonResponse({ ok: false, message: "Rota nao encontrada." }, { status: 404, cors, requestId });
    }
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

const millisecondsUntilBusinessHours = (env, now = new Date()) => {
  const timezone = env.BUSINESS_TIMEZONE || "America/Sao_Paulo";
  const startHour = Number(env.BUSINESS_START_HOUR || 9);
  const endHour = Number(env.BUSINESS_END_HOUR || 18);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });
  for (let offsetMinutes = 0; offsetMinutes <= 8 * 24 * 60; offsetMinutes += 15) {
    const candidate = new Date(now.getTime() + offsetMinutes * 60_000);
    const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
    const hour = Number(parts.hour);
    if (!['Sat', 'Sun'].includes(parts.weekday) && hour >= startHour && hour < endHour) {
      return offsetMinutes * 60_000;
    }
  }
  return 60 * 60_000;
};

const assignSeller = async (env, leadId) => {
  const existing = await env.LEADS_DB.prepare("SELECT seller_id FROM leads WHERE id = ?").bind(leadId).first();
  if (existing?.seller_id) return existing.seller_id;
  const seller = await env.LEADS_DB.prepare(
    "SELECT id FROM sellers WHERE active = 1 ORDER BY COALESCE(last_assigned_at, '1970-01-01'), id LIMIT 1"
  ).first();
  if (!seller) return null;
  await env.LEADS_DB.batch([
    env.LEADS_DB.prepare("UPDATE leads SET seller_id = ?, updated_at = datetime('now') WHERE id = ? AND seller_id IS NULL").bind(seller.id, leadId),
    env.LEADS_DB.prepare("UPDATE sellers SET last_assigned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(seller.id),
  ]);
  return seller.id;
};

const recordOutboundMessage = (env, leadId, response, templateName) => env.LEADS_DB.batch([
  env.LEADS_DB.prepare(
    `INSERT OR IGNORE INTO lead_messages (lead_id, direction, message_type, template_name, meta_message_id, status)
     VALUES (?, 'outbound', 'template', ?, ?, 'sent')`
  ).bind(leadId, templateName, response.messageId),
  env.LEADS_DB.prepare(
    `UPDATE leads SET status = 'meta_sent', meta_message_id = ?, contact_status = 'contacted',
     last_outbound_at = datetime('now'), lease_until = NULL, error_message = NULL, updated_at = datetime('now') WHERE id = ?`
  ).bind(response.messageId, leadId),
]);

export class LeadAutomationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const leadId = Number(event.payload?.leadId);
    if (!Number.isInteger(leadId) || leadId <= 0) throw new Error("Invalid lead workflow payload.");

    const lead = await step.do("load persisted lead", async () => {
      const row = await this.env.LEADS_DB.prepare("SELECT id, status, payload_json FROM leads WHERE id = ?").bind(leadId).first();
      if (!row) throw new Error("Lead not found.");
      return { ...row, payload: JSON.parse(row.payload_json) };
    });

    if (!isMetaConfigured(this.env)) {
      return { leadId, status: "received", reason: "meta_not_configured" };
    }

    const initialDelay = millisecondsUntilBusinessHours(this.env);
    if (initialDelay > 0) await step.sleep("wait for initial business hours", `${Math.max(1, Math.ceil(initialDelay / 60_000))} minutes`);

    await step.do("assign seller", async () => assignSeller(this.env, leadId));

    let initialMessage;
    try {
      initialMessage = await step.do(
        "send initial whatsapp template",
        { retries: { limit: 5, delay: "30 seconds", backoff: "exponential" }, timeout: "2 minutes" },
        async () => {
        if (!(await claimLead(this.env, leadId))) {
          const current = await this.env.LEADS_DB.prepare("SELECT status, meta_message_id FROM leads WHERE id = ?").bind(leadId).first();
          if (current?.status === "meta_sent") return { ok: true, messageId: current.meta_message_id, duplicate: true };
          throw new Error("Lead is already being processed.");
        }
        try {
          const response = await sendLeadToMeta(lead.payload, this.env);
          await recordOutboundMessage(this.env, leadId, response, this.env.META_WHATSAPP_TEMPLATE_NAME);
          return response;
        } catch (error) {
          await markLeadFailed(this.env, leadId, error);
          throw error;
        }
        }
      );
    } catch (error) {
      await step.do("mark initial automation failure", async () => this.env.LEADS_DB.prepare(
        "UPDATE leads SET contact_status = 'automation_failed', status = 'meta_failed', lease_until = NULL, error_message = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(String(error.message || "Workflow failed").slice(0, 500), leadId).run());
      return { leadId, status: "meta_failed" };
    }

    if (!initialMessage.messageId || !this.env.META_WHATSAPP_FOLLOWUP_TEMPLATE_NAME) {
      return { leadId, status: "meta_sent", followup: "disabled" };
    }

    let replied = false;
    try {
      await step.waitForEvent("wait for whatsapp reply", {
        type: "whatsapp-inbound",
        timeout: `${Math.max(1, Number(this.env.FOLLOWUP_DELAY_HOURS || 24))} hours`,
      });
      replied = true;
    } catch {
      replied = false;
    }
    if (replied) return { leadId, status: "replied", followup: "skipped" };

    const followupDelay = millisecondsUntilBusinessHours(this.env);
    if (followupDelay > 0) await step.sleep("wait for followup business hours", `${Math.max(1, Math.ceil(followupDelay / 60_000))} minutes`);

    let followup;
    try {
      followup = await step.do(
        "send followup whatsapp template",
        { retries: { limit: 3, delay: "1 minute", backoff: "exponential" }, timeout: "2 minutes" },
        async () => {
        const current = await this.env.LEADS_DB.prepare("SELECT last_inbound_at FROM leads WHERE id = ?").bind(leadId).first();
        if (current?.last_inbound_at) return { skipped: true };
        const response = await sendLeadToMeta(lead.payload, this.env, this.env.META_WHATSAPP_FOLLOWUP_TEMPLATE_NAME);
        await recordOutboundMessage(this.env, leadId, response, this.env.META_WHATSAPP_FOLLOWUP_TEMPLATE_NAME);
        return response;
        }
      );
    } catch (error) {
      await step.do("mark followup automation failure", async () => this.env.LEADS_DB.prepare(
        "UPDATE leads SET contact_status = 'followup_failed', error_message = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(String(error.message || "Followup failed").slice(0, 500), leadId).run());
      return { leadId, status: "meta_sent", followup: "failed" };
    }
    return { leadId, status: followup.skipped ? "replied" : "followup_sent" };
  }
}

export default {
  fetch: handleRequest,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(Promise.all([
      startPendingWorkflows(env),
      retryPendingLeads(env),
      generateAutomationReports(env),
      env.LEADS_DB?.batch([
        env.LEADS_DB.prepare("DELETE FROM rate_limits WHERE expires_at < datetime('now')"),
        env.LEADS_DB.prepare("DELETE FROM webhook_events WHERE received_at < datetime('now', '-30 days')"),
        env.LEADS_DB.prepare("DELETE FROM lead_messages WHERE lead_id IN (SELECT id FROM leads WHERE status != 'processing' AND created_at < datetime('now', ?))")
          .bind(`-${Math.max(1, Number(env.LEAD_RETENTION_DAYS || 180))} days`),
        env.LEADS_DB.prepare("DELETE FROM leads WHERE status != 'processing' AND created_at < datetime('now', ?)")
          .bind(`-${Math.max(1, Number(env.LEAD_RETENTION_DAYS || 180))} days`),
      ]),
    ]));
  },
};
