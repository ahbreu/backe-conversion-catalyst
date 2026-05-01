const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  normalizeLeadPayload,
  normalizePhone,
  validateLeadPayload
} = require('../backend/cloudfy');
const {
  closeLocalLeadDb,
  getLocalLeadById,
  listLocalLeads,
  saveLocalLead,
  updateLocalLeadN8nFailure,
  updateLocalLeadN8nSuccess
} = require('../backend/localLeadDb');

assert.equal(normalizePhone('(11) 99999-9999'), '5511999999999');
assert.equal(normalizePhone('+55 11 99999-9999'), '5511999999999');

const validPayload = normalizeLeadPayload({
  company: 'BACKE.co',
  environment: 'sandbox',
  source: 'script-test',
  formId: 'backend-helper-test',
  pageUrl: 'http://localhost',
  pageTitle: 'Backend Helper Test',
  lead: {
    name: 'Teste BACKE',
    email: 'teste@backe.co',
    phone: '(11) 99999-9999',
    serviceInterest: 'Automação de atendimento',
    companyName: 'BACKE.co'
  },
  metadata: {
    userAgent: 'script-test'
  }
});

assert.deepEqual(validateLeadPayload(validPayload), { ok: true });

const invalidPayload = normalizeLeadPayload({
  lead: {
    name: '',
    phone: ''
  }
});

assert.equal(validateLeadPayload(invalidPayload).ok, false);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backe-local-leads-'));
process.env.LOCAL_LEAD_DB_PATH = path.join(tempDir, 'leads.sqlite');

const savedLead = saveLocalLead(validPayload, 'test-idempotency-key');
assert.equal(savedLead.duplicate, false);
assert.equal(savedLead.id > 0, true);

const duplicateLead = saveLocalLead(validPayload, 'test-idempotency-key');
assert.equal(duplicateLead.duplicate, true);
assert.equal(duplicateLead.id, savedLead.id);

updateLocalLeadN8nSuccess(savedLead.id, {
  ok: true,
  leadReceived: true
});

const forwardedLead = getLocalLeadById(savedLead.id);
assert.equal(forwardedLead.status, 'n8n_forwarded');
assert.equal(forwardedLead.n8n_ok, 1);
assert.equal(forwardedLead.n8n_lead_received, 1);

updateLocalLeadN8nFailure(savedLead.id, new Error('n8n offline'));

const failedLead = getLocalLeadById(savedLead.id);
assert.equal(failedLead.status, 'n8n_failed');
assert.equal(failedLead.error_message, 'n8n offline');
assert.equal(listLocalLeads(10).length, 1);

closeLocalLeadDb();
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('Backend helper checks passed.');
