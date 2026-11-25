import { defineConfig } from 'astro/config';

// Produção (backe.com.br): valores padrão. O fluxo .github/workflows/deploy-pages.yml passa SITE_URL e BASE_PATH.
// Configuração pública (API, Turnstile, Pixel, WhatsApp): variáveis VITE_* lidas em src/config/site.ts.
export default defineConfig({
  site: process.env.SITE_URL || 'https://backe.com.br',
  base: process.env.BASE_PATH || '/',
  build: {
    // CSS embutido no HTML (sem folha de estilos bloqueando a primeira pintura).
    inlineStylesheets: 'always',
    // páginas como arquivo: /privacidade.html e /404.html (mesmos endereços do site anterior)
    format: 'file',
  },
  vite: {
    // scripts sempre como arquivo: a CSP só permite scripts do próprio domínio (sem 'unsafe-inline')
    build: { assetsInlineLimit: 0 },
    // VITE_*: os mesmos nomes de variável que o repositório já usa no GitHub. Só valores públicos (nada de segredo).
    envPrefix: ['PUBLIC_', 'VITE_'],
  },
  compressHTML: true,
});
