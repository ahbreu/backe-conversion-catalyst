const DEFAULT_ERROR_MESSAGE =
  "Nao conseguimos enviar sua solicitacao agora. Tente novamente ou fale conosco pelo WhatsApp.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const ALLOWED_SERVICE_INTERESTS = new Set([
  "automacao", "sites", "trafego", "gestao", "consultoria", "outro",
  "automation", "website", "traffic", "management", "consulting", "other",
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
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
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

const checkRateLimit = (request, env) => {
  const now = Date.now();
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS || 60000);
  const max = Number(env.RATE_LIMIT_MAX || 20);
  const key = getClientIp(request) || "unknown";
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
  const metadata = payload.metadata || {};

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
      userAgent: nullableString(metadata.userAgent ?? context.userAgent),
      submittedAt: new Date().toISOString(),
      ip: nullableString(context.ip),
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
  const timeoutMs = Number(env.N8N_REQUEST_TIMEOUT_MS || 10000);
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
      const error = new Error("Cloudfy/n8n request failed.");
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

  const attempts = Math.max(1, Number(env.N8N_RETRY_ATTEMPTS || 2));
  const baseDelayMs = Number(env.N8N_RETRY_BASE_DELAY_MS || 500);
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

const getLeadWebhookUrl = (env) => {
  if (env.N8N_LEAD_CAPTURE_WEBHOOK_URL) {
    return env.N8N_LEAD_CAPTURE_WEBHOOK_URL;
  }

  return isProductionEnvironment(env)
    ? env.N8N_LEAD_CAPTURE_WEBHOOK_PROD_URL
    : env.N8N_LEAD_CAPTURE_WEBHOOK_TEST_URL;
};

const getHealthcheckUrl = (env) => {
  if (env.N8N_HEALTHCHECK_URL) {
    return env.N8N_HEALTHCHECK_URL;
  }

  return isProductionEnvironment(env)
    ? env.N8N_HEALTHCHECK_PROD_URL
    : env.N8N_HEALTHCHECK_TEST_URL;
};

const submitLeadToN8n = (leadPayload, env) =>
  requestJson(getLeadWebhookUrl(env), env, {
    method: "POST",
    body: JSON.stringify(leadPayload),
  });

const checkCloudfyHealth = (env) =>
  requestJson(getHealthcheckUrl(env), env, {
    method: "GET",
  });

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
  const rateLimit = checkRateLimit(request, env);

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

  try {
    const n8nResponse = await submitLeadToN8n(leadPayload, env);
    leadFingerprintStore.set(fingerprint, {
      expiresAt: now + idempotencyWindowMs,
    });

    log("info", "lead_forwarded_to_n8n", {
      requestId,
      formId: leadPayload.formId,
      n8nLeadReceived: n8nResponse?.leadReceived === true,
    });

    return jsonResponse(
      {
        ok: true,
        message: "Lead sent successfully",
        automationStatus: "n8n_forwarded",
      },
      { status: 201, cors, requestId }
    );
  } catch (error) {
    log("error", "lead_forward_failed", {
      requestId,
      message: error.message,
      status: error.status,
    });

    return jsonResponse({ ok: false, message: DEFAULT_ERROR_MESSAGE }, { status: 502, cors, requestId });
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

  if (url.pathname === "/api/cloudfy/health" && request.method === "GET") {
    try {
      const cloudfy = await checkCloudfyHealth(env);
      return jsonResponse({ ok: true, cloudfy }, { cors, requestId });
    } catch (error) {
      log("error", "cloudfy_health_failed", {
        requestId,
        message: error.message,
        status: error.status,
      });

      return jsonResponse(
        {
          ok: false,
          message: "Nao foi possivel verificar o Cloudfy/n8n agora.",
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
};
