import { describe, it, expect, vi } from 'vitest';
import {
  buildPayload,
  normalizePhone,
  maskPhone,
  readUtm,
  submitLead,
  validateStep1,
  validateStep2,
  EMPTY_FORM,
  GENERIC_ERROR,
  type LeadForm,
  type PageContext,
} from '../src/lib/lead';
// JS literal copiado do bundle de produção
import { makeLegacy } from './legacy-bundle-snippet.js';

const NOW = new Date('2026-11-12T15:00:00.000Z');
const UA = 'Mozilla/5.0 (Teste)';

function fakeEnv(search: string) {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  const window = {
    location: { search, origin: 'https://backe.com.br', pathname: '/' },
    sessionStorage,
  };
  return { window, document: { title: 'BACKE.co — Teste' }, navigator: { userAgent: UA }, sessionStorage };
}

const filled: LeadForm = {
  nome: '  Maria Souza ',
  email: ' Maria@Empresa.COM ',
  whatsapp: '(61) 99224-0234',
  empresa: '@empresa',
  nicho: 'E-commerce',
  faturamento: 'R$ 50.000 - R$ 150.000/mês',
  interesse: 'Tráfego Pago',
  website: '',
};

describe('contrato do payload — idêntico ao site em produção', () => {
  const cases: Array<[string, LeadForm, string]> = [
    ['completo + UTMs', filled, '?utm_source=ig&utm_medium=paid&utm_campaign=bf&utm_term=x&utm_content=y'],
    ['sem UTMs, interesse padrão', { ...filled, interesse: 'Diagnóstico gratuito' }, ''],
    ['telefone já com 55', { ...filled, whatsapp: '+55 61 99224-0234' }, '?utm_source=google'],
    ['telefone fixo 10 dígitos', { ...filled, whatsapp: '6132224444' }, ''],
    ['empresa e interesse vazios', { ...filled, empresa: ' ', interesse: '' }, ''],
  ];

  for (const [name, form, search] of cases) {
    it(name, () => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      const env = fakeEnv(search);
      // o código legado usa globais `window`, `document`, `navigator`
      vi.stubGlobal('window', env.window);
      vi.stubGlobal('document', env.document);
      vi.stubGlobal('navigator', env.navigator);
      const legacy = makeLegacy(env.window, env.document, env.navigator);
      const expected = legacy.payload(legacy.normalize(form), 'tok-123');

      const ctx: PageContext = {
        origin: 'https://backe.com.br',
        pathname: '/',
        title: 'BACKE.co — Teste',
        userAgent: UA,
        utm: readUtm(search, env.sessionStorage),
        now: NOW,
      };
      const actual = buildPayload(form, 'tok-123', ctx);
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });
  }

  it('normalização de telefone igual à legada', () => {
    const legacy = makeLegacy({}, {}, {});
    for (const p of ['61992240234', '(61) 9922-4023', '5561992240234', '+1 415 555 0100', '123']) {
      expect(normalizePhone(p)).toBe(legacy.phone(p));
    }
  });
});

describe('UTMs', () => {
  it('persiste na sessão e reaproveita em páginas sem UTM', () => {
    const env = fakeEnv('');
    readUtm('?utm_source=meta&utm_campaign=x', env.sessionStorage);
    expect(readUtm('', env.sessionStorage)).toEqual({
      source: 'meta',
      medium: null,
      campaign: 'x',
      term: null,
      content: null,
    });
  });
  it('não quebra sem storage', () => {
    expect(readUtm('').source).toBeNull();
  });
});

describe('validação', () => {
  it('etapa 1 exige nome e WhatsApp válido', () => {
    expect(validateStep1(EMPTY_FORM)).toEqual({ nome: 'Informe seu nome.', whatsapp: 'Informe seu WhatsApp.' });
    expect(validateStep1({ ...EMPTY_FORM, nome: 'Jo', whatsapp: '9999' }).whatsapp).toMatch(/válido/);
    expect(validateStep1({ ...EMPTY_FORM, nome: 'Jo', whatsapp: '(61) 99224-0234' })).toEqual({});
  });
  it('etapa 2 exige e-mail válido, empresa, nicho e faturamento', () => {
    const e = validateStep2({ ...EMPTY_FORM, email: 'x@' });
    expect(Object.keys(e).sort()).toEqual(['email', 'empresa', 'faturamento', 'nicho']);
    expect(validateStep2(filled)).toEqual({});
  });
  it('máscara de telefone', () => {
    expect(maskPhone('61992240234')).toBe('(61) 99224-0234');
    expect(maskPhone('6132224444')).toBe('(61) 3222-4444');
    expect(maskPhone('61')).toBe('(61');
    expect(maskPhone('abc')).toBe('');
  });
});

describe('envio', () => {
  const ctx: PageContext = {
    origin: 'https://backe.com.br',
    pathname: '/',
    title: 't',
    userAgent: UA,
    utm: { source: null, medium: null, campaign: null, term: null, content: null },
    now: NOW,
  };
  const okFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));

  it('sucesso envia POST JSON para o worker', async () => {
    const r = await submitLead(filled, 'tok', ctx, { fetchImpl: okFetch as unknown as typeof fetch });
    expect(r).toEqual({ ok: true });
    const [url, init] = okFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://leads.test.invalid/api/leads'); // VITE_API_URL (vitest.config.ts) + /api/leads
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).lead.phone).toBe('5561992240234');
  });

  it('honeypot preenchido não faz requisição', async () => {
    const f = vi.fn();
    const r = await submitLead({ ...filled, website: 'spam' }, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, message: GENERIC_ERROR, retryable: false });
    expect(f).not.toHaveBeenCalled();
  });

  it('sem token do Turnstile não envia', async () => {
    const f = vi.fn();
    const r = await submitLead(filled, '', ctx, { fetchImpl: f as unknown as typeof fetch });
    expect(r.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('formulário inválido não envia', async () => {
    const f = vi.fn();
    const r = await submitLead({ ...filled, email: 'x' }, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch });
    expect(r).toMatchObject({ ok: false, message: 'Informe um e-mail válido.' });
    expect(f).not.toHaveBeenCalled();
  });

  it('erro do worker repassa a mensagem do servidor', async () => {
    const f = async () => new Response(JSON.stringify({ ok: false, message: 'Validação falhou' }), { status: 400 });
    const r = await submitLead(filled, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, message: 'Validação falhou', retryable: true });
  });

  it('ok:false com HTTP 200 também é erro', async () => {
    const f = async () => new Response(JSON.stringify({ ok: false }), { status: 200 });
    const r = await submitLead(filled, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, message: GENERIC_ERROR, retryable: true });
  });

  it('resposta não-JSON / 500', async () => {
    const f = async () => new Response('oops', { status: 500 });
    const r = await submitLead(filled, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, message: GENERIC_ERROR, retryable: true });
  });

  it('sem VITE_API_URL configurada não envia nada e avisa', async () => {
    const f = vi.fn();
    const r = await submitLead(filled, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch, endpoint: '' });
    expect(f).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, message: GENERIC_ERROR, retryable: false });
  });

  it('falha de rede', async () => {
    const f = async () => {
      throw new TypeError('Failed to fetch');
    };
    const r = await submitLead(filled, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, message: GENERIC_ERROR, retryable: true });
  });

  it('timeout aborta e avisa', async () => {
    const f = (_u: string, init: RequestInit) =>
      new Promise<Response>((_, rej) =>
        init.signal!.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))),
      );
    const r = await submitLead(filled, 'tok', ctx, { fetchImpl: f as unknown as typeof fetch, timeoutMs: 20 });
    expect(r).toMatchObject({ ok: false, retryable: true });
    expect((r as { message: string }).message).toMatch(/demorou/);
  });
});
