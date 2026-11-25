/** Caminho de um arquivo de public/ respeitando o `base` do Astro (produção: '/', preview: '/sitebacke'). */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

/** URL pública absoluta (canonical, og:image). */
export function absolute(path = ''): string {
  return new URL(asset(path), import.meta.env.SITE).href;
}

export const IS_PREVIEW = import.meta.env.PUBLIC_PREVIEW === 'true';
