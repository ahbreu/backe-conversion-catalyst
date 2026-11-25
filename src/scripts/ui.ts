import { startPixelIfAllowed, track } from '../lib/tracking';
import { asset } from '../lib/url';

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(s));

/* ───── Cabeçalho: fundo após rolar, esconde ao descer, volta ao subir ───── */
const header = $('[data-header]');
let lastY = window.scrollY;
let ticking = false;
function onScroll() {
  const y = window.scrollY;
  header?.classList.toggle('is-scrolled', y > 24);
  const menuOpen = header?.classList.contains('menu-open');
  if (!menuOpen) header?.classList.toggle('is-hidden', y > lastY && y > 400);
  lastY = y;
  ticking = false;
}
addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  },
  { passive: true },
);
onScroll();

/* nav ativa conforme a seção visível */
const navLinks = $$<HTMLAnchorElement>('.hdr__nav a');
const spy = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    }
  },
  { rootMargin: '-45% 0px -50% 0px' },
);
navLinks.forEach((a) => {
  const el = document.querySelector(a.getAttribute('href')!);
  if (el) spy.observe(el);
});

/* ───── Menu mobile ───── */
const toggle = $<HTMLButtonElement>('[data-menu-toggle]');
const menu = $('[data-menu]');
function setMenu(open: boolean) {
  if (!toggle || !menu) return;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.sr-only')!.textContent = open ? 'Fechar menu' : 'Abrir menu';
  menu.hidden = !open;
  header?.classList.toggle('menu-open', open);
  if (open) header?.classList.add('is-scrolled');
  document.body.style.overflow = open ? 'hidden' : '';
}
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
$$('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    toggle.focus();
  }
});

/* ───── Acordeão de serviços (um aberto por vez) ───── */
$$<HTMLButtonElement>('.front__btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.front')!;
    const willOpen = !item.classList.contains('is-open');
    $$('.front.is-open').forEach((o) => {
      o.classList.remove('is-open');
      o.querySelector('.front__btn')!.setAttribute('aria-expanded', 'false');
    });
    if (willOpen) {
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      track('service_open', { front: btn.dataset.front });
    }
  });
});

/* ───── FAQ ───── */
$$<HTMLButtonElement>('.qa__q').forEach((btn) => {
  btn.addEventListener('click', () => {
    const qa = btn.closest('.qa')!;
    const open = !qa.classList.contains('is-open');
    qa.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) track('faq_open', { question: btn.textContent?.trim().slice(0, 80) });
  });
});

/* ───── Luz que acompanha o cursor no hero (só ponteiro fino) ───── */
const hero = $('[data-hero]');
const light = $('[data-cursor-light]');
if (hero && light && matchMedia('(pointer: fine)').matches) {
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    light.style.setProperty('--mx', `${e.clientX - r.left}px`);
    light.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/* ───── Rastreamento de CTAs (não dispara para quem recusou) ───── */
document.addEventListener('click', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-cta]');
  if (!el) return;
  const src = el.dataset.cta!;
  if (src.includes('whatsapp')) track('contact_whatsapp', { source: src });
  else if (src.includes('instagram')) track('contact_instagram', { source: src });
  else track('cta_click', { source: src, destination: el.getAttribute('href') });
});

/* ───── Meta Pixel: por padrão só carrega com consentimento (aviso em components/Consent.astro);
   VITE_META_PIXEL_REQUIRE_CONSENT=false carrega para todos. Entra depois que a página terminou de abrir:
   os scripts do Meta (~0,5 s de processador no celular) não disputam a abertura da página. ───── */
const startPixel = () =>
  'requestIdleCallback' in window
    ? requestIdleCallback(() => startPixelIfAllowed(), { timeout: 1500 })
    : setTimeout(startPixelIfAllowed, 300);
if (document.readyState === 'complete') startPixel();
else addEventListener('load', startPixel, { once: true });

/* ───── Botões fixos: aparecem depois de rolar um pouco ─────
   WhatsApp acompanha a página inteira (celular e desktop). “Diagnóstico gratuito” (só celular) some perto do
   formulário e do rodapé. Usa IntersectionObserver num marcador do hero, então funciona também na prévia do app. */
const mcta = $('[data-mobile-cta]');
const mark = $('[data-hero-mark]');
if (mcta && hero && mark) {
  const contact = $('[data-contact]');
  const footer = $('footer');
  const main = $('.mcta__main', mcta);
  const wa = $('.mcta__wa', mcta);
  let moved = false;
  const near = new Set<Element>();
  const show = (el: HTMLElement | null, on: boolean) => {
    if (!el) return;
    el.setAttribute('aria-hidden', String(!on));
    el.tabIndex = on ? 0 : -1;
  };
  const update = () => {
    const free = moved;
    const cta = free && near.size === 0;
    mcta.classList.toggle('is-visible', free);
    mcta.classList.toggle('is-cta', cta);
    mcta.setAttribute('aria-hidden', String(!free));
    show(wa, free);
    show(main, cta);
  };
  new IntersectionObserver(([e]) => {
    moved = !e.isIntersecting && e.boundingClientRect.top < 0;
    hero.classList.toggle('is-moved', moved);
    update();
  }).observe(mark);
  const formObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => (e.isIntersecting ? near.add(e.target) : near.delete(e.target)));
      update();
    },
    { rootMargin: '0px 0px -15% 0px' },
  );
  if (contact) formObs.observe(contact);
  if (footer) formObs.observe(footer);
}

/* ───── Prints dos cases: ampliar ao clicar ───── */
const lb = document.querySelector<HTMLDialogElement>('[data-lightbox-dialog]');
const lbImg = lb?.querySelector<HTMLImageElement>('[data-lightbox-img]');
if (lb && lbImg) {
  document.querySelectorAll<HTMLButtonElement>('[data-lightbox]').forEach((b) =>
    b.addEventListener('click', () => {
      lbImg.src = b.dataset.lightbox!;
      lbImg.alt = b.dataset.lightboxAlt || '';
      lb.showModal();
      track('case_print_open', { src: b.dataset.lightbox });
    }),
  );
  lb.addEventListener('click', (e) => {
    if (e.target === lb) lb.close();
  });
}

/* ───── Máscara do hero com URL absoluta (vale em qualquer hospedagem/subpasta) ───── */
const heroEl = document.querySelector<HTMLElement>('[data-hero]');
heroEl?.style.setProperty('--mask', `url("${new URL(asset('backe-symbol.svg'), location.href).href}")`);

/* ───── Sempre abrir no topo (o navegador restauraria o meio de uma cena de scroll) ───── */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) scrollTo(0, 0);


/* ───── Botões: onda no ponto tocado e luz que segue o mouse ───── */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as Element).closest<HTMLElement>('.btn, .mcta__main');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const s = document.createElement('span');
      s.className = 'ripple';
      s.setAttribute('aria-hidden', 'true');
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    },
    { passive: true },
  );
}
if (matchMedia('(pointer: fine)').matches) {
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = (e.target as Element).closest<HTMLElement>('[data-spot], .btn--ghost');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
}
