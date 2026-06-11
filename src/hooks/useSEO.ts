import { useEffect } from "react";

const DEFAULT_OG_IMAGE = "/og-image.svg";
const SITE_NAME = "BACKE.co";
const SCHEMA_ID = "schema-markup";

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  ogType?: string;
  schema?: Record<string, unknown> | Record<string, unknown>[];
}

function setMeta(nameAttr: string, nameValue: string, content: string) {
  const selector = `meta[${nameAttr}="${nameValue}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(nameAttr, nameValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

function setSchema(data: Record<string, unknown> | Record<string, unknown>[]) {
  let script = document.getElementById(SCHEMA_ID);
  if (!script) {
    script = document.createElement("script");
    script.id = SCHEMA_ID;
    script.setAttribute("type", "application/ld+json");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function clearSchema() {
  const script = document.getElementById(SCHEMA_ID);
  if (script) script.textContent = "";
}

const DEFAULTS: Record<string, string> = {
  title: "BACKE.co — Agência de Marketing Estratégico & Criativo",
  description: "Estratégia que conecta. Criatividade que converte. Agência de marketing digital, branding, tráfego pago, criação de sites e audiovisual para empresas que querem crescer.",
  ogTitle: "BACKE.co — Agência de Marketing Estratégico & Criativo",
  ogDescription: "Estratégia que conecta. Criatividade que converte. Agência de marketing digital, branding e performance.",
  ogUrl: "https://backe.co",
  ogImage: DEFAULT_OG_IMAGE,
  twitterTitle: "BACKE.co — Agência de Marketing Estratégico & Criativo",
  twitterDescription: "Estratégia que conecta. Criatividade que converte. Agência de marketing digital, branding e performance.",
  twitterImage: DEFAULT_OG_IMAGE,
  canonical: "https://backe.co",
};

export function useSEO({ title, description, canonicalUrl, ogImage, ogType, schema }: SEOProps) {
  useEffect(() => {
    const prev: Record<string, string> = {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") || DEFAULTS.description,
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") || DEFAULTS.ogTitle,
      ogDesc: document.querySelector('meta[property="og:description"]')?.getAttribute("content") || DEFAULTS.ogDescription,
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute("content") || DEFAULTS.ogUrl,
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || DEFAULTS.ogImage,
      twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") || DEFAULTS.twitterTitle,
      twitterDesc: document.querySelector('meta[name="twitter:description"]')?.getAttribute("content") || DEFAULTS.twitterDescription,
      twitterImage: document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || DEFAULTS.twitterImage,
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || DEFAULTS.canonical,
    };

    const img = ogImage || DEFAULT_OG_IMAGE;
    const url = canonicalUrl;

    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("property", "og:type", ogType || "website");
    setMeta("property", "og:locale", "pt_BR");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);
    setMeta("name", "twitter:card", "summary_large_image");

    setCanonical(url);

    if (schema) {
      setSchema(schema);
    }

    return () => {
      document.title = prev.title;
      setMeta("name", "description", prev.description);
      setMeta("property", "og:title", prev.ogTitle);
      setMeta("property", "og:description", prev.ogDesc);
      setMeta("property", "og:url", prev.ogUrl);
      setMeta("property", "og:image", prev.ogImage);
      setMeta("name", "twitter:title", prev.twitterTitle);
      setMeta("name", "twitter:description", prev.twitterDesc);
      setMeta("name", "twitter:image", prev.twitterImage);
      setCanonical(prev.canonical);
      clearSchema();
    };
  }, [title, description, canonicalUrl, ogImage, ogType, schema]);
}
