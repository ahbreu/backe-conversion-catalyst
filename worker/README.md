# Backe Cloudflare Worker

Proxy publico para o formulario da landing. Ele recebe `POST /api/leads`, valida o payload, aplica CORS por origem permitida e encaminha para o webhook privado do Cloudfy/n8n.

## Endpoints

- `GET /health`
- `GET /api/cloudfy/health`
- `GET /api/local-leads/health`
- `POST /api/leads`

## Variaveis

As variaveis publicas ficam em `wrangler.toml`:

```toml
APP_ENV = "production"
COMPANY_NAME = "BACKE.co"
FRONTEND_URL = "https://backe.com.br,https://www.backe.com.br"
```

Os webhooks do n8n devem ser secrets da Cloudflare:

```sh
npx wrangler secret put N8N_LEAD_CAPTURE_WEBHOOK_URL --config worker/wrangler.toml
npx wrangler secret put N8N_HEALTHCHECK_URL --config worker/wrangler.toml
```

Tambem funcionam os nomes usados pelo backend Express:

```sh
npx wrangler secret put N8N_LEAD_CAPTURE_WEBHOOK_PROD_URL --config worker/wrangler.toml
npx wrangler secret put N8N_HEALTHCHECK_PROD_URL --config worker/wrangler.toml
```

## Deploy manual

```sh
npx wrangler login
npx wrangler deploy --config worker/wrangler.toml
```

## Teste local

Para rodar localmente, crie `worker/.dev.vars` a partir de `worker/.dev.vars.example` e preencha os webhooks reais.

```sh
npm run worker:dev
```

Depois do deploy, a Cloudflare vai mostrar uma URL parecida com:

```txt
https://backe-lead-proxy.SEUSUBDOMINIO.workers.dev
```

Configure essa URL no GitHub em `Settings > Secrets and variables > Actions > Variables`:

```txt
VITE_API_URL=https://backe-lead-proxy.SEUSUBDOMINIO.workers.dev
```

Depois rode novamente o workflow `Deploy GitHub Pages`.

## GitHub Actions

Para deploy automatico da Worker, configure estes secrets no GitHub:

```txt
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

O token precisa permitir deploy de Workers no seu account.
