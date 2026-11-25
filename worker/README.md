# BACKE Lead Worker

Backend de produção do formulário. O Worker valida e persiste cada lead no D1 antes de chamar a API oficial do WhatsApp Cloud da Meta. Falhas ficam com status `meta_failed` e são reprocessadas a cada cinco minutos pelo Cron Trigger.

## Rotas

- `POST /api/leads`
- `GET /health`
- `GET /api/meta/health` (Bearer `ADMIN_HEALTH_TOKEN`)
- `GET|POST /api/meta/webhook`
- `GET /api/admin/health` (Bearer token; somente contagens, nunca retorna PII)

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
npx wrangler secret put TURNSTILE_SECRET_KEY --config worker/wrangler.toml
npx wrangler secret put ADMIN_HEALTH_TOKEN --config worker/wrangler.toml
npm run worker:deploy
```

Antes do deploy, crie e aprove na Meta o template definido em `META_WHATSAPP_TEMPLATE_NAME`. O corpo precisa receber, nesta ordem, `{{1}}` para o nome e `{{2}}` para o serviço de interesse.

## Aviso à equipe (vendedores)

Cada lead novo é atribuído a um vendedor ativo da tabela `sellers` (rodízio) e o vendedor recebe **na hora** um WhatsApp com o template `META_WHATSAPP_SELLER_TEMPLATE_NAME` (`backe_site_lead_seller_alert`). A mensagem ao cliente continua esperando o horário comercial. Se o aviso falhar, a falha fica registrada em `lead_messages` (`message_type = 'seller_alert'`, `status = 'failed'`) e o contato com o cliente segue normalmente.

Template para aprovar na Meta (categoria **Utilidade**, idioma `pt_BR`), com os parâmetros nesta ordem:

```text
Olá, {{1}}! Novo lead pelo site da BACKE.
Nome: {{2}}
WhatsApp: {{3}}
Interesse: {{4}}
Empresa/Instagram: {{5}}
```

Vendedores são cadastrados direto no D1 (telefone só com dígitos e DDI):

```sql
INSERT INTO sellers (name, phone, active) VALUES ('Nome', '5561999999999', 1);
UPDATE sellers SET active = 0 WHERE id = ?; -- tira do rodízio
```

Sem o template aprovado, o aviso falha (fica registrado) e o resto do fluxo segue. Para desligar o aviso, deixe `META_WHATSAPP_SELLER_TEMPLATE_NAME` vazio.

Nunca coloque o token da Meta no TOML, GitHub ou frontend como variável `VITE_*`.

## Estados

- `received`: persistido antes do primeiro envio.
- `meta_sent`: aceito pela API da Meta, com o `messageId` armazenado.
- `meta_failed`: envio falhou e aguarda nova tentativa; no máximo 12 tentativas automáticas.

O cron também remove buckets antigos de rate limit e leads com mais de 180 dias. IP e User-Agent não são persistidos no payload nem registrados nos logs de bloqueio. Em produção, `/api/leads` exige uma origem permitida e Turnstile configurado. Para consultar falhas ou a saúde da Meta sem expor dados pessoais, use o secret administrativo.

## Automação durável

`LeadAutomationWorkflow` cria uma instância por lead quando a Meta estiver configurada. Ele aguarda horário comercial, distribui para um vendedor ativo, envia o template inicial com retentativas, espera uma resposta por 24 horas e, se necessário, envia o template de follow-up aprovado. Sem secrets da Meta, nenhum workflow é iniciado e os leads permanecem em `received`.

Cadastre vendedores diretamente no D1, sem versionar telefone no repositório:

```bash
npx wrangler d1 execute backe-leads --remote --config worker/wrangler.toml --command "INSERT INTO sellers (name, phone) VALUES ('Nome', '55DDDNUMERO')"
```

O webhook registra mensagens recebidas sem salvar o conteúdo, atualiza `sent`, `delivered`, `read` e `failed`, marca o lead como respondido e cancela o follow-up pendente. Configure depois `META_WEBHOOK_VERIFY_TOKEN` e `META_APP_SECRET` como secrets.

Teste local: `npm run worker:dev`. O D1 local usa as mesmas migrations. Teste o cron pelo endpoint de scheduled handler exposto pelo Wrangler.

Sem os secrets da Meta, o Worker continua aceitando e persistindo leads, responde `202` com `received` e mantém a caixa de saída para processamento futuro. Isso permite ativar e validar a infraestrutura antes de conectar o WhatsApp. `meta_failed` é reservado para falhas reais depois da ativação.
