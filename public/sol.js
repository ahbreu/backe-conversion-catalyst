/*
 * Sol que percorre a página + pôr do sol do rodapé + cards de serviço acesos.
 * Script sem build (carregado com defer). Respeita prefers-reduced-motion.
 */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ───── O sol fixo ───── */
  var sol = null;
  // dentro de um quadro esticado (prévia no iPhone) elementos fixos não acompanham a tela: sem sol
  // celular: sem sol fixo (lá entram os nasceres do sol estáticos entre as seções)
  var desktop = window.matchMedia('(min-width: 901px)');
  if (!reduce && !doc.classList.contains('frame-tall')) {
    sol = document.createElement('div');
    sol.className = 'sol';
    sol.setAttribute('aria-hidden', 'true');
    // brilho externo, coroa e núcleo; a “respiração” fica no .sol__in
    sol.innerHTML = '<div class="sol__in"><i class="sol__glow"></i><i class="sol__corona"></i><i class="sol__core"></i></div>';
    document.body.appendChild(sol);
  }

  // posição absoluta (no documento) de uma borda de um elemento, mais um deslocamento em telas
  function at(sel, edge, offVh, vh) {
    var el = $(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return (edge === 'top' ? r.top : r.bottom) + window.scrollY + offVh * vh;
  }

  // roteiro: [seletor, borda, deslocamento em vh, x, y, opacidade]
  var ROTEIRO = [
    ['[data-hero]', 'bottom', -0.2, 0.5, 1.3, 0],
    ['#custo', 'top', -0.1, 0.14, 1.04, 0.5],
    ['#custo', 'bottom', -0.6, 0.16, 0.98, 0.6],
    // o formulário vem logo depois do custo e já tem o próprio sol: o que percorre a página apaga e volta depois dele
    ['#diagnostico', 'top', -0.2, 0.18, 0.96, 0],
    ['#diagnostico', 'bottom', -0.2, 0.2, 0.9, 0],
    ['#servicos', 'top', 0, 0.22, 0.8, 0.8],
    ['[data-sun-zenith]', 'top', -0.15, 0.5, 0.1, 1],
    ['[data-sun-zenith]', 'bottom', -0.5, 0.56, 0.1, 0.8],
    ['#resultados', 'top', 0.2, 0.8, 0.24, 0.9],
    ['#resultados', 'bottom', -1, 0.88, 0.5, 0.75],
    // a partir daqui quem assume é o sol do Método
    ['#metodo', 'top', -0.1, 0.94, 0.8, 0],
  ];

  function sunState(y, vh) {
    var pts = [];
    for (var i = 0; i < ROTEIRO.length; i++) {
      var k = ROTEIRO[i];
      var p = at(k[0], k[1], k[2], vh);
      if (p !== null) pts.push({ p: p, x: k[3], y: k[4], o: k[5] });
    }
    if (!pts.length) return null;
    pts.sort(function (a, b) { return a.p - b.p; });
    if (y <= pts[0].p) return pts[0];
    var last = pts[pts.length - 1];
    if (y >= last.p) return last;
    for (var j = 0; j < pts.length - 1; j++) {
      var a = pts[j], b = pts[j + 1];
      if (y >= a.p && y <= b.p) {
        var t = easeInOut(b.p === a.p ? 1 : (y - a.p) / (b.p - a.p));
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), o: lerp(a.o, b.o, t) };
      }
    }
    return last;
  }

  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-fcard]'));
  var footer = $('footer');
  // manifesto do Custo: cada linha liga (.on) quando o topo passa da fração da tela em data-mani
  var mani = Array.prototype.slice.call(document.querySelectorAll('[data-mani]'));
  var contact = $('#diagnostico');

  // Prévia embutida (quadro esticado na altura da página): quem rola é o app, então a posição de rolagem
  // não muda. Aí manifesto, cards e sóis seguem o IntersectionObserver, que enxerga a tela de verdade.
  var tall = doc.classList.contains('frame-tall') && 'IntersectionObserver' in window;
  if (tall) {
    var sh = parseFloat(getComputedStyle(doc).getPropertyValue('--sh')) || screen.height || 844;
    var steps = [];
    for (var k = 0; k <= 20; k++) steps.push(k / 20);
    var maniBox = $('.mani');
    var maniDone = false;
    var tio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var el = e.target;
          var seen = e.isIntersecting ? e.intersectionRect.height : 0;
          if (el === maniBox) {
            // manifesto inteiro na tela: as linhas acendem uma a uma
            if (!maniDone && seen > Math.min(el.offsetHeight * 0.8, sh * 0.5)) {
              maniDone = true;
              mani.forEach(function (m, i) {
                setTimeout(function () {
                  m.classList.add('on');
                }, reduce ? 0 : 250 + i * 450);
              });
            }
          } else if (el === contact) {
            contact.style.setProperty('--rise', reduce ? '1' : easeInOut(clamp(seen / (sh * 0.7), 0, 1)).toFixed(3));
          } else if (el === footer) {
            footer.style.setProperty('--set', reduce ? '1' : clamp(seen / (sh * 0.85), 0, 1).toFixed(3));
          } else {
            el.classList.toggle('is-lit', seen > Math.min(el.offsetHeight * 0.5, sh * 0.38));
          }
        });
      },
      { threshold: steps },
    );
    cards.forEach(function (c) {
      tio.observe(c);
    });
    if (maniBox) tio.observe(maniBox);
    if (contact) tio.observe(contact);
    if (footer) tio.observe(footer);
  }

  function update() {
    ticking = false;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (tall) return;

    if (sol && desktop.matches) {
      var s = sunState(window.scrollY, vh);
      if (s) {
        var size = Math.max(vw, vh) * 0.78;
        var x = s.x;
        var y = s.y;
        var o = s.o;
        sol.style.transform = 'translate3d(' + (x * vw - size / 2) + 'px,' + (y * vh - size / 2) + 'px,0)';
        sol.style.opacity = o.toFixed(3);
      }
    }

    // cards de serviço acendem quando o topo passa de 62% da tela
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('is-lit', cards[i].getBoundingClientRect().top < vh * 0.62);
    }

    // manifesto: alterna nos dois sentidos; com reduced-motion fica tudo no estado final
    for (var m = 0; m < mani.length; m++) {
      var at = parseFloat(mani[m].getAttribute('data-mani')) || 0.7;
      mani[m].classList.toggle('on', reduce || mani[m].getBoundingClientRect().top < vh * at);
    }

    // sol nascendo atrás do formulário: 0 com o topo da seção no pé da tela → 1 quando ela ocupa ~70% da tela
    if (contact) {
      var rise = reduce ? 1 : clamp((vh - contact.getBoundingClientRect().top) / (vh * 0.7), 0, 1);
      contact.style.setProperty('--rise', easeInOut(rise).toFixed(3));
    }

    // pôr do sol do rodapé: 0 com o topo do rodapé no pé da tela → 1 depois de ~85% da tela
    if (footer) {
      var set = reduce ? 1 : clamp((vh - footer.getBoundingClientRect().top) / (vh * 0.85), 0, 1);
      footer.style.setProperty('--set', set.toFixed(3));
    }
  }

  var ticking = false;
  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('load', request);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
  update();
})();
