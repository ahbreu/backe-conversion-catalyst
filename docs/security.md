# Segurança da landing page e do pipeline de leads

## Controles aplicados

- O formulário aceita apenas `https://backe.com.br` e `https://www.backe.com.br` em produção.
- Requisições de lead sem `Origin` são recusadas em produção.
- Cloudflare Turnstile valida token, action e hostname; ausência do secret em produção bloqueia o envio.
- Rate limit distribuído usa D1 e armazena somente um hash do bucket de IP.
- O corpo JSON é limitado a 64 KiB; campos têm limites individuais e caracteres de controle são removidos.
- Empresa, ambiente, origem e identificador do formulário são definidos pelo servidor, não pelo cliente.
- A URL persistida não inclui query string ou fragmento, evitando gravar parâmetros sensíveis.
- Leads são persistidos antes da automação e deduplicados por SHA-256.
- Consultas D1/SQLite usam parâmetros vinculados.
- Webhooks da Meta exigem HMAC SHA-256 e são deduplicados por hash do evento.
- Rotas administrativas retornam 404 sem Bearer token válido e nunca expõem os leads.
- Tokens da Meta, Turnstile e administração ficam em secrets, nunca em variáveis Vite ou no Git.
- Logs de bloqueio não contêm IP, telefone, e-mail ou conteúdo do formulário.
- D1 remove leads após 180 dias; eventos de webhook são removidos após 30 dias.
- O banco local usa diretório `0700` e arquivo `0600` em sistemas compatíveis.
- A CSP restringe scripts a origens explícitas e hashes; o aplicativo não renderiza o formulário em frames externos.
- Actions são fixadas por SHA e o GitHub usa secret scanning, push protection e Dependabot.
- O deploy do Worker falha explicitamente se os secrets Cloudflare estiverem ausentes; nunca informa sucesso após pular a publicação.

## Dados públicos por projeto

`VITE_META_PIXEL_ID`, `VITE_TURNSTILE_SITE_KEY` e `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` são identificadores públicos próprios para código cliente. Nunca colocar chaves secretas em variáveis com prefixo `VITE_`.

## Risco residual e operação

- GitHub Pages não permite definir cabeçalhos HTTP personalizados. A CSP está no HTML e a proteção contra iframe também existe no aplicativo, mas a defesa ideal é servir o domínio por um proxy que aplique CSP/HSTS/X-Frame-Options como cabeçalhos.
- A branch `main` deve ser protegida quando houver ao menos outro aprovador ou um fluxo obrigatório por pull request.
- Rotacione imediatamente qualquer secret suspeito e revise acessos da conta Cloudflare, Meta e GitHub.
- Revise alertas do Dependabot e execuções de monitoramento; não aprove atualizações sem os testes do repositório.
