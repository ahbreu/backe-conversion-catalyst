const SITE_TOKEN = String(import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN || "").trim();
const SCRIPT_ID = "cloudflare-web-analytics";

export const initCloudflareWebAnalytics = () => {
  if (!SITE_TOKEN || typeof document === "undefined" || document.getElementById(SCRIPT_ID)) return false;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.dataset.cfBeacon = JSON.stringify({ token: SITE_TOKEN, spa: false });
  document.body.appendChild(script);
  return true;
};
