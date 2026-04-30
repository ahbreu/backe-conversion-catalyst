const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs/promises');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.jsonl');
const FATURAMENTO_OPTIONS = [
  'Até R$ 10.000',
  'R$ 10.000 - R$ 50.000',
  'R$ 50.000 - R$ 100.000',
  'R$ 100.000 - R$ 500.000',
  'Acima de R$ 500.000'
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeText = (value) => {
  const text = String(value || '').trim();
  const fixed = text.includes('Ã') ? Buffer.from(text, 'latin1').toString('utf8') : text;
  return fixed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};
const NORMALIZED_FATURAMENTO_OPTIONS = new Set(FATURAMENTO_OPTIONS.map(normalizeText));

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend Backe online'
  });
});

const sanitizeLead = (payload = {}) => ({
  nome: String(payload.nome || '').trim(),
  whatsapp: String(payload.whatsapp || '').trim(),
  email: String(payload.email || '').trim(),
  empresa: String(payload.empresa || '').trim(),
  nicho: String(payload.nicho || '').trim(),
  faturamento: String(payload.faturamento || '').trim()
});

const validateLead = (lead) => {
  const requiredFields = ['nome', 'whatsapp', 'email', 'empresa', 'nicho', 'faturamento'];
  const missingField = requiredFields.find((field) => !lead[field]);

  if (missingField) {
    return { ok: false, message: 'Preencha todos os campos obrigatórios.' };
  }

  if (!EMAIL_PATTERN.test(lead.email)) {
    return { ok: false, message: 'Email inválido.' };
  }

  const phoneDigits = lead.whatsapp.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, message: 'WhatsApp inválido.' };
  }

  if (lead.nome.length > 100 || lead.empresa.length > 100 || lead.nicho.length > 100) {
    return { ok: false, message: 'Campos de texto excedem o limite permitido.' };
  }

  if (lead.email.length > 255 || lead.whatsapp.length > 20) {
    return { ok: false, message: 'Campos excedem o limite permitido.' };
  }

  if (!NORMALIZED_FATURAMENTO_OPTIONS.has(normalizeText(lead.faturamento))) {
    return { ok: false, message: 'Faixa de faturamento inválida.' };
  }

  return { ok: true };
};

const persistLead = async (lead) => {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const leadRecord = {
    ...lead,
    recebidoEm: new Date().toISOString()
  };

  await fs.appendFile(LEADS_FILE, `${JSON.stringify(leadRecord)}\n`, 'utf8');

  return leadRecord;
};

app.post('/api/leads', async (req, res) => {
  try {
    const lead = sanitizeLead(req.body);
    const validation = validateLead(lead);

    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        message: validation.message
      });
    }

    const savedLead = await persistLead(lead);

    return res.status(201).json({
      ok: true,
      message: 'Lead recebido com sucesso',
      lead: savedLead
    });
  } catch (error) {
    console.error('Erro ao processar lead:', error);
    return res.status(500).json({
      ok: false,
      message: 'Erro interno do servidor'
    });
  }
});

app.use((error, req, res, next) => {
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      message: 'JSON invalido no corpo da requisicao.'
    });
  }

  return next(error);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
