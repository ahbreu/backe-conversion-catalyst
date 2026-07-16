# Mapa de analytics da landing page

O site usa duas camadas complementares:

- Cloudflare Web Analytics para audiência agregada e Core Web Vitals, sem cookies.
- Meta Pixel para a jornada comercial, somente após consentimento de marketing.

## Eventos do Meta Pixel

| Evento | Disparo | Parâmetros permitidos |
| --- | --- | --- |
| `PageView` | Pixel ativado após consentimento | Nenhum |
| `section_view` | 45% da seção fica visível pela primeira vez | `section` |
| `cta_click` | CTA leva a outra seção ou ao formulário | `source`, `destination` |
| `service_filter` | Filtro de serviços é selecionado | `category` |
| `service_card_flip` | Carta é virada para mostrar o benefício | `service`, `face` |
| `service_interest` | CTA do verso da carta é acionado | `service` |
| `faq_open` | Pergunta é aberta | `position` |
| `form_start` | Primeiro foco no formulário | `form` |
| `form_step_complete` | Primeira etapa válida é concluída | `form`, `step` |
| `form_submit_attempt` | Envio final é tentado | `form` |
| `form_submit_error` | API não confirma o envio | `form` |
| `form_validation_error` | Uma etapa contém campos inválidos | `form`, `step` |
| `Lead` | Lead é persistido com sucesso | Nome público da conversão |
| `contact_whatsapp` | Saída para WhatsApp | `source` |
| `contact_instagram` | Saída para Instagram | `source` |

Nunca enviar nome, telefone, e-mail, empresa, nicho, faturamento, texto digitado, mensagem de erro da API ou identificadores internos do lead.

## Funil principal

`PageView → section_view(servicos) → service_card_flip → service_interest → form_start → form_step_complete → Lead`

O ID público do Pixel entra por `VITE_META_PIXEL_ID`. O token público do beacon da Cloudflare entra por `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN`.
