const crypto = require('crypto');

const COMPANY_NAME = process.env.COMPANY_NAME || 'BACKE.co';
const APP_ENV = process.env.APP_ENV || 'sandbox';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SERVICE_INTERESTS = new Set([
  'automacao', 'sites', 'trafego', 'gestao', 'consultoria', 'outro', 'automation',
  'website', 'traffic', 'management', 'consulting', 'other',
  'diagnóstico estratégico', 'gestão de tráfego', 'identidade visual e design gráfico', 'captação',
  'diagnóstico gratuito', 'solução personalizada', 'dúvida comercial',
  'tráfego pago', 'gestão de redes sociais', 'estratégia & performance',
  'treinamento & capacitação de vendas', 'branding & identidade visual',
  'design gráfico & motions', 'criação de sites & landing pages',
  'captação audiovisual', 'captação com drone', 'whatsapp'
]);
const HTML_TAG_PATTERN = /<[^>]*>/g;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const stripHtml = (value) => String(value ?? '').replace(HTML_TAG_PATTERN, '').replace(CONTROL_CHARACTER_PATTERN, '').trim();
const nullableString = (value) => stripHtml(value) || null;
const requiredString = (value) => stripHtml(value);
const limitedString = (value, maxLength) => requiredString(value).slice(0, maxLength);
const limitedNullableString = (value, maxLength) => limitedString(value, maxLength) || null;

const normalizePageUrl = (value) => {
  try {
    const url = new URL(requiredString(value));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return '';
  }
};

const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return (digits.length === 10 || digits.length === 11) && !digits.startsWith('55')
    ? `55${digits}`
    : digits;
};

const normalizeUtm = (utm = {}) => ({
  source: limitedNullableString(utm.source ?? utm.utm_source, 200),
  medium: limitedNullableString(utm.medium ?? utm.utm_medium, 200),
  campaign: limitedNullableString(utm.campaign ?? utm.utm_campaign, 200),
  term: limitedNullableString(utm.term ?? utm.utm_term, 200),
  content: limitedNullableString(utm.content ?? utm.utm_content, 200)
});

const buildMessage = (payload) => nullableString(payload.lead?.message ?? payload.message) ||
  [payload.nicho ? `Nicho da empresa: ${payload.nicho}` : null,
    payload.faturamento ? `Faturamento mensal: ${payload.faturamento}` : null]
    .filter(Boolean).join('\n') || null;

const normalizeLeadPayload = (payload = {}, context = {}) => {
  const lead = payload.lead || {};
  return {
    company: limitedString(COMPANY_NAME, 120),
    environment: limitedString(APP_ENV, 40),
    source: 'website',
    formId: limitedString(context.formId || 'website-contact-form', 120),
    pageUrl: normalizePageUrl(payload.pageUrl || context.pageUrl),
    pageTitle: limitedString(payload.pageTitle || context.pageTitle, 160),
    utm: normalizeUtm(payload.utm || {}),
    lead: {
      name: limitedString(lead.name ?? payload.nome ?? payload.name, 120),
      email: limitedNullableString(lead.email ?? payload.email, 255)?.toLowerCase() || null,
      phone: normalizePhone(lead.phone ?? payload.whatsapp ?? payload.phone),
      message: limitedNullableString(buildMessage(payload), 500),
      serviceInterest: limitedNullableString(lead.serviceInterest ?? payload.serviceInterest ?? payload.interesse, 120),
      companyName: limitedNullableString(lead.companyName ?? payload.empresa ?? payload.companyName, 120)
    },
    seller: {
      name: nullableString(payload.seller?.name ?? process.env.DEFAULT_SELLER_NAME),
      phone: normalizePhone(payload.seller?.phone ?? process.env.DEFAULT_SELLER_PHONE) || null
    },
    metadata: {
      submittedAt: new Date().toISOString()
    }
  };
};

const hasHoneypotValue = (payload = {}) =>
  ['website', 'url', 'companyWebsite', 'contact_me_by_fax_only'].some((field) => requiredString(payload[field]));

const validateLeadPayload = (payload) => {
  if (!payload.lead.name) return { ok: false, message: 'Informe seu nome.' };
  if (!payload.lead.phone) return { ok: false, message: 'Informe seu WhatsApp.' };
  if (payload.lead.email && !EMAIL_PATTERN.test(payload.lead.email)) return { ok: false, message: 'Informe um email válido.' };
  if (payload.lead.phone.length < 10 || payload.lead.phone.length > 15) return { ok: false, message: 'Informe um WhatsApp válido.' };
  if (payload.lead.name.length > 120 || (payload.lead.companyName?.length || 0) > 120 ||
      (payload.lead.email?.length || 0) > 255) return { ok: false, message: 'Campos de texto excedem o limite permitido.' };
  if (payload.lead.serviceInterest && !ALLOWED_SERVICE_INTERESTS.has(payload.lead.serviceInterest.toLowerCase())) {
    return { ok: false, message: 'Selecione uma opção válida para o serviço de interesse.' };
  }
  return { ok: true };
};

const buildTemplateRequest = (lead) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: lead.lead.phone,
  type: 'template',
  template: {
    name: process.env.META_WHATSAPP_TEMPLATE_NAME,
    language: { code: process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR' },
    components: [{
      type: 'body',
      parameters: [
        { type: 'text', text: lead.lead.name },
        { type: 'text', text: lead.lead.serviceInterest || 'atendimento e automação' }
      ]
    }]
  }
});

const sendLeadWhatsApp = async (leadPayload) => {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.META_WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneNumberId || !template) throw new Error('Meta WhatsApp is not configured.');
  const version = process.env.META_GRAPH_API_VERSION || 'v23.0';
  const attempts = Math.max(1, Number(process.env.META_RETRY_ATTEMPTS || 3));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTemplateRequest(leadPayload)),
        signal: AbortSignal.timeout(Number(process.env.META_REQUEST_TIMEOUT_MS || 10000))
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error('Meta WhatsApp request failed.');
        error.status = response.status;
        throw error;
      }
      return { ok: true, messageId: data?.messages?.[0]?.id || null };
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || (error.status && !RETRYABLE_STATUS_CODES.has(error.status))) throw error;
      await new Promise((resolve) => setTimeout(resolve, Number(process.env.META_RETRY_BASE_DELAY_MS || 500) * attempt));
    }
  }
  throw lastError;
};

const checkMetaHealth = async () => {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error('Meta WhatsApp is not configured.');
  const version = process.env.META_GRAPH_API_VERSION || 'v23.0';
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}?fields=id,display_phone_number`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(Number(process.env.META_REQUEST_TIMEOUT_MS || 10000))
  });
  if (!response.ok) { const error = new Error('Meta WhatsApp healthcheck failed.'); error.status = response.status; throw error; }
  const data = await response.json();
  return { configured: true, phoneNumberId: data.id, displayPhoneNumber: data.display_phone_number || null };
};

const verifyTurnstile = async (token, remoteip) => {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return { success: process.env.APP_ENV !== 'production', disabled: true };
  }
  if (!token || String(token).length > 2048) return { success: false };
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip }),
    signal: AbortSignal.timeout(10000)
  });
  const result = await response.json();
  const allowedHostnames = new Set(String(process.env.FRONTEND_URL || '').split(',').map((origin) => {
    try { return new URL(origin).hostname; } catch { return null; }
  }).filter(Boolean));
  const hostnameAllowed = process.env.APP_ENV !== 'production' || allowedHostnames.has(result.hostname);
  return { success: result.success === true && result.action === 'lead_form' && hostnameAllowed };
};

const verifyMetaSignature = (rawBody, signatureHeader) => {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signatureHeader?.startsWith('sha256=') || !rawBody) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const received = Buffer.from(signatureHeader);
  const calculated = Buffer.from(expected);
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
};

module.exports = { checkMetaHealth, hasHoneypotValue, normalizeLeadPayload, normalizePhone, sendLeadWhatsApp, validateLeadPayload, verifyMetaSignature, verifyTurnstile };
