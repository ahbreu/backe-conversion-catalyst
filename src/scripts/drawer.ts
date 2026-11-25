/**
 * Gaveta do formulário.
 * - Os links para #diagnostico abrem a gaveta quando o visitante já passou da seção do formulário
 *   (a barra fixa do celular abre sempre). Antes disso, rolam até a seção normalmente.
 * - O MESMO cartão (com o <form>) é movido para dentro do <dialog> e devolvido ao fechar:
 *   o que já foi preenchido não se perde. Um espaço reservado segura a altura para a página não pular.
 * - <dialog> modal: foco preso dentro, Esc fecha, o foco volta ao botão que abriu.
 * - Celular: fecha arrastando a alça para baixo, tocando fora ou no X.
 */
import { track } from '../lib/tracking';

const dlg = document.querySelector<HTMLDialogElement>('[data-drawer]');
const sheet = dlg?.querySelector<HTMLElement>('[data-drawer-sheet]');
const body = dlg?.querySelector<HTMLElement>('[data-drawer-body]');
const grab = dlg?.querySelector<HTMLElement>('[data-drawer-grab]');
const contact = document.querySelector<HTMLElement>('[data-contact]');
const card = contact?.querySelector<HTMLElement>('.card');

if (dlg && sheet && body && grab && contact && card && typeof dlg.showModal === 'function') {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let opener: HTMLElement | null = null;
  let holder: HTMLElement | null = null;
  let closing = false;

  const pastForm = () => contact.getBoundingClientRect().bottom < 0;

  const open = (from: HTMLElement | null) => {
    if (dlg.open) return;
    opener = from;
    holder = document.createElement('div');
    holder.className = 'card-holder';
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = `grid-area:card;height:${card.offsetHeight}px`;
    card.before(holder);
    body.append(card);
    card.dispatchEvent(new CustomEvent('form:moved', { bubbles: true }));
    dlg.style.setProperty('--sheet-y', '0px');
    dlg.showModal();
    document.documentElement.classList.add('drawer-open');
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')));
    window.dispatchEvent(new Event('drawer:open'));
    track('form_open', { form: 'diagnostico', origem: from?.dataset.cta || 'link' });
  };

  const close = () => {
    if (!dlg.open || closing) return;
    closing = true;
    dlg.classList.remove('is-open');
    setTimeout(() => dlg.close(), reduce ? 0 : 380);
  };

  dlg.addEventListener('close', () => {
    closing = false;
    dlg.classList.remove('is-open', 'is-dragging');
    if (holder) {
      holder.replaceWith(card);
      holder = null;
      card.dispatchEvent(new CustomEvent('form:moved', { bubbles: true }));
    }
    document.documentElement.classList.remove('drawer-open');
    window.dispatchEvent(new Event('drawer:close'));
    opener?.focus({ preventScroll: true });
    opener = null;
  });
  // Esc: fecha com a animação
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  // toque fora da folha (no fundo escurecido)
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });
  dlg.querySelector('[data-drawer-close]')?.addEventListener('click', close);

  // arrastar a alça para baixo (celular)
  let y0 = 0;
  let t0 = 0;
  let dy = 0;
  let dragging = false;
  grab.addEventListener('pointerdown', (e) => {
    if (matchMedia('(min-width: 901px)').matches || (e.target as Element).closest('[data-drawer-close]')) return;
    dragging = true;
    y0 = e.clientY;
    t0 = performance.now();
    dy = 0;
    grab.setPointerCapture(e.pointerId);
    dlg.classList.add('is-dragging');
  });
  grab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - y0);
    dlg.style.setProperty('--sheet-y', `${dy}px`);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    dlg.classList.remove('is-dragging');
    const speed = dy / Math.max(1, performance.now() - t0);
    if (dy > Math.min(140, sheet.offsetHeight * 0.25) || speed > 0.6) close();
    else dlg.style.setProperty('--sheet-y', '0px');
  };
  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);

  // links para o formulário (fase de captura: decide antes da rolagem suave e da âncora)
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href="#diagnostico"]');
      if (!a || dlg.open) return;
      const bar = !!a.closest('[data-mobile-cta]');
      if (!bar && !pastForm()) return;
      e.preventDefault();
      open(a);
    },
    true,
  );
}
