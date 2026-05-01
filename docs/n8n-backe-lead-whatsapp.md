# Workflow n8n - BACKE.co Lead + PostgreSQL + WhatsApp

Este guia cobre o workflow versionado em [`workflows/backe-lead-whatsapp.json`](../workflows/backe-lead-whatsapp.json).

O objetivo do fluxo é receber leads do site, validar e normalizar os dados, salvar o registro no PostgreSQL da Cloudfy, enviar WhatsApp para cliente e vendedor pela Evolution API, atualizar o status do lead e responder ao site somente depois das etapas principais.

## Referências oficiais

- n8n Postgres node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/
- n8n Postgres credentials: https://docs.n8n.io/integrations/builtin/credentials/postgres/
- n8n Webhook node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- n8n HTTP Request node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- Cloudfy Host: https://www.cloudfy.host/

## Ordem do workflow

```text
Webhook - Receber Lead do Site
-> Code - Validar e Normalizar Lead
-> IF - Lead Valido?
   -> false: Respond - Erro Validacao
   -> true:
      -> Postgres - Criar Tabela Se Nao Existir
      -> Postgres - Salvar Lead
      -> HTTP - WhatsApp Cliente
      -> HTTP - Avisar Vendedor
      -> IF - WhatsApps Enviados?
         -> true:
            -> Postgres - Atualizar Status Envio
            -> Respond - Sucesso
         -> false:
            -> Postgres - Atualizar Erro Envio
            -> Respond - Erro Envio
```

Os nodes HTTP estão configurados com `retryOnFail: true`, `maxTries: 3` e `waitBetweenTries: 2000`.

## PostgreSQL na Cloudfy

A Cloudfy entrega a stack com n8n, Evolution API, PostgreSQL e Redis. Para localizar os dados do PostgreSQL:

1. Abra o painel da Cloudfy.
2. Entre na infra/stack da BACKE.co.
3. Localize o app ou seção de banco de dados PostgreSQL.
4. Copie host, porta, database, usuário e senha exibidos no painel.
5. Use esses dados apenas dentro do n8n Credentials ou em ambiente operacional seguro.

Nunca coloque host, usuário, senha ou database diretamente no JSON versionado do workflow.

## Criar a credential Postgres no n8n

1. Abra o n8n da Cloudfy.
2. Vá em `Credentials`.
3. Crie uma nova credential do tipo `Postgres`.
4. Nomeie exatamente como: `Postgres Cloudfy`.
5. Preencha host, database, user, password e port com os dados exibidos no painel da Cloudfy.
6. Configure SSL conforme a exigência da instância Cloudfy.
7. Salve a credential.
8. Depois de importar o workflow, associe essa credential aos nodes:
   - `Postgres - Criar Tabela Se Nao Existir`
   - `Postgres - Salvar Lead`
   - `Postgres - Atualizar Status Envio`
   - `Postgres - Atualizar Erro Envio`

O n8n documenta que o Postgres credential precisa de host, database, usuário, senha, porta e opções de SSL. O workflow usa apenas o placeholder de credential `Postgres Cloudfy`, sem senha versionada.

## Importar o workflow

1. No n8n, abra `Workflows`.
2. Use a opção de importar workflow por arquivo.
3. Selecione `workflows/backe-lead-whatsapp.json`.
4. Confirme se a credential `Postgres Cloudfy` ficou associada aos nodes Postgres.
5. Configure os nodes `HTTP - WhatsApp Cliente` e `HTTP - Avisar Vendedor`.
6. Ative o workflow quando o teste manual estiver passando.

O Webhook node está configurado para responder usando nodes `Respond to Webhook`. Isso permite que o site receba erro de validação, erro de envio ou sucesso de forma explícita.

## Rotas corretas

Use estas rotas ao montar e testar o fluxo:

| Uso | Método | Rota |
| --- | --- | --- |
| Frontend -> backend local | `POST` | `http://localhost:3001/api/leads` |
| Health do backend local | `GET` | `http://localhost:3001/health` |
| Health Cloudfy via backend | `GET` | `http://localhost:3001/api/cloudfy/health` |
| n8n lead capture teste | `POST` | `https://groundedlungfish-n8n.cloudfy.live/webhook-test/sandbox/backe/lead-capture` |
| n8n lead capture produção | `POST` | `https://groundedlungfish-n8n.cloudfy.live/webhook/sandbox/backe/lead-capture` |
| n8n healthcheck teste | `GET` | `https://groundedlungfish-n8n.cloudfy.live/webhook-test/sandbox/backe/healthcheck` |
| n8n healthcheck produção | `GET` | `https://groundedlungfish-n8n.cloudfy.live/webhook/sandbox/backe/healthcheck` |
| Evolution API send text | `POST` | `{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}` |

No site local, `VITE_API_URL` deve apontar para `http://localhost:3001`. O frontend nunca chama o n8n diretamente; ele sempre chama o backend primeiro.

## Configurar Evolution API

Os nodes HTTP usam expressões com placeholders operacionais:

- `EVOLUTION_DRY_RUN`
- `EVOLUTION_API_URL`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_API_KEY`
- `DEFAULT_SELLER_PHONE`

Para teste sem disparar mensagens reais, defina `EVOLUTION_DRY_RUN=true` no ambiente do n8n. O fluxo vai salvar o lead no PostgreSQL, simular os dois envios e atualizar o status como `whatsapp_enviado`.

Para produção, defina `EVOLUTION_DRY_RUN=false` ou remova a variável, configure os valores reais no ambiente do n8n ou substitua manualmente nos nodes antes de ativar o fluxo. Não coloque a chave da Evolution API no frontend.

Endpoint usado pelos nodes:

```text
POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}
```

Body enviado ao cliente:

```json
{
  "number": "telefone_normalizado",
  "text": "mensagem de confirmação"
}
```

Body enviado ao vendedor:

```json
{
  "number": "telefone_do_vendedor",
  "text": "resumo do lead com ID, nome, WhatsApp, email, empresa, interesse e origem"
}
```

## Tabela criada pelo workflow

Durante o desenvolvimento, o node `Postgres - Criar Tabela Se Nao Existir` mantém a criação da tabela dentro do fluxo:

```sql
CREATE TABLE IF NOT EXISTS public.leads_site (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  servico TEXT DEFAULT 'outro',
  mensagem TEXT,
  origem JSONB DEFAULT '{}'::jsonb,
  consentimento JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'novo',
  whatsapp_cliente_enviado BOOLEAN DEFAULT false,
  whatsapp_vendedor_enviado BOOLEAN DEFAULT false,
  erro_envio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_site_telefone ON public.leads_site (telefone);
CREATE INDEX IF NOT EXISTS idx_leads_site_email ON public.leads_site (email);
CREATE INDEX IF NOT EXISTS idx_leads_site_created_at ON public.leads_site (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_site_status ON public.leads_site (status);
```

Depois que o fluxo estiver estável, podemos mover esse SQL para migration/documentação e deixar o workflow apenas inserindo leads.

## Segurança do insert

O node `Postgres - Salvar Lead` usa `Execute Query` com placeholders `$1` a `$9` e `Query Parameters` em `options.queryReplacement`.

Isso segue a recomendação do n8n para usar parâmetros sanitizados no Postgres node e reduz risco de SQL injection. O workflow não usa interpolação direta de strings do lead dentro do SQL de insert.

## Como executar um teste

1. No n8n, abra o workflow importado.
2. Clique em `Listen for test event` no Webhook.
3. No projeto local, configure `.env.local` com `N8N_LEAD_CAPTURE_WEBHOOK_TEST_URL` apontando para a URL de teste do Webhook.
4. Rode:

```sh
npm run test:lead
```

5. Confira a execução no n8n.
6. Confirme se os nodes Postgres e HTTP executaram.
7. Com `EVOLUTION_DRY_RUN=true`, confirme que o node `Code - Simular Envios WhatsApp` executou no lugar dos HTTP Request.
8. Se o teste passar, o response para o site deve conter:

```json
{
  "ok": true,
  "leadReceived": true,
  "leadId": "1",
  "message": "Lead received"
}
```

## Confirmar no banco

Use o cliente SQL disponível na Cloudfy ou uma conexão segura ao PostgreSQL e rode:

```sql
SELECT
  id,
  nome,
  telefone,
  email,
  servico,
  status,
  whatsapp_cliente_enviado,
  whatsapp_vendedor_enviado,
  created_at
FROM public.leads_site
ORDER BY created_at DESC
LIMIT 20;
```

Para investigar erro de envio:

```sql
SELECT
  id,
  nome,
  telefone,
  status,
  erro_envio,
  updated_at
FROM public.leads_site
WHERE status = 'erro_envio'
ORDER BY updated_at DESC
LIMIT 20;
```

## Checklist de aceite

- O workflow cria `public.leads_site` se a tabela não existir.
- O workflow salva o lead antes de enviar WhatsApp.
- O `lead_id` retornado pelo insert fica disponível para mensagens, status e resposta ao site.
- O workflow envia mensagem para o cliente.
- O workflow envia mensagem para o vendedor.
- O workflow atualiza `status = 'whatsapp_enviado'` depois dos dois envios.
- Se algum envio falhar, o workflow atualiza `status = 'erro_envio'` e preenche `erro_envio`.
- O workflow retorna sucesso para o site somente depois de salvar o lead e concluir as etapas principais.
- Nenhum dado sensível do PostgreSQL aparece no frontend.
- Nenhuma senha do banco aparece no JSON versionado.
- A credential Postgres fica configurada no n8n com o nome `Postgres Cloudfy`.
