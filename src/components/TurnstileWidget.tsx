import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

type Props = {
  onToken: (token: string) => void;
  resetKey: number;
};

const SCRIPT_ID = "cloudflare-turnstile-script";

const loadTurnstile = () => new Promise<void>((resolve, reject) => {
  if (window.turnstile) return resolve();
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    existing.addEventListener("load", () => resolve(), { once: true });
    existing.addEventListener("error", () => reject(new Error("Turnstile unavailable")), { once: true });
    return;
  }
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Turnstile unavailable"));
  document.head.appendChild(script);
});

const TurnstileWidget = ({ onToken, resetKey }: Props) => {
  const id = `turnstile-${useId().replace(/:/g, "")}`;
  const widgetId = useRef<string | null>(null);
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!sitekey) return;
    let active = true;
    loadTurnstile().then(() => {
      if (!active || !window.turnstile) return;
      widgetId.current = window.turnstile.render(`#${id}`, {
        sitekey,
        action: "lead_form",
        theme: "dark",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    }).catch(() => onToken(""));
    return () => {
      active = false;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [id, onToken, sitekey]);

  useEffect(() => {
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (!sitekey) return null;
  return <div id={id} className="flex justify-center" />;
};

export default TurnstileWidget;
