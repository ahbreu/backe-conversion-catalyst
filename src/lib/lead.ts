/**
 * Módulo de leads da BACKE.co.
 *
 * Mantém o contrato EXATO do site em produção com o worker
 * `backe-lead-proxy` (Cloudflare). Qualquer mudança no payload
 * precisa ser combinada com o worker antes.
 */

import { LEAD_ENDPOINT, WHATSAPP_NUMBER } from '../config/site';

export { LEAD_ENDPOINT };
export const UTM_STORAGE_KEY = 'backe_utm_params';
export const DEFAULT_INTEREST = 'Diagnóstico gratuito';
export const GENERIC_ERROR =
  'Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.';

export const NICHES = [
  'E-commerce',
  'Serviços / Consultoria',
  'Saúde e Bem-estar',
  'Educação / Infoprodutos',
  'Alimentação / Food',
  'Imobiliário',
  'Moda & Beleza',
  'Tecnologia / SaaS',
  'Varejo Físico',
  'Jurídico / Contábil',
  'Outro',
] as const;

export const REVENUE_RANGES = [
  'Ainda estou começando (pré-faturamento)',
  'Até R$ 10.000/mês',
  'R$ 10.000 - R$ 50.000/mês',
  'R$ 50.000 - R$ 150.000/mês',
  'R$ 150.000 - R$ 500.000/mês',
  'Acima de R$ 500.000/mês',
] as const;

export interface LeadForm {
  nome: string;
  email: string;
  whatsapp: string;
  empresa: string;
  nicho: string;
  faturamento: string;
  interesse: string;
  /** honeypot — precisa ficar vazio */
  website: string;
}

export type FieldErrors = Partial<Record<keyof LeadForm, string>>;

export interface Utm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

export const EMPTY_FORM: LeadForm = {
  nome: '',
  email: '',
  whatsapp: '',
  empresa: '',
  nicho: '',
  faturamento: '',
  interesse: DEFAULT_INTEREST,
  website: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_UTM: Utm = { source: null, medium: null, campaign: null, term: null, content: null };

/** string vazia → null (igual ao `be` do site atual) */
export const nullable = (v: unknown): string | null => String(v ?? '').trim() || null;

/** Só dígitos; prefixa 55 em números BR de 10/11 dígitos sem DDI. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return (digits.length === 10 || digits.length === 11) && !digits.startsWith('55')
    ? `55${digits}`
    : digits;
}

/** Máscara visual (00) 90000-0000 enquanto a pessoa digita. */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length < 3) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length < 11) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function trimForm(f: LeadForm): LeadForm {
  return {
    nome: f.nome.trim(),
    email: f.email.trim(),
    whatsapp: f.whatsapp.trim(),
    empresa: f.empresa.trim(),
    nicho: f.nicho.trim(),
    faturamento: f.faturamento.trim(),
    interesse: f.interesse.trim(),
    website: f.website.trim(),
  };
}

export function validateStep1(input: LeadForm): FieldErrors {
  const f = trimForm(input);
  const e: FieldErrors = {};
  if (!f.nome) e.nome = 'Informe seu nome.';
  else if (f.nome.length < 2) e.nome = 'Informe seu nome completo.';
  const phone = normalizePhone(f.whatsapp);
  if (!f.whatsapp) e.whatsapp = 'Informe seu WhatsApp.';
  else if (phone.length < 10 || phone.length > 15) e.whatsapp = 'Informe um WhatsApp válido, com DDD.';
  return e;
}

export function validateStep2(input: LeadForm): FieldErrors {
  const f = trimForm(input);
  const e: FieldErrors = {};
  if (!f.email) e.email = 'Informe seu e-mail.';
  else if (!EMAIL_RE.test(f.email)) e.email = 'Informe um e-mail válido.';
  if (!f.empresa) e.empresa = 'Informe sua empresa ou Instagram.';
  if (!f.nicho) e.nicho = 'Selecione seu nicho.';
  if (!f.faturamento) e.faturamento = 'Selecione uma faixa de faturamento.';
  return e;
}

export function validateAll(f: LeadForm): FieldErrors {
  return { ...validateStep1(f), ...validateStep2(f) };
}

export const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;

/** Lê UTMs da URL; se não houver, recupera as da sessão (mesma chave do site atual). */
export function readUtm(search: string, storage?: Pick<Storage, 'getItem' | 'setItem'>): Utm {
  const p = new URLSearchParams(search);
  const fromUrl: Utm = {
    source: nullable(p.get('utm_source')),
    medium: nullable(p.get('utm_medium')),
    campaign: nullable(p.get('utm_campaign')),
    term: nullable(p.get('utm_term')),
    content: nullable(p.get('utm_content')),
  };
  if (Object.values(fromUrl).some(Boolean)) {
    try {
      storage?.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
      /* storage indisponível */
    }
    return fromUrl;
  }
  try {
    const saved = storage?.getItem(UTM_STORAGE_KEY);
    return saved ? { ...EMPTY_UTM, ...JSON.parse(saved) } : { ...EMPTY_UTM };
  } catch {
    return { ...EMPTY_UTM };
  }
}

export interface PageContext {
  origin: string;
  pathname: string;
  title: string;
  userAgent: string | null;
  utm: Utm;
  now: Date;
}

/** Payload idêntico ao do site em produção (função `Oe` do bundle atual). */
export function buildPayload(input: LeadForm, turnstileToken: string, ctx: PageContext) {
  const f = trimForm(input);
  const message = [
    f.nicho ? `Nicho da empresa: ${f.nicho}` : null,
    f.faturamento ? `Faturamento mensal: ${f.faturamento}` : null,
  ].filter(Boolean) as string[];

  return {
    company: 'BACKE.co',
    environment: 'production',
    source: 'website',
    formId: 'website-contact-form',
    pageUrl: `${ctx.origin}${ctx.pathname}`,
    pageTitle: ctx.title,
    utm: ctx.utm,
    lead: {
      name: f.nome,
      email: nullable(f.email)?.toLowerCase() || null,
      phone: normalizePhone(f.whatsapp),
      message: message.length ? message.join('\n') : null,
      serviceInterest: nullable(f.interesse),
      companyName: nullable(f.empresa),
    },
    seller: { name: null, phone: null },
    metadata: { userAgent: ctx.userAgent || null, submittedAt: ctx.now.toISOString() },
    website: f.website,
    turnstileToken,
  };
}

export type SubmitResult = { ok: true } | { ok: false; message: string; retryable: boolean };

/**
 * Envia o lead. Nunca lança: sempre devolve um resultado tratável pela UI.
 * O honeypot é checado antes de qualquer requisição.
 */
export async function submitLead(
  form: LeadForm,
  turnstileToken: string,
  ctx: PageContext,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; endpoint?: string } = {},
): Promise<SubmitResult> {
  const f = trimForm(form);
  if (f.website) return { ok: false, message: GENERIC_ERROR, retryable: false };

  const errors = validateAll(f);
  if (hasErrors(errors)) {
    return { ok: false, message: Object.values(errors)[0]!, retryable: false };
  }
  if (!turnstileToken) {
    return {
      ok: false,
      message: 'Confirme a verificação de segurança para enviar.',
      retryable: true,
    };
  }

  const endpoint = opts.endpoint ?? LEAD_ENDPOINT;
  if (!endpoint) return { ok: false, message: GENERIC_ERROR, retryable: false };

  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(f, turnstileToken, ctx)),
      signal: controller.signal,
    });
    const data: { ok?: boolean; message?: string } | null = await res.json().catch(() => null);
    if (!res.ok || data?.ok === false) {
      return { ok: false, message: data?.message || GENERIC_ERROR, retryable: true };
    }
    return { ok: true };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return {
      ok: false,
      message: aborted
        ? 'A conexão demorou demais. Verifique sua internet e tente novamente.'
        : GENERIC_ERROR,
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function whatsappLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
