# Deploy de producao com Cloudflare Worker

Este projeto usa tres pecas em producao:

- GitHub Pages: publica a landing React.
- Cloudflare Worker: recebe o formulario em `/api/leads` e protege o webhook do n8n.
- Cloudfy/n8n: executa a automacao, grava o lead e envia WhatsApp.

O frontend nunca deve chamar o webhook do n8n diretamente. Em producao, `VITE_API_URL` precisa apontar para a Worker.

## 1. Conferir o webhook do n8n

No n8n/Cloudfy, importe e ative [`workflows/backe-lead-whatsapp.json`](../workflows/backe-lead-whatsapp.json).

Use a URL de producao do webhook:

```txt
https://groundedlungfish-n8n.cloudfy.live/webhook/sandbox/backe/lead-capture
```

Se o workflow usar um healthcheck de producao, separe tambem a URL correspondente.

## 2. Configurar a Worker

A configuracao versionada fica em [`worker/wrangler.toml`](../worker/wrangler.toml).

Confirme o dominio da landing em:

```toml
FRONTEND_URL = "https://backe.com.br,https://www.backe.com.br"
```

Se o site ainda estiver no dominio padrao do GitHub Pages, inclua tambem a origem `https://ahbreu.github.io`.

Configure os webhooks como secrets da Cloudflare, nao como variaveis publicas:

```sh
npx wrangler login
npx wrangler secret put N8N_LEAD_CAPTURE_WEBHOOK_URL --config worker/wrangler.toml
npx wrangler secret put N8N_HEALTHCHECK_URL --config worker/wrangler.toml
```

## 3. Publicar a Worker

Deploy manual:

```sh
npm run worker:deploy
```

Ao final, a Cloudflare mostra uma URL publica parecida com:

```txt
https://backe-lead-proxy.SEUSUBDOMINIO.workers.dev
```

Teste:

```sh
curl https://backe-lead-proxy.SEUSUBDOMINIO.workers.dev/health
curl https://backe-lead-proxy.SEUSUBDOMINIO.workers.dev/api/cloudfy/health
```

## 4. Conectar o GitHub Pages na Worker

No GitHub, configure a variavel publica do repositorio:

```txt
Settings > Secrets and variables > Actions > Variables
VITE_API_URL=https://backe-lead-proxy.SEUSUBDOMINIO.workers.dev
```

Depois rode novamente o workflow `Deploy GitHub Pages`.

Pelo terminal, com GitHub CLI autenticado:

```sh
gh variable set VITE_API_URL --repo ahbreu/backe-conversion-catalyst --body "https://backe-lead-proxy.SEUSUBDOMINIO.workers.dev"
gh workflow run deploy-pages.yml --repo ahbreu/backe-conversion-catalyst --ref main
```

## 5. Deploy automatico da Worker pelo GitHub

O workflow [`deploy-worker.yml`](../.github/workflows/deploy-worker.yml) publica a Worker quando houver mudanca em `worker/**`.

Antes de usar o deploy automatico, configure estes secrets no GitHub:

```txt
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

O `CLOUDFLARE_API_TOKEN` precisa permitir deploy de Workers na conta usada.

## Checklist final

- `GET /health` da Worker responde `ok: true`.
- `GET /api/cloudfy/health` da Worker consegue falar com o n8n.
- `VITE_API_URL` no GitHub aponta para a URL da Worker, sem barra final.
- `Deploy GitHub Pages` rodou depois da troca de `VITE_API_URL`.
- O formulario da landing envia para `https://...workers.dev/api/leads`.

## Observacoes

- A Worker nao salva lead localmente em SQLite; esse recurso continua apenas no backend Express local.
- Rate limit e deduplicacao na Worker sao protecoes leves em memoria do isolate. Para protecao distribuida mais forte, o proximo passo seria usar Cloudflare KV ou Durable Objects.
- O backend Express continua util para desenvolvimento local com `npm run dev`.
