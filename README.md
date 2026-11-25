# BACKE Creative

Landing page institucional da BACKE Creative, focada em conversão e captura confiável de leads.

## Stack

- Astro 5 + TypeScript no frontend (site estático), com GSAP e CSS próprio. Design de Gabriel Felix (repositório `gabrielfelixback/sitebacke`).
- Express para desenvolvimento local.
- Cloudflare Worker + D1 + Workflows + Cron Trigger em produção.
- API oficial do WhatsApp Cloud da Meta para contato automático.
- Meta Pixel carregado somente após consentimento para medir `PageView` e leads persistidos.
- GitHub Pages para hospedar o site.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

Frontend: `http://localhost:8080`. Backend: `http://localhost:3001`.

Testes do frontend (validação, payload e envio do formulário): `npm test`.

### Frontend

| Caminho | O que é |
|---|---|
| `src/config/site.ts` | **Toda a configuração pública** (API, Turnstile, Pixel, WhatsApp, e-mail), lida das variáveis `VITE_*`. Nenhum valor fica escrito no código. |
| `src/data/content.ts` | Todo o conteúdo do site (serviços, FAQ, números, clientes, etapas). |
| `src/lib/lead.ts` | Validação e envio do formulário. O payload segue o contrato de `POST /api/leads` do Worker e do backend local. |
| `src/components/*.astro` | Uma seção por componente. `Consent.astro` é o aviso de privacidade do Meta Pixel. |
| `src/pages/` | `index`, `privacidade` (gera `/privacidade.html`) e `404`. |
| `public/` | Imagens, vídeos, ícones, `robots.txt`, `sitemap.xml` e `sol.js`. |

Variáveis do build (GitHub → Settings → Secrets and variables → Actions → **Variables**; localmente em `.env.local`):

| Variável | Obrigatória | Para quê |
|---|---|---|
| `VITE_API_URL` | sim | Endereço do Worker de leads (sem `/api/leads`). |
| `VITE_TURNSTILE_SITE_KEY` | sim | Sitekey pública do Turnstile. |
| `VITE_PUBLIC_WHATSAPP_PHONE` | sim | WhatsApp da Backe, só dígitos com DDI (`5561…`). |
| `VITE_PUBLIC_CONTACT_EMAIL` | não | E-mail exibido no rodapé e na Política de Privacidade (some do site se vazio). |
| `VITE_PUBLIC_WHATSAPP_MESSAGE` | não | Mensagem inicial dos links de WhatsApp. |
| `VITE_META_PIXEL_ID` | não | ID público do Meta Pixel. |
| `VITE_META_PIXEL_REQUIRE_CONSENT` | não | Padrão `true`: Pixel só depois de "Aceitar". `false` carrega para todos (avaliar LGPD antes). |
| `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | não | Token público do Cloudflare Web Analytics. |
| `VITE_BASE_PATH` / `PUBLIC_SITE_URL` | não | Caminho base (`/` em backe.com.br) e endereço canônico (padrão `https://backe.com.br`). |

O deploy falha de propósito se uma variável obrigatória estiver vazia, para nunca publicar um formulário que não envia.

Rotas do backend:

- `POST /api/leads`
- `GET /health`
- `GET /api/local-leads/health`
- `GET /api/meta/health` (protegido por `ADMIN_HEALTH_TOKEN` em produção)

No ambiente local, leads são persistidos em SQLite antes do envio para a Meta. O caminho padrão fica fora do repositório, em `~/.backe/lead-db/leads.sqlite` no Linux/macOS.

Estados do pipeline: `received`, `processing`, `meta_sent` e `meta_failed`. O Workflow durável aguarda horário comercial, distribui o lead, registra entrega/resposta e executa follow-up aprovado. Uma indisponibilidade da Meta não transforma um lead persistido em erro para o visitante.

## Produção

O site permanece no GitHub Pages. A variável do repositório `VITE_API_URL` deve apontar para o Worker apenas depois que D1, secrets, template e healthchecks estiverem validados.

Veja:

- [Worker e configuração](./worker/README.md)
- [Runbook de produção](./docs/production-cloudflare-worker.md)

Segredos obrigatórios no Worker:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`

O template e idioma são configurações públicas no `worker/wrangler.toml`. Tokens e PII nunca devem ser versionados ou expostos como `VITE_*`.

## Verificação

```bash
npm run lint
npm run test:backend
npm run build
npm run test:meta
npm run test:lead
```

Os dois últimos testes exigem backend/Worker configurado e em execução.
