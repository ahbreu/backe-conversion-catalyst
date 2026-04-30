# BACKE Creative

Landing page institucional da BACKE Creative, feita com Vite, React, TypeScript e Tailwind CSS.

## Scripts

- `npm install`: instala as dependencias
- `npm run dev`: sobe o ambiente local
- `npm run build`: gera a versao de producao em `dist`

## Backend

O backend roda localmente na porta `3001`.

1. Copie `backend/.env.example` para `backend/.env`.
2. Ajuste as variaveis se necessario:
   - `PORT=3001`
   - `FRONTEND_URL=http://localhost:8080`
3. Inicie o servidor:

```sh
node backend/server.js
```

Endpoint disponivel:

- `POST /api/leads`

Os leads recebidos sao persistidos localmente em `backend/data/leads.jsonl`.

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
