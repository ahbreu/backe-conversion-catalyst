CREATE TABLE leads_hardened (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'meta_sent', 'meta_failed')),
  payload_json TEXT NOT NULL,
  meta_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  lease_until TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO leads_hardened (id, idempotency_key, status, payload_json, meta_message_id, attempts, next_attempt_at, error_message, created_at, updated_at)
SELECT id, idempotency_key, status, payload_json, meta_message_id, attempts, next_attempt_at, error_message, created_at, updated_at FROM leads;
DROP TABLE leads;
ALTER TABLE leads_hardened RENAME TO leads;
CREATE INDEX idx_leads_retry ON leads (status, next_attempt_at);
CREATE INDEX idx_leads_created_at ON leads (created_at);

CREATE TABLE rate_limits (
  bucket_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_rate_limits_expiry ON rate_limits (expires_at);
