ALTER TABLE leads ADD COLUMN workflow_instance_id TEXT;
ALTER TABLE leads ADD COLUMN seller_id INTEGER;
ALTER TABLE leads ADD COLUMN contact_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN last_inbound_at TEXT;
ALTER TABLE leads ADD COLUMN last_outbound_at TEXT;
ALTER TABLE leads ADD COLUMN followup_due_at TEXT;

CREATE TABLE sellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  weight INTEGER NOT NULL DEFAULT 1,
  last_assigned_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE lead_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL,
  template_name TEXT,
  meta_message_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  error_code TEXT,
  error_message TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX idx_lead_messages_lead ON lead_messages (lead_id, occurred_at);
CREATE INDEX idx_lead_messages_meta_id ON lead_messages (meta_message_id);

CREATE TABLE webhook_events (
  event_hash TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE automation_reports (
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  period_start TEXT NOT NULL,
  leads_received INTEGER NOT NULL DEFAULT 0,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  messages_delivered INTEGER NOT NULL DEFAULT 0,
  messages_failed INTEGER NOT NULL DEFAULT 0,
  leads_replied INTEGER NOT NULL DEFAULT 0,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (period_type, period_start)
);
