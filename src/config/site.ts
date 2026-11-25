/**
 * Configuração pública do site, lida das variáveis de build (VITE_*).
 *
 * Nada aqui é segredo: tudo vai para o HTML/JS público. Segredos ficam só no Worker (Wrangler).
 * Em produção os valores vêm das variáveis do repositório no GitHub (Settings → Variables),
 * repassadas pelo fluxo .github/workflows/deploy-pages.yml. Localmente, do arquivo .env.local.
 */

const env = import.meta.env;
const text = (v: unknown) => String(v ?? '').trim();

/** Endereço do Worker de leads (sem barra no final), ex.: https://backe-lead-proxy.backeco.workers.dev */
export const API_URL = text(env.VITE_API_URL).replace(/\/+$/, '');
export const LEAD_ENDPOINT = API_URL ? `${API_URL}/api/leads` : '';
/** Origem do Worker, liberada no connect-src da CSP. */
export const API_ORIGIN = (() => {
  try {
    return API_URL ? new URL(API_URL).origin : '';
  } catch {
    return '';
  }
})();

export const TURNSTILE_SITEKEY = text(env.VITE_TURNSTILE_SITE_KEY);
export const META_PIXEL_ID = text(env.VITE_META_PIXEL_ID);
export const CLOUDFLARE_WEB_ANALYTICS_TOKEN = text(env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN);

/**
 * Meta Pixel só depois do "Aceitar" no aviso de privacidade (padrão, recomendado pela LGPD).
 * "false" carrega o Pixel para todo visitante, sem perguntar.
 */
export const PIXEL_REQUIRES_CONSENT = text(env.VITE_META_PIXEL_REQUIRE_CONSENT || 'true').toLowerCase() !== 'false';

/** WhatsApp público da Backe, só dígitos com DDI (ex.: 5561999999999). */
export const WHATSAPP_NUMBER = text(env.VITE_PUBLIC_WHATSAPP_PHONE).replace(/\D/g, '');
export const WHATSAPP_MESSAGE =
  text(env.VITE_PUBLIC_WHATSAPP_MESSAGE) || 'Olá! Vim pelo site da BACKE.co e gostaria de saber mais.';
export const CONTACT_EMAIL = text(env.VITE_PUBLIC_CONTACT_EMAIL);

/** "+55 61 99999-9999" para exibição e "+5561999999999" para dados estruturados. */
export const WHATSAPP_E164 = WHATSAPP_NUMBER ? `+${WHATSAPP_NUMBER}` : '';
