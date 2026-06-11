const fs = require('fs');
const path = require('path');

const DEFAULT_LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE_PREFIX = 'followup-audit';

class AuditLogger {
  constructor(options = {}) {
    this.logDir = options.logDir || DEFAULT_LOG_DIR;
    this.enabled = options.enabled !== false;
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _logFilePath() {
    const date = new Date().toISOString().slice(0, 10);
    return path.join(this.logDir, `${LOG_FILE_PREFIX}-${date}.jsonl`);
  }

  _buildEntry(entry) {
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: entry.environment || process.env.APP_ENV || 'sandbox',
      scenario: entry.scenario || null,
      sessionId: entry.sessionId || null,
      phone: entry.phone || null,
      gaps: entry.gaps || [],
      decision: entry.decision,
      reason: entry.reason,
      context: entry.context || {},
      requestId: entry.requestId || crypto.randomUUID()
    };
  }

  log(entry) {
    const record = this._buildEntry(entry);

    if (this.enabled) {
      const line = JSON.stringify(record);
      fs.appendFileSync(this._logFilePath(), `${line}\n`, 'utf8');
    }

    console.log(JSON.stringify({ level: 'audit', event: 'followup_decision', ...record }));
    return record;
  }

  readToday() {
    const filePath = this._logFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }
}

module.exports = { AuditLogger };
