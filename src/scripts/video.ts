/**
 * Vídeos do site: um módulo só para todos os [data-vbox].
 *
 * - A capa (<picture>) fica sempre por baixo; o vídeo só aparece (fade de 400 ms) quando dispara `playing`.
 * - A fonte é escolhida por JS (data-src-mobile / data-src-desktop), o que funciona em qualquer Android.
 * - Autoplay bloqueado (Modo de Pouca Energia do iPhone, alguns WebViews): play() rejeita ou o vídeo continua
 *   pausado 1,2 s depois de visível. Aí entra a escada de fallback, sem depender de toque:
 *     1. o mesmo MP4 num <img> (o Safari toca como GIF, mudo e em loop, mesmo no Modo de Pouca Energia);
 *     2. se o navegador não aceita MP4 em <img> (Chrome, Firefox): o loop curto em WebP animado (data-loop-webp-*);
 *     3. último recurso: a capa com o botão laranja de play (.needs-tap).
 *   O <img> fica dentro do mesmo wrapper, então herda a máscara do “b” no hero.
 * - Erro de carregamento → .is-error: o vídeo some e a capa continua.
 * - "Reduzir movimento" NÃO pausa vídeo (só desliga as animações de rolagem).
 *
 * Modos: data-vbox="hero" recebe a fonte depois do evento load; data-vbox="auto" recebe a fonte
 * quando está a uma tela de distância e toca/pausa conforme entra e sai da tela.
 */

const MOBILE = '(max-width: 900px)';

interface Box {
  el: HTMLElement;
  video: HTMLVideoElement;
  btn: HTMLButtonElement | null;
  visible: boolean;
  wantsPlay: boolean;
  /** fallback em andamento ou concluído (o <video> foi ou está sendo trocado por <img>) */
  fallback: 'none' | 'trying' | 'img' | 'tap';
  /** vigia de reprodução em andamento (ver watch) */
  watching?: boolean;
}

const boxes: Box[] = [];

function prepare(v: HTMLVideoElement) {
  // atributos E propriedades: o iOS olha os dois
  v.muted = true;
  v.defaultMuted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('muted', '');
  v.setAttribute('loop', '');
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
}

function setSource(b: Box) {
  const v = b.video;
  if (v.getAttribute('src')) return;
  const src = matchMedia(MOBILE).matches ? v.dataset.srcMobile : v.dataset.srcDesktop;
  if (!src) return;
  v.src = src;
  v.load();
}

function needTap(b: Box, on: boolean) {
  b.el.classList.toggle('needs-tap', on);
  if (b.btn) b.btn.hidden = !on;
}

/** Autoplay bloqueado: troca o <video> por <img> (MP4 → WebP animado → botão de play). */
function fallbackFor(b: Box) {
  if (b.fallback !== 'none' || b.el.classList.contains('is-error')) return;
  b.fallback = 'trying';
  const v = b.video;
  const mobile = matchMedia(MOBILE).matches;
  const mp4 = v.currentSrc || v.getAttribute('src') || (mobile ? v.dataset.srcMobile : v.dataset.srcDesktop);
  const webp = mobile ? v.dataset.loopWebpMobile : v.dataset.loopWebpDesktop;
  const img = new Image();
  img.className = 'vbox__video video-as-img';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.decoding = 'async';
  img.onload = () => {
    // o vídeo pode ter começado a tocar enquanto o <img> carregava (ex.: toque na página): fica o vídeo
    if (!v.paused && v.isConnected) {
      b.fallback = 'none';
      return;
    }
    v.pause();
    v.removeAttribute('src');
    v.load(); // solta a conexão do vídeo
    v.replaceWith(img);
    b.fallback = 'img';
    b.el.classList.add('is-playing', 'is-img');
    needTap(b, false);
  };
  img.onerror = () => {
    if (webp && img.src.indexOf(webp) === -1) {
      img.src = webp; // degrau 2: loop em WebP animado
      return;
    }
    b.fallback = 'tap'; // degrau 3: capa com o botão de play
    if (b.wantsPlay) needTap(b, true);
  };
  if (mp4) img.src = mp4; // degrau 1: MP4 dentro de <img>
  else if (webp) img.src = webp;
  else img.onerror(new Event('error'));
}

function blocked(b: Box) {
  if (b.fallback === 'none') fallbackFor(b);
  else if (b.fallback === 'tap') needTap(b, true);
}

function tryPlay(b: Box) {
  b.wantsPlay = true;
  if (b.el.classList.contains('is-error') || b.fallback === 'img') return;
  setSource(b);
  const v = b.video;
  v.muted = true;
  v.playsInline = true;
  let p: Promise<void> | undefined;
  try {
    p = v.play();
  } catch {
    blocked(b);
    return;
  }
  p?.catch((err: DOMException) => {
    // NotSupportedError = arquivo não carregou: fica a capa, sem botão
    if (err?.name === 'NotSupportedError' || b.el.classList.contains('is-error')) {
      b.el.classList.add('is-error');
      needTap(b, false);
      return;
    }
    // AbortError = a fonte mudou ou o vídeo foi pausado no meio: não é bloqueio
    if (err?.name !== 'AbortError' && b.wantsPlay) blocked(b);
  });
  watch(b);
}

/* Vigia: o Modo de Pouca Energia do iPhone às vezes não rejeita o play(): a promessa fica pendurada,
   volta AbortError ou o vídeo "toca" sem sair do lugar. Enquanto a caixa estiver na tela e devendo tocar,
   confere a cada 0,6 s (até ~5 s): se o vídeo segue parado ou o tempo não anda, entra o plano B. */
function watch(b: Box) {
  if (b.watching) return;
  b.watching = true;
  const v = b.video;
  let last = v.currentTime;
  let checks = 0;
  const tick = () => {
    checks++;
    const done = !b.wantsPlay || b.fallback !== 'none' || b.el.classList.contains('is-error') || !v.isConnected;
    if (done) {
      b.watching = false;
      return;
    }
    const stuck = v.paused || (v.readyState >= 2 && v.currentTime === last);
    last = v.currentTime;
    if (b.visible && stuck && checks >= 2) {
      b.watching = false;
      blocked(b);
      return;
    }
    if (!stuck && checks >= 3) {
      b.watching = false; // tocando de verdade
      return;
    }
    if (checks < 9) window.setTimeout(tick, 600);
    else b.watching = false;
  };
  window.setTimeout(tick, 600);
}

function pause(b: Box) {
  b.wantsPlay = false;
  if (b.fallback !== 'img' && !b.video.paused) b.video.pause();
}

function init(el: HTMLElement) {
  const video = el.querySelector<HTMLVideoElement>('video');
  if (!video) return;
  prepare(video);
  const btn =
    el.querySelector<HTMLButtonElement>('.vbox__play') ||
    (el.id ? document.querySelector<HTMLButtonElement>(`[data-play-for="${el.id}"]`) : null);
  const b: Box = { el, video, btn, visible: false, wantsPlay: false, fallback: 'none' };
  boxes.push(b);

  video.addEventListener('playing', () => {
    el.classList.add('is-playing');
    needTap(b, false);
  });
  const fail = () => {
    el.classList.add('is-error');
    needTap(b, false);
  };
  video.addEventListener('error', fail);
  video.querySelectorAll('source').forEach((s) => s.addEventListener('error', fail));

  btn?.addEventListener('click', () => {
    setSource(b);
    b.wantsPlay = true;
    if (!video.isConnected) return;
    video.play().then(
      () => needTap(b, false),
      () => needTap(b, true),
    );
  });

  if (el.dataset.vbox === 'hero') {
    // o texto e a capa aparecem primeiro; o vídeo entra depois do load (dois rAF)
    const start = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (b.visible || el.getBoundingClientRect().top < innerHeight) tryPlay(b);
        }),
      );
    if (document.readyState === 'complete') start();
    else addEventListener('load', start, { once: true });
  }

  // fonte quando estiver a uma tela de distância (o hero recebe a dele no load)
  if (el.dataset.vbox !== 'hero') {
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        setSource(b);
      },
      { rootMargin: '100% 0px' },
    );
    near.observe(el);
  }

  // toca ao entrar na tela, pausa ao sair
  new IntersectionObserver(
    ([e]) => {
      b.visible = e.isIntersecting;
      if (e.isIntersecting) {
        if (el.dataset.vbox !== 'hero' || video.getAttribute('src')) tryPlay(b);
      } else pause(b);
    },
    { threshold: 0.12 },
  ).observe(el);
}

document.querySelectorAll<HTMLElement>('[data-vbox]').forEach(init);

// primeiro gesto na página: tenta de novo os vídeos visíveis que pediram toque
const retry = () =>
  boxes.forEach((b) => {
    if (b.visible && b.el.classList.contains('needs-tap')) tryPlay(b);
  });
['pointerdown', 'touchstart', 'touchend', 'click'].forEach((ev) =>
  addEventListener(ev, retry, { once: true, passive: true, capture: true }),
);
addEventListener('scroll', retry, { once: true, passive: true });
// ao voltar para a aba, retoma o que estava tocando
document.addEventListener('visibilitychange', () => {
  if (!document.hidden)
    boxes.forEach((b) => b.visible && b.wantsPlay && b.fallback === 'none' && b.video.paused && tryPlay(b));
});

export {};
