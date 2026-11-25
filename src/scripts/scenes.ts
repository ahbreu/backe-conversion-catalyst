import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { asset } from '../lib/url';

const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(s));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Chama `fn` uma vez quando o elemento aparece na tela. Usa IntersectionObserver e não a posição de rolagem:
 * dentro de uma prévia embutida (quadro esticado na altura da página, quem rola é o app) a rolagem da página
 * não muda, mas o observador continua enxergando a tela de verdade.
 */
const onSeen = (el: Element, fn: () => void, threshold = 0.2) => {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold },
  );
  io.observe(el);
};

/** Cenas guiadas pelo scroll. Carregado sob demanda por motion.ts (nunca com movimento reduzido). */
/** Devolve a vez ao navegador entre partes do trabalho (nenhuma tarefa longa travando o toque). */
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0));

export default async function scenes() {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const tallFrame = document.documentElement.classList.contains('frame-tall');
  const fine = matchMedia('(pointer: fine)').matches;

  /* ───── Rolagem suave (só mouse/trackpad; toque mantém o nativo) ───── */
  if (fine) {
    const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // gaveta do formulário aberta: a página por trás fica parada
    addEventListener('drawer:open', () => lenis.stop());
    addEventListener('drawer:close', () => lenis.start());
    document.addEventListener('click', (e) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || e.defaultPrevented) return;
      const id = a.getAttribute('href')!;
      const el = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
      if (!el) return;
      e.preventDefault();
      // a distância do topo já vem do scroll-padding-top do CSS (altura do cabeçalho + 16px)
      lenis.scrollTo(el);
      history.replaceState(null, '', id);
    });
  }

  await yieldToMain();
  /* ───── Hero: a câmera mergulha no disco do “b” até o vídeo tomar a tela ───── */
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (hero && !tallFrame) {
    const copy = hero.querySelector<HTMLElement>('[data-hero-copy]')!;
    const after = hero.querySelector<HTMLElement>('[data-hero-after]')!;
    const tint = hero.querySelector<HTMLElement>('.hero__tint');
    // miolo (onde está a frase) → ponto sólido do disco inferior
    const A0 = { x: 0.476, y: 0.613 };
    const A1 = { x: 232 / 504, y: 440 / 506 };
    const apply = (p: number) => {
      const vw = innerWidth;
      const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vh')) * 100 || innerHeight;
      const mobile = vw <= 900;
      const s0 = mobile ? vw * 1.24 : Math.max(vw * 1.04, vh * 1.68);
      const s1 = Math.max(vw, vh) * 9;
      const k = clamp(p / 0.62);
      const size = lerp(s0, s1, k * k * k);
      const m = clamp(k * 1.8);
      hero.style.setProperty('--S', `${size}px`);
      hero.style.setProperty('--axz', String(lerp(A0.x, A1.x, m)));
      hero.style.setProperty('--ayz', String(lerp(A0.y, A1.y, m)));
      hero.classList.toggle('is-open', k > 0.99);
      const c = 1 - clamp(p / 0.22);
      copy.style.opacity = String(c);
      copy.style.transform = `translateY(${(1 - c) * -40}px) scale(${1 - (1 - c) * 0.06})`;
      const a = clamp((p - 0.62) / 0.2);
      after.style.opacity = String(a);
      after.style.transform = `translateY(${(1 - a) * 40}px)`;
      tint?.style.setProperty('--tint', String(lerp(1, 1.6, a)));
    };
    apply(0);
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (st) => apply(st.progress) });
    addEventListener('resize', () => apply(0));
  }

  await yieldToMain();
  /* ───── Frentes: cada card empilha sobre o anterior, que recua ───── */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const cards = $$('[data-fcard]');
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.94,
        filter: 'brightness(0.6)',
        ease: 'none',
        scrollTrigger: { trigger: next, start: 'top 55%', end: 'top 15%', scrub: true },
      });
    });
  });

  await yieldToMain();
  /* ───── Método: o sol sobe a cada etapa ───── */
  const proc = document.querySelector<HTMLElement>('[data-process]');
  if (proc && tallFrame) {
    // quadro esticado: cada etapa acende ao aparecer e o sol sobe junto
    const sun = proc.querySelector<HTMLElement>('[data-proc-sun]');
    const steps = $$('[data-step]', proc);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.target.classList.toggle('is-active', e.intersectionRatio > 0.55));
        const n = steps.filter((s) => s.classList.contains('is-active')).length;
        const last = steps.reduce((m, s, i) => (s.classList.contains('is-active') ? i + 1 : m), 0);
        if (n) sun?.style.setProperty('--p', String(0.25 + (last / steps.length) * 0.75));
      },
      { threshold: [0, 0.55, 1] },
    );
    steps.forEach((s) => io.observe(s));
  } else if (proc) {
    const sun = proc.querySelector<HTMLElement>('[data-proc-sun]');
    ScrollTrigger.create({
      trigger: proc.querySelector('.proc__steps'),
      start: 'top 60%',
      end: 'bottom 60%',
      onUpdate: (st) => sun?.style.setProperty('--p', String(0.25 + st.progress * 0.75)),
    });
    $$('[data-step]', proc).forEach((s) =>
      ScrollTrigger.create({
        trigger: s,
        start: 'top 62%',
        end: 'bottom 38%',
        onToggle: (st) => s.classList.toggle('is-active', st.isActive),
      }),
    );
  }

  /* ───── Botões magnéticos (só mouse) ───── */
  if (fine) {
    $$('.btn--primary, [data-magnetic]').forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.18);
        qy((e.clientY - r.top - r.height / 2) * 0.3);
      });
      el.addEventListener('pointerleave', () => {
        qx(0);
        qy(0);
      });
    });
  }


  /* ───── Títulos entram palavra por palavra ao aparecer na tela ───── */
  // Cada título só é dividido em palavras quando está chegando perto da tela (antes eram os 35 de uma vez,
  // no carregamento, o que travava o celular por ~0,3 s). A animação é a mesma.
  await yieldToMain();
  document.fonts?.ready.then(() => {
    const heads = $$('main h2, .case__title').filter((el) => !el.closest('[data-hero]'));
    const prep = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          prep.unobserve(e.target);
          const el = e.target as HTMLElement;
          if (getComputedStyle(el).backgroundClip === 'text') continue; // texto com degradê não se divide bem
          const split = SplitText.create(el, { type: 'words,lines', mask: 'lines', linesClass: 'split-line' });
          const tween = gsap.from(split.words, {
            yPercent: 110,
            opacity: 0,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.04,
            paused: true,
          });
          onSeen(el, () => tween.play(), 0.35);
        }
      },
      { rootMargin: '0px 0px 60% 0px' },
    );
    heads.forEach((h) => prep.observe(h));
  });


  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
