# BACKE Lead Worker

Backend de produção do formulário. O Worker valida e persiste cada lead no D1 antes de chamar a API oficial do WhatsApp Cloud da Meta. Falhas ficam com status `meta_failed` e são reprocessadas a cada cinco minutos pelo Cron Trigger.

## Rotas

- `POST /api/leads`
- `GET /health`
- `GET /api/meta/health`

## Preparação única

```bash
npx wrangler login
npx wrangler d1 create backe-leads --config worker/wrangler.toml
```

O `database_id` público retornado já fica versionado em `worker/wrangler.toml`; ele não é uma credencial. Depois:

```bash
npx wrangler d1 migrations apply backe-leads --remote --config worker/wrangler.toml
npx wrangler secret put META_WHATSAPP_ACCESS_TOKEN --config worker/wrangler.toml
npx wrangler secret put META_WHATSAPP_PHONE_NUMBER_ID --config worker/wrangler.toml
npm run worker:deploy
```

Antes do deploy, crie e aprove na Meta o template definido em `META_WHATSAPP_TEMPLATE_NAME`. O corpo precisa receber, nesta ordem, `{{1}}` para o nome e `{{2}}` para o serviço de interesse.

Nunca coloque o token da Meta no TOML, GitHub ou frontend como variável `VITE_*`.

## Estados

- `received`: persistido antes do primeiro envio.
- `meta_sent`: aceito pela API da Meta, com o `messageId` armazenado.
- `meta_failed`: envio falhou e aguarda nova tentativa; no máximo 12 tentativas automáticas.

Teste local: `npm run worker:dev`. O D1 local usa as mesmas migrations. Teste o cron pelo endpoint de scheduled handler exposto pelo Wrangler.

Sem os secrets da Meta, o Worker continua aceitando e persistindo leads, responde `202` com `received` e mantém a caixa de saída para processamento futuro. Isso permite ativar e validar a infraestrutura antes de conectar o WhatsApp. `meta_failed` é reservado para falhas reais depois da ativação.
