/** Cloudflare Turnstile — sitekey vem da configuração; action igual à validada pelo Worker. */
import { TURNSTILE_SITEKEY } from '../config/site';

const SCRIPT_ID = 'cloudflare-turnstile-script';

interface TurnstileApi {
  render(el: string | HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
  remove(id?: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;

export function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Turnstile unavailable'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export interface TurnstileHandle {
  reset(): void;
}

/** Renderiza o widget e entrega o token via callback ('' quando expira/falha). */
export async function mountTurnstile(
  el: HTMLElement,
  onToken: (token: string) => void,
): Promise<TurnstileHandle | null> {
  if (!TURNSTILE_SITEKEY) {
    onToken('');
    return null;
  }
  try {
    await loadTurnstile();
  } catch {
    onToken('');
    return null;
  }
  const api = window.turnstile!;
  const id = api.render(el, {
    sitekey: TURNSTILE_SITEKEY,
    action: 'lead_form',
    theme: 'dark',
    language: 'pt-br',
    callback: (t: string) => onToken(t),
    'expired-callback': () => onToken(''),
    'error-callback': () => onToken(''),
  });
  return { reset: () => api.reset(id) };
}
