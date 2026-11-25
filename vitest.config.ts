import { defineConfig } from 'vitest/config';

// Valores de teste para a configuração pública (src/config/site.ts). Nada sai para a internet: os testes usam fetch simulado.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      VITE_API_URL: 'https://leads.test.invalid',
      VITE_TURNSTILE_SITE_KEY: 'test-sitekey',
      VITE_PUBLIC_WHATSAPP_PHONE: '5561900000000',
    },
  },
});
