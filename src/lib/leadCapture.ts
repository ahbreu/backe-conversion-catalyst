const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UTM_STORAGE_KEY = "backe_utm_params";

export type ContactLeadForm = {
  nome: string;
  email: string;
  whatsapp: string;
  empresa: string;
  nicho: string;
  faturamento: string;
  interesse: string;
  website: string;
};

export type LeadPayload = {
  company: string;
  environment: string;
  source: string;
  formId: string;
  pageUrl: string;
  pageTitle: string;
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    term: string | null;
    content: string | null;
  };
  lead: {
    name: string;
    email: string | null;
    phone: string;
    message: string | null;
    serviceInterest: string | null;
    companyName: string | null;
  };
  seller: {
    name: string | null;
    phone: string | null;
  };
  metadata: {
    userAgent: string | null;
    submittedAt: string;
    idempotencyKey?: string;
  };
  website: string;
  turnstileToken: string;
};

export type ContactFormErrors = Partial<Record<keyof ContactLeadForm, string>>;

export type ContactFormValidation = {
  ok: boolean;
  message: string | null;
  fields: ContactFormErrors;
};

const nullableString = (value: string | null | undefined) => {
  const text = String(value ?? "").trim();
  return text || null;
};

export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }

  return digits;
};

export const sanitizeContactForm = (form: ContactLeadForm): ContactLeadForm => ({
  nome: form.nome.trim(),
  email: form.email.trim(),
  whatsapp: form.whatsapp.trim(),
  empresa: form.empresa.trim(),
  nicho: form.nicho.trim(),
  faturamento: form.faturamento.trim(),
  interesse: form.interesse.trim(),
  website: form.website.trim(),
});

const emptyUtmParams = {
  source: null,
  medium: null,
  campaign: null,
  term: null,
  content: null,
};

const hasAnyUtmValue = (utm: typeof emptyUtmParams) => Object.values(utm).some(Boolean);

const getStoredUtmParams = () => {
  try {
    const stored = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? { ...emptyUtmParams, ...JSON.parse(stored) } : emptyUtmParams;
  } catch {
    return emptyUtmParams;
  }
};

export const getUtmParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const currentUtm = {
    source: nullableString(searchParams.get("utm_source")),
    medium: nullableString(searchParams.get("utm_medium")),
    campaign: nullableString(searchParams.get("utm_campaign")),
    term: nullableString(searchParams.get("utm_term")),
    content: nullableString(searchParams.get("utm_content")),
  };

  if (hasAnyUtmValue(currentUtm)) {
    try {
      window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(currentUtm));
    } catch {
      return currentUtm;
    }

    return currentUtm;
  }

  return getStoredUtmParams();
};

export const validateContactForm = (form: ContactLeadForm): ContactFormValidation => {
  const fields: ContactFormErrors = {};

  if (form.website) {
    return {
      ok: false,
      message: "Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.",
      fields,
    };
  }

  if (!form.nome) {
    fields.nome = "Informe seu nome.";
  }

  if (!form.whatsapp) {
    fields.whatsapp = "Informe seu WhatsApp.";
  }

  if (form.email && !EMAIL_PATTERN.test(form.email)) {
    fields.email = "Informe um email válido.";
  }

  const phoneDigits = normalizePhone(form.whatsapp);
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    fields.whatsapp = "Informe um WhatsApp válido.";
  }

  const firstError = fields.nome || fields.whatsapp || fields.email || null;

  return {
    ok: !firstError,
    message: firstError,
    fields,
  };
};

export const normalizeLeadPayload = (form: ContactLeadForm, turnstileToken = ""): LeadPayload => {
  const messageParts = [
    form.nicho ? `Nicho da empresa: ${form.nicho}` : null,
    form.faturamento ? `Faturamento mensal: ${form.faturamento}` : null,
  ].filter(Boolean);

  return {
    company: import.meta.env.VITE_COMPANY_NAME || "BACKE.co",
    environment: import.meta.env.VITE_APP_ENV || "sandbox",
    source: "website",
    formId: "website-contact-form",
    pageUrl: `${window.location.origin}${window.location.pathname}`,
    pageTitle: document.title,
    utm: getUtmParams(),
    lead: {
      name: form.nome,
      email: nullableString(form.email)?.toLowerCase() || null,
      phone: normalizePhone(form.whatsapp),
      message: messageParts.length ? messageParts.join("\n") : null,
      serviceInterest: nullableString(form.interesse),
      companyName: nullableString(form.empresa),
    },
    seller: {
      name: null,
      phone: null,
    },
    metadata: {
      userAgent: navigator.userAgent || null,
      submittedAt: new Date().toISOString(),
    },
    website: form.website,
    turnstileToken,
  };
};
