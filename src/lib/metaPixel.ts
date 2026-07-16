const META_PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID || "").trim();
const SCRIPT_ID = "meta-pixel-script";

type MetaPixelFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

export const initMetaPixel = () => {
  if (!META_PIXEL_ID || typeof window === "undefined") return false;
  if (!window.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    }) as MetaPixelFunction;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }
  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  }
  return true;
};

export const trackMetaLead = () => {
  if (!window.fbq) return false;
  window.fbq("track", "Lead", { content_name: "Diagnóstico estratégico" });
  return true;
};

export const revokeMetaPixelConsent = () => {
  if (!window.fbq) return false;
  window.fbq("consent", "revoke");
  return true;
};

export const isMetaPixelConfigured = () => Boolean(META_PIXEL_ID);
