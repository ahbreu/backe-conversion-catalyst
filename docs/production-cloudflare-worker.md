# Produção: Cloudflare Worker + Meta WhatsApp

## Arquitetura

O GitHub Pages continua servindo o site sem alterações. `VITE_API_URL` aponta para o Worker, que recebe `/api/leads`, valida CORS, salva o lead no D1 e envia um template aprovado pela API oficial do WhatsApp. Um Cron Trigger reprocessa falhas a cada cinco minutos.

O formulário nunca recebe tokens. O Worker também não registra o token nem o payload completo nos logs.

## Checklist de ativação

1. Configure o WhatsApp Business na Meta, confirme o número e aprove o template `backe_site_lead_welcome`, com nome e serviço como os dois parâmetros do corpo.
2. Execute os comandos de criação do D1, migrations e secrets descritos em [`worker/README.md`](../worker/README.md).
3. Confirme `FRONTEND_URL` em `worker/wrangler.toml`.
4. Faça deploy do Worker e valide `GET /health` e `GET /api/meta/health`.
5. Envie um lead de teste e confirme `meta_sent` no D1.
6. Somente então ajuste a variável GitHub `VITE_API_URL` e publique o frontend.
7. Após validar o tráfego real, encerre o Cloudfy.

Consulta operacional:

```bash
npx wrangler d1 execute backe-leads --remote --config worker/wrangler.toml --command "SELECT id, status, attempts, created_at, updated_at FROM leads ORDER BY id DESC LIMIT 20"
```

Se a Meta estiver fora do ar, `/api/leads` responde `202` e o lead permanece no D1. Investigue registros em `meta_failed` que atingirem 12 tentativas; eles não são apagados automaticamente.

## Segurança e operação

- Turnstile é validado no Worker com hostname e action esperados.
- Rate limit é distribuído no D1; o Map em memória é apenas fallback local.
- O envio Meta usa lease atômico para impedir processamento concorrente.
- IP e User-Agent não são persistidos.
- Leads são eliminados automaticamente após 180 dias.
- `/api/admin/health` retorna apenas contagens e exige `ADMIN_HEALTH_TOKEN`.

Em incidente: desative temporariamente o formulário removendo `VITE_API_URL`, revogue/rotacione secrets no Wrangler, preserve logs necessários, avalie o escopo dos titulares afetados e siga o procedimento aplicável da ANPD.
