const isProduction = ['production', 'prod'].includes((process.env.APP_ENV || 'sandbox').toLowerCase());
const webhookUrl = isProduction
  ? process.env.N8N_HEALTHCHECK_PROD_URL
  : process.env.N8N_HEALTHCHECK_TEST_URL;

if (!webhookUrl) {
  console.error('Missing N8N healthcheck webhook URL. Check .env.local.');
  process.exit(1);
}

const response = await fetch(webhookUrl, {
  method: 'GET',
  headers: {
    Accept: 'application/json'
  }
});
const data = await response.json().catch(() => null);

console.log(JSON.stringify(data, null, 2));

if (!response.ok || data?.ok !== true) {
  console.error('Cloudfy/n8n healthcheck failed.');
  process.exit(1);
}
