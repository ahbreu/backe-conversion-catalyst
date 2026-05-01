const COMPANY_NAME = process.env.COMPANY_NAME || 'BACKE.co';
const APP_ENV = process.env.APP_ENV || 'sandbox';
const REQUEST_TIMEOUT_MS = Number(process.env.N8N_REQUEST_TIMEOUT_MS || 10000);
const RETRY_ATTEMPTS = Number(process.env.N8N_RETRY_ATTEMPTS || 2);
const RETRY_BASE_DELAY_MS = Number(process.env.N8N_RETRY_BASE_DELAY_MS || 500);
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const nullableString = (value) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const requiredString = (value) => String(value ?? '').trim();

const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return `55${digits}`;
  }

  return digits;
};

const normalizeUtm = (utm = {}) => ({
  source: nullableString(utm.source ?? utm.utm_source),
  medium: nullableString(utm.medium ?? utm.utm_medium),
  campaign: nullableString(utm.campaign ?? utm.utm_campaign),
  term: nullableString(utm.term ?? utm.utm_term),
  content: nullableString(utm.content ?? utm.utm_content)
});

const buildMessage = (payload) => {
  const explicitMessage = nullableString(payload.lead?.message ?? payload.message);

  if (explicitMessage) {
    return explicitMessage;
  }

  const parts = [
    payload.nicho ? `Nicho da empresa: ${payload.nicho}` : null,
    payload.faturamento ? `Faturamento mensal: ${payload.faturamento}` : null
  ].filter(Boolean);

  return parts.length ? parts.join('\n') : null;
};

const normalizeLeadPayload = (payload = {}, context = {}) => {
  const lead = payload.lead || {};
  const metadata = payload.metadata || {};

  return {
    company: requiredString(payload.company) || COMPANY_NAME,
    environment: requiredString(payload.environment) || APP_ENV,
    source: requiredString(payload.source) || 'website',
    formId: requiredString(payload.formId) || context.formId || 'website-contact-form',
    pageUrl: requiredString(payload.pageUrl) || context.pageUrl || '',
    pageTitle: requiredString(payload.pageTitle) || context.pageTitle || '',
    utm: normalizeUtm(payload.utm || {}),
    lead: {
      name: requiredString(lead.name ?? payload.nome ?? payload.name),
      email: nullableString(lead.email ?? payload.email)?.toLowerCase() || null,
      phone: normalizePhone(lead.phone ?? payload.whatsapp ?? payload.phone),
      message: buildMessage(payload),
      serviceInterest: nullableString(
        lead.serviceInterest ?? payload.serviceInterest ?? payload.interesse
      ),
      companyName: nullableString(lead.companyName ?? payload.empresa ?? payload.companyName)
    },
    seller: {
      name: nullableString(payload.seller?.name ?? process.env.DEFAULT_SELLER_NAME),
      phone: normalizePhone(payload.seller?.phone ?? process.env.DEFAULT_SELLER_PHONE) || null
    },
    metadata: {
      userAgent: nullableString(metadata.userAgent ?? context.userAgent),
      submittedAt: new Date().toISOString(),
      ip: nullableString(context.ip)
    }
  };
};

const hasHoneypotValue = (payload = {}) => {
  const honeypotFields = ['website', 'url', 'companyWebsite', 'contact_me_by_fax_only'];
  return honeypotFields.some((field) => requiredString(payload[field]));
};

const validateLeadPayload = (payload) => {
  if (!payload.lead.name) {
    return { ok: false, message: 'Informe seu nome.' };
  }

  if (!payload.lead.phone) {
    return { ok: false, message: 'Informe seu WhatsApp.' };
  }

  if (payload.lead.email && !EMAIL_PATTERN.test(payload.lead.email)) {
    return { ok: false, message: 'Informe um email válido.' };
  }

  const phoneDigits = payload.lead.phone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, message: 'Informe um WhatsApp válido.' };
  }

  if (payload.lead.name.length > 120 || (payload.lead.companyName?.length || 0) > 120) {
    return { ok: false, message: 'Campos de texto excedem o limite permitido.' };
  }

  if ((payload.lead.email?.length || 0) > 255 || payload.lead.phone.length > 20) {
    return { ok: false, message: 'Campos excedem o limite permitido.' };
  }

  const hasAnyLeadSignal = [
    payload.lead.name,
    payload.lead.email,
    payload.lead.phone,
    payload.lead.message,
    payload.lead.serviceInterest,
    payload.lead.companyName
  ].some(Boolean);

  if (!hasAnyLeadSignal) {
    return { ok: false, message: 'Preencha os campos obrigatórios.' };
  }

  return { ok: true };
};

const isProductionEnvironment = () => ['production', 'prod'].includes(APP_ENV.toLowerCase());

const getLeadWebhookUrl = () =>
  isProductionEnvironment()
    ? process.env.N8N_LEAD_CAPTURE_WEBHOOK_PROD_URL
    : process.env.N8N_LEAD_CAPTURE_WEBHOOK_TEST_URL;

const getHealthcheckUrl = () =>
  isProductionEnvironment()
    ? process.env.N8N_HEALTHCHECK_PROD_URL
    : process.env.N8N_HEALTHCHECK_TEST_URL;

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
  if (error.name === 'AbortError') {
    return true;
  }

  if (typeof error.status === 'number') {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }

  return !error.status;
};

const requestJsonOnce = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });

    const data = await parseJsonResponse(response);

    if (!response.ok || data?.ok === false) {
      const error = new Error('Cloudfy/n8n request failed.');
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data || { ok: true };
  } finally {
    clearTimeout(timeout);
  }
};

const requestJson = async (url, options = {}) => {
  if (!url) {
    throw new Error('Webhook URL is not configured.');
  }

  const attempts = Math.max(1, RETRY_ATTEMPTS);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestJsonOnce(url, options);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetryRequest(error)) {
        throw error;
      }

      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw lastError;
};

const submitLeadToN8n = async (leadPayload) =>
  requestJson(getLeadWebhookUrl(), {
    method: 'POST',
    body: JSON.stringify(leadPayload)
  });

const checkCloudfyHealth = async () =>
  requestJson(getHealthcheckUrl(), {
    method: 'GET'
  });

module.exports = {
  checkCloudfyHealth,
  hasHoneypotValue,
  normalizeLeadPayload,
  normalizePhone,
  submitLeadToN8n,
  validateLeadPayload
};
