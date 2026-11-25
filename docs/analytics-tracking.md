# Mapa de analytics da landing page

O site usa duas camadas complementares:

- Cloudflare Web Analytics para audiência agregada e Core Web Vitals, sem cookies.
- Meta Pixel para a jornada comercial, somente após consentimento de marketing.

## Eventos do Meta Pixel

| Evento | Disparo | Parâmetros permitidos |
| --- | --- | --- |
| `PageView` | Pixel ativado após consentimento | Nenhum |
| `cta_click` | Clique em CTA (botões e links com `data-cta`) | `source`, `destination` |
| `service_open` | Card de serviço é aberto | `front` |
| `faq_open` | Pergunta é aberta | `question` (texto público da pergunta, até 80 caracteres) |
| `depoimento_play` | Depoimento em áudio é tocado | `cliente` |
| `case_print_open` | Print de resultado é ampliado | `src` |
| `form_open` | Gaveta do formulário é aberta | `form`, `origem` |
| `form_start` | Primeiro foco no formulário | `form` |
| `form_step_complete` | Etapa válida é concluída | `form`, `step` |
| `form_validation_error` | Uma etapa contém campos inválidos | `form`, `step` |
| `form_submit_attempt` | Envio final é tentado | `form` |
| `form_submit_error` | API não confirma o envio | `form` |
| `Lead` | API confirma o lead | Nome público da conversão |
| `contact_whatsapp` | Saída para WhatsApp | `source` |
| `contact_instagram` | Saída para Instagram | `source` |

Nunca enviar nome, telefone, e-mail, empresa, nicho, faturamento, texto digitado, mensagem de erro da API ou identificadores internos do lead.

## Funil principal

`PageView → cta_click / service_open → form_open → form_start → form_step_complete → Lead`

O ID público do Pixel entra por `VITE_META_PIXEL_ID`. O token público do beacon da Cloudflare entra por `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`.
