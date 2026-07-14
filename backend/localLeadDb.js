const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DATA_DIR = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'BACKE.co', 'lead-db')
  : path.join(os.homedir(), '.backe', 'lead-db');
const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, 'leads.sqlite');

let db = null;
let dbPath = null;

const resolveLocalLeadDbPath = () => {
  const configuredPath = String(process.env.LOCAL_LEAD_DB_PATH || '').trim();

  if (!configuredPath) {
    return DEFAULT_DB_PATH;
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(__dirname, '..', configuredPath);
};

const serializeJson = (value) => JSON.stringify(value || {});

const getLocalLeadDb = () => {
  const nextDbPath = resolveLocalLeadDbPath();

  if (db && dbPath === nextDbPath) {
    return db;
  }

  if (db) {
    db.close();
  }

  fs.mkdirSync(path.dirname(nextDbPath), { recursive: true });
  db = new DatabaseSync(nextDbPath);
  dbPath = nextDbPath;

  db.exec(`
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS local_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'received',
      company TEXT NOT NULL,
      environment TEXT NOT NULL,
      source TEXT NOT NULL,
      form_id TEXT NOT NULL,
      page_url TEXT,
      page_title TEXT,
      lead_name TEXT NOT NULL,
      lead_email TEXT,
      lead_phone TEXT NOT NULL,
      lead_message TEXT,
      service_interest TEXT,
      company_name TEXT,
      seller_name TEXT,
      seller_phone TEXT,
      utm_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      payload_json TEXT NOT NULL DEFAULT '{}',
      automation_response_json TEXT,
      automation_ok INTEGER NOT NULL DEFAULT 0,
      automation_delivered INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_local_leads_phone ON local_leads (lead_phone);
    CREATE INDEX IF NOT EXISTS idx_local_leads_email ON local_leads (lead_email);
    CREATE INDEX IF NOT EXISTS idx_local_leads_status ON local_leads (status);
    CREATE INDEX IF NOT EXISTS idx_local_leads_created_at ON local_leads (created_at);
  `);

  const columns = new Set(db.prepare('PRAGMA table_info(local_leads)').all().map((column) => column.name));
  [
    ['automation_response_json', 'TEXT'],
    ['automation_ok', 'INTEGER NOT NULL DEFAULT 0'],
    ['automation_delivered', 'INTEGER NOT NULL DEFAULT 0']
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE local_leads ADD COLUMN ${name} ${definition}`);
  });

  return db;
};

const getLocalLeadDbPath = () => resolveLocalLeadDbPath();

const saveLocalLead = (leadPayload, idempotencyKey) => {
  const database = getLocalLeadDb();
  const key = String(idempotencyKey || leadPayload.metadata?.idempotencyKey || '').trim();

  if (!key) {
    throw new Error('Local lead idempotency key is required.');
  }

  const result = database
    .prepare(
      `
      INSERT OR IGNORE INTO local_leads (
        idempotency_key,
        status,
        company,
        environment,
        source,
        form_id,
        page_url,
        page_title,
        lead_name,
        lead_email,
        lead_phone,
        lead_message,
        service_interest,
        company_name,
        seller_name,
        seller_phone,
        utm_json,
        metadata_json,
        payload_json
      )
      VALUES (?, 'received', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      key,
      leadPayload.company,
      leadPayload.environment,
      leadPayload.source,
      leadPayload.formId,
      leadPayload.pageUrl || null,
      leadPayload.pageTitle || null,
      leadPayload.lead.name,
      leadPayload.lead.email || null,
      leadPayload.lead.phone,
      leadPayload.lead.message || null,
      leadPayload.lead.serviceInterest || null,
      leadPayload.lead.companyName || null,
      leadPayload.seller.name || null,
      leadPayload.seller.phone || null,
      serializeJson(leadPayload.utm),
      serializeJson(leadPayload.metadata),
      serializeJson(leadPayload)
    );

  const row = database
    .prepare('SELECT id, status FROM local_leads WHERE idempotency_key = ?')
    .get(key);

  return {
    id: Number(row.id),
    status: row.status,
    duplicate: result.changes === 0,
    dbPath: dbPath
  };
};

const updateLocalLeadAutomationSuccess = (localLeadId, response = {}) => {
  const database = getLocalLeadDb();

  database
    .prepare(
      `
      UPDATE local_leads
      SET
        status = 'meta_sent',
        automation_response_json = ?,
        automation_ok = ?,
        automation_delivered = ?,
        error_message = NULL,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
      `
    )
    .run(
      serializeJson(response),
      response?.ok === true ? 1 : 0,
      response?.messageId ? 1 : 0,
      localLeadId
    );
};

const updateLocalLeadAutomationFailure = (localLeadId, error) => {
  const database = getLocalLeadDb();
  const message = error instanceof Error ? error.message : String(error || 'Unknown automation error.');

  database
    .prepare(
      `
      UPDATE local_leads
      SET
        status = 'meta_failed',
        error_message = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
      `
    )
    .run(message.slice(0, 500), localLeadId);
};

const getLocalLeadById = (localLeadId) =>
  getLocalLeadDb().prepare('SELECT * FROM local_leads WHERE id = ?').get(localLeadId);

const listLocalLeads = (limit = 20) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

  return getLocalLeadDb()
    .prepare(
      `
      SELECT
        id,
        lead_name AS nome,
        lead_phone AS telefone,
        lead_email AS email,
        service_interest AS servico,
        status,
        created_at,
        updated_at
      FROM local_leads
      ORDER BY created_at DESC
      LIMIT ?
      `
    )
    .all(safeLimit);
};

const closeLocalLeadDb = () => {
  if (!db) {
    return;
  }

  db.close();
  db = null;
  dbPath = null;
};

module.exports = {
  closeLocalLeadDb,
  getLocalLeadById,
  getLocalLeadDbPath,
  listLocalLeads,
  saveLocalLead,
  updateLocalLeadAutomationFailure,
  updateLocalLeadAutomationSuccess
};
