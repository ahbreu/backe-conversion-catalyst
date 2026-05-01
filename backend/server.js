const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs/promises');
const crypto = require('crypto');

[
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '.env.local')
].forEach((envPath) => dotenv.config({ path: envPath, override: true }));

const {
  checkCloudfyHealth,
  hasHoneypotValue,
  normalizeLeadPayload,
  submitLeadToN8n,
  validateLeadPayload
} = require('./cloudfy');
const {
  saveLocalLead,
  updateLocalLeadN8nFailure,
  updateLocalLeadN8nSuccess
} = require('./localLeadDb');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.jsonl');
const isTruthy = (value) => ['1', 'true', 'yes'].includes(String(value || '').toLowerCase());
const LOCAL_LEAD_DB_ENABLED = process.env.LOCAL_LEAD_DB_ENABLED !== 'false';
const LOCAL_LEAD_LOG_ENABLED = isTruthy(process.env.LOCAL_LEAD_LOG_ENABLED);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const LEAD_IDEMPOTENCY_WINDOW_MS = Number(process.env.LEAD_IDEMPOTENCY_WINDOW_MS || 300000);
const TRUST_PROXY_ENABLED = isTruthy(process.env.TRUST_PROXY);
const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://[::1]:8080',
  'http://[::1]:5173'
];
const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/+$/, '');
const isProductionEnvironment = () =>
  ['production', 'prod'].includes(String(process.env.APP_ENV || 'sandbox').toLowerCase());
const allowedOrigins = new Set(
  [...DEFAULT_FRONTEND_ORIGINS, ...(process.env.FRONTEND_URL || '').split(',')]
    .map(normalizeOrigin)
    .filter(Boolean)
);
const isLocalDevOrigin = (origin) => {
  if (isProductionEnvironment()) {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
};
const rateLimitStore = new Map();
const leadFingerprintStore = new Map();

const log = (level, event, details = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details
  };

  const logger = level === 'error' ? console.error : console.log;
  logger(JSON.stringify(payload));
};

const createLeadFingerprint = (leadPayload) =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        company: leadPayload.company,
        environment: leadPayload.environment,
        formId: leadPayload.formId,
        pageUrl: leadPayload.pageUrl,
        name: leadPayload.lead.name.toLowerCase(),
        email: leadPayload.lead.email,
        phone: leadPayload.lead.phone,
        serviceInterest: leadPayload.lead.serviceInterest,
        companyName: leadPayload.lead.companyName
      })
    )
    .digest('hex');

const pruneExpiringMap = (store, now = Date.now()) => {
  for (const [key, value] of store.entries()) {
    const expiresAt = value.expiresAt ?? value.resetAt;

    if (expiresAt <= now) {
      store.delete(key);
    }
  }
};

app.set('trust proxy', TRUST_PROXY_ENABLED);
app.use(helmet());

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin || allowedOrigins.has(normalizedOrigin) || isLocalDevOrigin(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
    optionsSuccessStatus: 204
  })
);

app.use(express.json({ limit: '64kb' }));

const getClientIp = (req) => req.ip || req.socket?.remoteAddress || null;

const rateLimitLeads = (req, res, next) => {
  const now = Date.now();
  const key = getClientIp(req) || 'unknown';
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    pruneExpiringMap(rateLimitStore, now);
    return next();
  }

  current.count += 1;

  if (current.count > RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    log('warn', 'lead_rate_limited', {
      requestId: req.id,
      ip: key,
      retryAfterSeconds
    });

    return res.status(429).json({
      ok: false,
      message: 'Recebemos muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.'
    });
  }

  return next();
};

const persistLead = async (leadPayload, n8nResponse) => {
  if (!LOCAL_LEAD_LOG_ENABLED) {
    return null;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  const leadRecord = {
    ...leadPayload,
    n8n: {
      ok: n8nResponse?.ok === true,
      leadReceived: n8nResponse?.leadReceived === true
    },
    receivedAt: new Date().toISOString()
  };

  await fs.appendFile(LEADS_FILE, `${JSON.stringify(leadRecord)}\n`, 'utf8');

  return leadRecord;
};

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    company: process.env.COMPANY_NAME || 'BACKE.co',
    environment: process.env.APP_ENV || 'sandbox',
    message: 'Backend Backe online'
  });
});

app.get('/api/local-leads/health', (req, res) => {
  res.json({
    ok: true,
    enabled: LOCAL_LEAD_DB_ENABLED
  });
});

app.get('/api/cloudfy/health', async (req, res) => {
  try {
    const health = await checkCloudfyHealth();
    log('info', 'cloudfy_health_ok', {
      requestId: req.id
    });

    return res.json({
      ok: true,
      cloudfy: health
    });
  } catch (error) {
    log('error', 'cloudfy_health_failed', {
      requestId: req.id,
      message: error.message,
      status: error.status
    });

    return res.status(502).json({
      ok: false,
      message: 'Não foi possível verificar o Cloudfy/n8n agora.'
    });
  }
});

app.post('/api/leads', rateLimitLeads, async (req, res) => {
  try {
    if (hasHoneypotValue(req.body)) {
      log('warn', 'lead_honeypot_rejected', {
        requestId: req.id,
        ip: getClientIp(req)
      });

      return res.status(400).json({
        ok: false,
        message: 'Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.'
      });
    }

    const leadPayload = normalizeLeadPayload(req.body, {
      formId: 'website-contact-form',
      userAgent: req.get('user-agent') || null,
      ip: getClientIp(req)
    });
    const validation = validateLeadPayload(leadPayload);

    if (!validation.ok) {
      log('warn', 'lead_validation_failed', {
        requestId: req.id,
        reason: validation.message
      });

      return res.status(400).json({
        ok: false,
        message: validation.message
      });
    }

    const fingerprint = createLeadFingerprint(leadPayload);
    const now = Date.now();
    pruneExpiringMap(leadFingerprintStore, now);

    if (leadFingerprintStore.has(fingerprint)) {
      log('info', 'lead_duplicate_skipped', {
        requestId: req.id,
        formId: leadPayload.formId
      });

      return res.status(200).json({
        ok: true,
        message: 'Lead sent successfully',
        duplicate: true
      });
    }

    leadPayload.metadata.idempotencyKey = fingerprint;

    let localLead = null;

    if (LOCAL_LEAD_DB_ENABLED) {
      try {
        localLead = saveLocalLead(leadPayload, fingerprint);
        log('info', 'lead_saved_to_local_db', {
          requestId: req.id,
          localLeadId: localLead.id,
          duplicate: localLead.duplicate
        });
      } catch (error) {
        log('error', 'lead_local_db_save_failed', {
          requestId: req.id,
          message: error.message
        });

        return res.status(500).json({
          ok: false,
          message: 'Não conseguimos salvar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.'
        });
      }
    }

    try {
      const n8nResponse = await submitLeadToN8n(leadPayload);
      leadFingerprintStore.set(fingerprint, {
        expiresAt: now + LEAD_IDEMPOTENCY_WINDOW_MS
      });

      if (localLead) {
        updateLocalLeadN8nSuccess(localLead.id, n8nResponse);
      }

      await persistLead(leadPayload, n8nResponse);
      log('info', 'lead_forwarded_to_n8n', {
        requestId: req.id,
        formId: leadPayload.formId,
        localLeadId: localLead?.id,
        n8nLeadReceived: n8nResponse?.leadReceived === true
      });

      return res.status(201).json({
        ok: true,
        message: 'Lead sent successfully',
        localLeadId: localLead?.id || null,
        automationStatus: 'n8n_forwarded'
      });
    } catch (error) {
      if (localLead) {
        updateLocalLeadN8nFailure(localLead.id, error);
        leadFingerprintStore.set(fingerprint, {
          expiresAt: now + LEAD_IDEMPOTENCY_WINDOW_MS
        });

        log('error', 'lead_saved_locally_n8n_failed', {
          requestId: req.id,
          localLeadId: localLead.id,
          message: error.message,
          status: error.status
        });

        return res.status(202).json({
          ok: true,
          message: 'Lead saved locally. Automation is pending.',
          localLeadId: localLead.id,
          automationStatus: 'n8n_failed'
        });
      }

      throw error;
    }
  } catch (error) {
    log('error', 'lead_forward_failed', {
      requestId: req.id,
      message: error.message,
      status: error.status
    });

    return res.status(502).json({
      ok: false,
      message: 'Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.'
    });
  }
});

app.use((error, req, res, next) => {
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      message: 'JSON inválido no corpo da requisição.'
    });
  }

  if (error && error.message === 'Origin not allowed by CORS.') {
    return res.status(403).json({
      ok: false,
      message: 'Origem não autorizada.'
    });
  }

  return next(error);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
