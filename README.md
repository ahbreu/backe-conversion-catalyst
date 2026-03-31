# BACKE Creative

Landing page institucional da BACKE Creative, feita com Vite, React, TypeScript e Tailwind CSS.

## Scripts

- `npm install`: instala as dependencias
- `npm run dev`: sobe o ambiente local
- `npm run build`: gera a versao de producao em `dist`
- `npm test`: roda os testes do Vitest

## Deploy no GitHub Pages

O repositório já está preparado para deploy automático pelo workflow [deploy-pages.yml](./.github/workflows/deploy-pages.yml).

1. Faça push na branch `main`.
2. No GitHub, abra `Settings > Pages`.
3. Em `Source`, selecione `GitHub Actions`.
4. Aguarde o workflow `Deploy GitHub Pages` terminar.

### Base path

O build usa a variável `VITE_BASE_PATH`.

- Sem configurar nada, o workflow publica no caminho padrão do GitHub Pages do repositório, como `/backe-conversion-catalyst/`.
- Para domínio próprio, configure a variável do repositório `VITE_BASE_PATH` com `/`.

`BrowserRouter` também usa esse mesmo base path.

## Conectar o domínio comprado na Wix

Depois que o Pages estiver publicado:

1. No GitHub, abra `Settings > Secrets and variables > Actions > Variables`.
2. Crie `VITE_BASE_PATH` com o valor `/`.
3. Opcionalmente, crie `PAGES_CNAME` com o seu domínio, por exemplo `seudominio.com`.
4. No GitHub, abra `Settings > Pages` e informe seu domínio personalizado, se preferir fazer isso pela interface.
5. Na Wix, abra o gerenciamento de DNS do domínio.
6. Crie os registros `A` e `CNAME` exatamente como o GitHub indicar para o seu domínio.
7. Aguarde a propagação do DNS.

Quando o domínio da Wix estiver conectado, mantenha `VITE_BASE_PATH` em `/`.
