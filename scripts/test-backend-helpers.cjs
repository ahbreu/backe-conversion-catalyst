const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  normalizeLeadPayload,
  normalizePhone,
  validateLeadPayload
} = require('../backend/metaWhatsApp');
const {
  closeLocalLeadDb,
  getLocalLeadById,
  listLocalLeads,
  saveLocalLead,
  updateLocalLeadAutomationFailure,
  updateLocalLeadAutomationSuccess
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
    serviceInterest: 'automacao',
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

updateLocalLeadAutomationSuccess(savedLead.id, {
  ok: true,
  messageId: 'wamid.test'
});

const forwardedLead = getLocalLeadById(savedLead.id);
assert.equal(forwardedLead.status, 'meta_sent');
assert.equal(forwardedLead.automation_ok, 1);
assert.equal(forwardedLead.automation_delivered, 1);

updateLocalLeadAutomationFailure(savedLead.id, new Error('meta offline'));

const failedLead = getLocalLeadById(savedLead.id);
assert.equal(failedLead.status, 'meta_failed');
assert.equal(failedLead.error_message, 'meta offline');
assert.equal(listLocalLeads(10).length, 1);

closeLocalLeadDb();
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('Backend helper checks passed.');
