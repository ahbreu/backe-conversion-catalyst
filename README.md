# BACKE Creative

Landing page institucional da BACKE Creative, focada em conversão e captura confiável de leads.

## Stack

- Vite, React 18, TypeScript e Tailwind no frontend.
- Express para desenvolvimento local.
- Cloudflare Worker + D1 + Workflows + Cron Trigger em produção.
- API oficial do WhatsApp Cloud da Meta para contato automático.
- GitHub Pages para hospedar o site.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

Frontend: `http://localhost:8080`. Backend: `http://localhost:3001`.

Rotas do backend:

- `POST /api/leads`
- `GET /health`
- `GET /api/local-leads/health`
- `GET /api/meta/health`

No ambiente local, leads são persistidos em SQLite antes do envio para a Meta. O caminho padrão fica fora do repositório, em `~/.backe/lead-db/leads.sqlite` no Linux/macOS.

Estados do pipeline: `received`, `processing`, `meta_sent` e `meta_failed`. O Workflow durável aguarda horário comercial, distribui o lead, registra entrega/resposta e executa follow-up aprovado. Uma indisponibilidade da Meta não transforma um lead persistido em erro para o visitante.

## Produção

O site permanece no GitHub Pages. A variável do repositório `VITE_API_URL` deve apontar para o Worker apenas depois que D1, secrets, template e healthchecks estiverem validados.

Veja:

- [Worker e configuração](./worker/README.md)
- [Runbook de produção](./docs/production-cloudflare-worker.md)

Segredos obrigatórios no Worker:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`

O template e idioma são configurações públicas no `worker/wrangler.toml`. Tokens e PII nunca devem ser versionados ou expostos como `VITE_*`.

## Verificação

```bash
npm run lint
npm run test:backend
npm run build
npm run test:meta
npm run test:lead
```

Os dois últimos testes exigem backend/Worker configurado e em execução.
