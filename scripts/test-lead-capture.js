const webhookUrl = `${String(process.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '')}/api/leads`;

const payload = {
  company: 'BACKE.co',
  environment: 'sandbox',
  source: 'script-test',
  formId: 'sandbox-test',
  pageUrl: 'http://localhost',
  pageTitle: 'Sandbox Test',
  utm: {
    source: 'local',
    medium: 'test',
    campaign: 'meta-whatsapp',
    term: null,
    content: null
  },
  lead: {
    name: 'Teste BACKE',
    email: 'teste@backe.co',
    phone: '5511999999999',
    message: 'Teste de integração do site com a API oficial do WhatsApp',
    serviceInterest: 'automacao',
    companyName: 'BACKE.co'
  },
  seller: {
    name: null,
    phone: null
  },
  metadata: {
    userAgent: 'script-test',
    submittedAt: new Date().toISOString()
  }
};

const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});
const data = await response.json().catch(() => null);

console.log(JSON.stringify(data, null, 2));

if (!response.ok || data?.ok !== true) {
  console.error('Lead capture test failed.');
  process.exit(1);
}
