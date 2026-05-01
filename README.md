# BACKE Creative

Landing page institucional da BACKE Creative, feita com Vite, React, TypeScript e Tailwind CSS.

## Scripts

- `npm install`: instala as dependencias
- `npm run dev`: sobe o ambiente local
- `npm run build`: gera a versao de producao em `dist`

## Backend

O backend Express roda localmente na porta `3001` e recebe leads em `/api/leads`.

1. Copie `.env.example` para `.env.local` ou `backend/.env.example` para `backend/.env`.
2. Ajuste as variaveis se necessario:
   - `APP_ENV=sandbox`
   - `PORT=3001`
   - `FRONTEND_URL=http://localhost:8080`
   - `N8N_LEAD_CAPTURE_WEBHOOK_TEST_URL=https://groundedlungfish-n8n.cloudfy.live/webhook-test/sandbox/backe/lead-capture`
3. Inicie o servidor:

```sh
node backend/server.js
```

Endpoint disponivel:

- `POST /api/leads`
- `GET /api/cloudfy/health`

O backend valida, normaliza e encaminha leads para o webhook sandbox do Cloudfy/n8n. Para gravar um log local em `backend/data/leads.jsonl`, que esta ignorado pelo Git, defina `LOCAL_LEAD_LOG_ENABLED=true`.

## Cloudfy/n8n

Documentacao completa: [docs/cloudfy-n8n-integration.md](./docs/cloudfy-n8n-integration.md).

Workflow n8n versionado: [workflows/backe-lead-whatsapp.json](./workflows/backe-lead-whatsapp.json).

Guia de configuracao do workflow, PostgreSQL Cloudfy e Evolution API: [docs/n8n-backe-lead-whatsapp.md](./docs/n8n-backe-lead-whatsapp.md).

Scripts de teste:

```sh
npm run test:backend
npm run test:cloudfy
npm run test:lead
```

## Estrutura principal

- `src/App.tsx`: entrada da aplicacao
- `src/pages/Index.tsx`: composicao da landing page
- `src/components/*Section.tsx`: secoes visuais da pagina
- `src/components/ui/sonner.tsx`: toast global

## Deploy no GitHub Pages

O repositorio ja esta preparado para deploy automatico pelo workflow [deploy-pages.yml](./.github/workflows/deploy-pages.yml).

1. Faca push na branch `main`.
2. No GitHub, abra `Settings > Pages`.
3. Em `Source`, selecione `GitHub Actions`.
4. Aguarde o workflow `Deploy GitHub Pages` terminar.

### Base path

O build usa a variavel `VITE_BASE_PATH`.

- Sem configurar nada, o workflow publica no caminho padrao do GitHub Pages do repositorio, como `/backe-conversion-catalyst/`.
- Para dominio proprio, configure a variavel do repositorio `VITE_BASE_PATH` com `/`.

## Dominio personalizado

Se o site for usar dominio proprio:

1. Crie a variavel `VITE_BASE_PATH` com o valor `/`.
2. Crie `PAGES_CNAME` com o dominio final, por exemplo `backe.com.br`.
3. Em `Settings > Pages`, informe o dominio personalizado.
4. Ajuste os registros DNS no provedor do dominio conforme instrucoes do GitHub Pages.
