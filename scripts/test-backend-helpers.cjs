const assert = require('node:assert/strict');
const {
  normalizeLeadPayload,
  normalizePhone,
  validateLeadPayload
} = require('../backend/cloudfy');

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

console.log('Backend helper checks passed.');
