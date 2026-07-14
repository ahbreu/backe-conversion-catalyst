const apiUrl = String(process.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

try {
  const response = await fetch(`${apiUrl}/api/meta/health`);
  const data = await response.json();
  if (!response.ok || data?.ok !== true) throw new Error(data?.message || `HTTP ${response.status}`);
  console.log('Meta WhatsApp healthcheck passed.');
} catch (error) {
  console.error(`Meta WhatsApp healthcheck failed: ${error.message}`);
  process.exitCode = 1;
}
