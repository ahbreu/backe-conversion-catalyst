import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Worker em JS puro, sem tipos
import { LeadAutomationWorkflow, buildSellerAlertRequest } from '../worker/src/index.js';

const leadPayload = {
  lead: { name: 'Maria Souza', phone: '5561999990000', serviceInterest: 'Tráfego Pago', companyName: '@empresa' },
};
const seller = { id: 1, name: 'Bruno', phone: '5561991963278' };
const baseEnv = {
  META_WHATSAPP_ACCESS_TOKEN: 'token-de-teste',
  META_WHATSAPP_PHONE_NUMBER_ID: '123',
  META_WHATSAPP_TEMPLATE_NAME: 'backe_site_lead_welcome',
  META_WHATSAPP_SELLER_TEMPLATE_NAME: 'backe_site_lead_seller_alert',
  META_WHATSAPP_TEMPLATE_LANGUAGE: 'pt_BR',
  META_RETRY_ATTEMPTS: '1',
  // sempre "horário comercial" para o teste não depender do relógio
  BUSINESS_START_HOUR: '0',
  BUSINESS_END_HOUR: '24',
};

/** D1 falso: guarda só o que o fluxo de aviso usa. */
function fakeDb() {
  const state = { sellerId: null as number | null, status: 'received', messages: [] as Array<Record<string, unknown>> };
  const stmt = (sql: string) => {
    let args: unknown[] = [];
    const api = {
      bind: (...a: unknown[]) => ((args = a), api),
      async first() {
        if (sql.startsWith('SELECT id, status, payload_json FROM leads')) return { id: 3, status: state.status, payload_json: JSON.stringify(leadPayload) };
        if (sql.startsWith('SELECT seller_id FROM leads')) return { seller_id: state.sellerId };
        if (sql.startsWith('SELECT id FROM sellers')) return { id: seller.id };
        if (sql.startsWith('SELECT id, name, phone FROM sellers')) return seller;
        if (sql.startsWith('SELECT status, meta_message_id FROM leads')) return { status: state.status, meta_message_id: null };
        return null;
      },
      async run() {
        if (sql.startsWith('UPDATE leads SET seller_id')) state.sellerId = args[0] as number;
        if (sql.startsWith("UPDATE leads SET status = 'processing'")) return { meta: { changes: 1 } };
        if (sql.startsWith("UPDATE leads SET status = 'meta_sent'")) state.status = 'meta_sent';
        if (sql.includes('INSERT') && sql.includes('lead_messages')) state.messages.push({ sql: sql.replace(/\s+/g, ' '), args });
        return { meta: { changes: 1 } };
      },
    };
    return api;
  };
  return { state, prepare: stmt, batch: async (list: Array<{ run(): Promise<unknown> }>) => Promise.all(list.map((s) => s.run())) };
}

const fakeStep = {
  do: async (_name: string, a: unknown, b?: () => Promise<unknown>) => (typeof a === 'function' ? (a as () => Promise<unknown>)() : b!()),
  sleep: async () => {},
  waitForEvent: async () => {
    throw new Error('timeout');
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('aviso ao vendedor', () => {
  it('monta o template com vendedor, lead, WhatsApp, interesse e empresa', () => {
    const req = buildSellerAlertRequest(seller, leadPayload, baseEnv);
    expect(req.to).toBe('5561991963278');
    expect(req.template.name).toBe('backe_site_lead_seller_alert');
    expect(req.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'Bruno', 'Maria Souza', '5561999990000', 'Tráfego Pago', '@empresa',
    ]);
  });

  it('troca campo vazio por "-" e achata quebras de linha (a Meta recusa os dois)', () => {
    const req = buildSellerAlertRequest(seller, { lead: { name: 'Ana\nLima', phone: '5561988887777' } }, baseEnv);
    expect(req.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual(['Bruno', 'Ana Lima', '5561988887777', '-', '-']);
  });

  it('o workflow avisa o vendedor e depois manda a mensagem ao cliente', async () => {
    const sent: Array<{ to: string; template: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      sent.push({ to: body.to, template: body.template.name });
      return new Response(JSON.stringify({ messages: [{ id: `wamid.${sent.length}` }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const db = fakeDb();
    const wf = new LeadAutomationWorkflow({}, { ...baseEnv, LEADS_DB: db, META_WHATSAPP_FOLLOWUP_TEMPLATE_NAME: '' });
    const result = await wf.run({ payload: { leadId: 3 } }, fakeStep);

    expect(sent).toEqual([
      { to: '5561991963278', template: 'backe_site_lead_seller_alert' },
      { to: '5561999990000', template: 'backe_site_lead_welcome' },
    ]);
    expect(db.state.sellerId).toBe(1);
    expect(result.status).toBe('meta_sent');
    expect(db.state.messages.some((m) => String(m.sql).includes("'seller_alert'"))).toBe(true);
  });

  it('falha no aviso ao vendedor não impede a mensagem ao cliente', async () => {
    const sent: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      sent.push(body.template.name);
      if (body.template.name === 'backe_site_lead_seller_alert') {
        return new Response(JSON.stringify({ error: { message: 'Template not approved' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.ok' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const db = fakeDb();
    const wf = new LeadAutomationWorkflow({}, { ...baseEnv, LEADS_DB: db, META_WHATSAPP_FOLLOWUP_TEMPLATE_NAME: '' });
    const result = await wf.run({ payload: { leadId: 3 } }, fakeStep);

    expect(sent).toContain('backe_site_lead_welcome');
    expect(result.status).toBe('meta_sent');
    expect(db.state.messages.some((m) => String(m.sql).includes("'failed'"))).toBe(true);
  });

  it('sem Meta configurada não manda nada (lead fica guardado aguardando ativação)', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const wf = new LeadAutomationWorkflow({}, { LEADS_DB: fakeDb() });
    const result = await wf.run({ payload: { leadId: 3 } }, fakeStep);
    expect(f).not.toHaveBeenCalled();
    expect(result.reason).toBe('meta_not_configured');
  });
});
