const isProduction = ['production', 'prod'].includes((process.env.APP_ENV || 'sandbox').toLowerCase());
const webhookUrl = isProduction
  ? process.env.N8N_LEAD_CAPTURE_WEBHOOK_PROD_URL
  : process.env.N8N_LEAD_CAPTURE_WEBHOOK_TEST_URL;

if (!webhookUrl) {
  console.error('Missing N8N lead capture webhook URL. Check .env.local.');
  process.exit(1);
}

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
    campaign: 'cloudfy-sandbox',
    term: null,
    content: null
  },
  lead: {
    name: 'Teste BACKE',
    email: 'teste@backe.co',
    phone: '55XXXXXXXXXXX',
    message: 'Teste de integração do site com n8n',
    serviceInterest: 'Automação de atendimento',
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
  console.error('Cloudfy/n8n lead capture test failed.');
  process.exit(1);
}
