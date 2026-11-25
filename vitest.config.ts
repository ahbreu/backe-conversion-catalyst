import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Valores de teste para a configuração pública (src/config/site.ts). Nada sai para a internet: os testes usam fetch simulado.
export default defineConfig({
  // o Worker importa "cloudflare:workers", que só existe na Cloudflare
  resolve: { alias: { 'cloudflare:workers': fileURLToPath(new URL('./tests/stubs/cloudflare-workers.js', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      VITE_API_URL: 'https://leads.test.invalid',
      VITE_TURNSTILE_SITE_KEY: 'test-sitekey',
      VITE_PUBLIC_WHATSAPP_PHONE: '5561900000000',
    },
  },
});
