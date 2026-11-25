/**
 * Movimento leve que roda de imediato. As cenas guiadas pelo scroll (GSAP)
 * são carregadas sob demanda em `scenes.ts`, fora do caminho crítico.
 */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(s));

/* ───── Revelação ao entrar na tela ───── */
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
);
$$('[data-reveal], [data-card], [data-img]').forEach((el) => io.observe(el));

/* ───── Contadores (sem biblioteca) ───── */
function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count);
  const dec = Number(el.dataset.decimals || 0);
  const t0 = performance.now();
  const dur = 1800;
  const tick = (t: number) => {
    const k = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 4);
    const v = target * eased;
    // vírgula decimal (3,8) e ponto de milhar, como no resto do site
    el.textContent = v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const cio = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        countUp(e.target as HTMLElement);
        cio.unobserve(e.target);
      }
    }
  },
  { threshold: 0.6 },
);

if (reduce) {
  $$('.proc [data-step]').forEach((s) => s.classList.add('is-active'));
} else {
  $$('[data-count]').forEach((el) => cio.observe(el));
  // as cenas (GSAP) só carregam depois que a página terminou de abrir e o navegador está livre
  const loadScenes = () => import('./scenes').then((m) => m.default());
  const start = () => ('requestIdleCallback' in window ? requestIdleCallback(loadScenes, { timeout: 1200 }) : setTimeout(loadScenes, 300));
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
}
