import {
  EMPTY_FORM,
  hasErrors,
  maskPhone,
  readUtm,
  submitLead,
  validateStep1,
  validateStep2,
  type FieldErrors,
  type LeadForm,
} from '../lib/lead';
import { loadTurnstile, mountTurnstile, type TurnstileHandle } from '../lib/turnstile';
import { track, trackLead } from '../lib/tracking';

const DRAFT_KEY = 'backe_form_draft';
// O servidor de leads e a verificação de segurança só aceitam o domínio oficial.
// Em qualquer outro endereço (prévia no claude.ai, testes) o envio é recusado; aí avisamos com clareza.
const SITE_HOST = new URL(import.meta.env.SITE).hostname.replace(/^www\./, '');
const OFFICIAL_HOST = location.hostname.replace(/^www\./, '') === SITE_HOST;
const PREVIEW_MSG =
  'Esta é uma prévia do site. Por segurança, o envio só funciona no endereço oficial, backe.com.br. Seus dados não foram enviados.';
const STEPS = [
  { name: 'sobre você', next: 'Continuar' },
  { name: 'sobre o seu negócio', next: 'Continuar' },
  { name: 'por onde começar', next: '' },
];

const form = document.querySelector<HTMLFormElement>('[data-form]');
if (form) init(form);

function init(form: HTMLFormElement) {
  const card = form.closest<HTMLElement>('.card')!;
  const stateEl = card.querySelector<HTMLElement>('[data-form-state]')!;
  const success = card.querySelector<HTMLElement>('[data-success]')!;
  const steps = Array.from(form.querySelectorAll<HTMLFieldSetElement>('[data-step]'));
  const nextBtn = form.querySelector<HTMLButtonElement>('[data-next]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const backBtn = form.querySelector<HTMLButtonElement>('[data-back]')!;
  const alertBox = form.querySelector<HTMLElement>('[data-alert]')!;
  const alertMsg = form.querySelector<HTMLElement>('[data-alert-msg]')!;
  const retryBtn = form.querySelector<HTMLButtonElement>('[data-retry]')!;
  const progressbar = card.querySelector<HTMLElement>('[data-progressbar]')!;
  const stepLabel = card.querySelector<HTMLElement>('[data-step-label]')!;
  const stepName = card.querySelector<HTMLElement>('[data-step-name]')!;
  const tsEl = form.querySelector<HTMLElement>('[data-turnstile]')!;

  let step = 1;
  let token = '';
  let ts: TurnstileHandle | null = null;
  let sending = false;
  let started = false;

  /* ── leitura / escrita do estado ── */
  const read = (): LeadForm => {
    const fd = new FormData(form);
    const v = (k: keyof LeadForm) => String(fd.get(k) ?? '');
    return {
      nome: v('nome'),
      email: v('email'),
      whatsapp: v('whatsapp'),
      empresa: v('empresa'),
      nicho: v('nicho'),
      faturamento: v('faturamento'),
      interesse: v('interesse') || EMPTY_FORM.interesse,
      website: v('website'),
    };
  };

  const saveDraft = () => {
    try {
      const { website: _hp, ...rest } = read();
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
  };

  const restoreDraft = () => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<LeadForm>;
      for (const [k, val] of Object.entries(d)) {
        if (!val) continue;
        const els = form.querySelectorAll<HTMLInputElement>(`[name="${k}"]`);
        els.forEach((el) => {
          if (el.type === 'radio') el.checked = el.value === val;
          else el.value = val;
        });
      }
    } catch {
      /* ignore */
    }
  };
  restoreDraft();

  /* ── erros ── */
  const showErrors = (errors: FieldErrors, fields: (keyof LeadForm)[]) => {
    for (const f of fields) {
      const msg = errors[f] ?? '';
      const errEl = form.querySelector<HTMLElement>(`[data-err="${f}"]`);
      if (errEl) errEl.textContent = msg;
      form.querySelectorAll<HTMLInputElement>(`[name="${f}"]`).forEach((el) => {
        if (el.type !== 'radio') el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      });
    }
  };
  const focusFirstError = (errors: FieldErrors) => {
    const first = Object.keys(errors)[0];
    if (!first) return;
    const el = form.querySelector<HTMLInputElement>(`[name="${first}"]`);
    el?.focus({ preventScroll: false });
  };
  const STEP_FIELDS: Record<number, (keyof LeadForm)[]> = {
    1: ['nome', 'whatsapp'],
    2: ['empresa', 'email', 'nicho', 'faturamento'],
  };
  const validate = (n: number) => (n === 1 ? validateStep1(read()) : n === 2 ? validateStep2(read()) : {});

  /* ── alerta geral ── */
  const setAlert = (msg: string | null, retry = false) => {
    alertBox.hidden = !msg;
    alertMsg.textContent = msg ?? '';
    retryBtn.hidden = !retry;
  };

  /* ── troca de etapa ── */
  const go = (n: number, dir: 1 | -1 = 1, focus = true) => {
    step = n;
    steps.forEach((s) => {
      const active = Number(s.dataset.step) === n;
      s.hidden = !active;
      s.classList.toggle('is-entering', active);
      s.style.setProperty('--dir', `${dir * 24}px`);
    });
    stepLabel.textContent = `Etapa ${n} de 3`;
    stepName.textContent = STEPS[n - 1].name;
    card.style.setProperty('--progress', String(Math.round((n / 3) * 100)));
    progressbar.setAttribute('aria-valuenow', String(n));
    backBtn.hidden = n === 1;
    nextBtn.hidden = n === 3;
    submitBtn.hidden = n !== 3;
    setAlert(null);
    if (n === 3) ensureTurnstile();
    const first = steps[n - 1].querySelector<HTMLInputElement>('input:not([type=radio])');
    if (focus && dir === 1 && first) setTimeout(() => first.focus({ preventScroll: true }), 50);
  };

  const ensureTurnstile = async () => {
    if (ts) return;
    ts = await mountTurnstile(tsEl, (t) => {
      token = t;
    });
    if (!ts)
      setAlert(
        OFFICIAL_HOST
          ? 'Não foi possível carregar a verificação de segurança. Recarregue a página ou fale conosco pelo WhatsApp.'
          : PREVIEW_MSG,
      );
  };

  nextBtn.addEventListener('click', () => {
    const errors = validate(step);
    showErrors(errors, STEP_FIELDS[step]);
    if (hasErrors(errors)) {
      track('form_validation_error', { form: 'diagnostico', step });
      focusFirstError(errors);
      return;
    }
    track('form_step_complete', { form: 'diagnostico', step });
    go(step + 1, 1);
  });
  backBtn.addEventListener('click', () => go(step - 1, -1));

  /* Enter nos campos de texto avança em vez de enviar */
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && step < 3 && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      nextBtn.click();
    }
  });

  /* ── máscara e validação “ao vivo” depois do primeiro erro ── */
  const phone = form.querySelector<HTMLInputElement>('[name="whatsapp"]')!;
  phone.addEventListener('input', () => {
    const pos = phone.selectionStart === phone.value.length;
    phone.value = maskPhone(phone.value);
    if (pos) phone.setSelectionRange(phone.value.length, phone.value.length);
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (!started) {
      started = true;
      track('form_start', { form: 'diagnostico' });
      loadTurnstile().catch(() => {});
    }
    saveDraft();
    const name = t.name as keyof LeadForm;
    const errEl = form.querySelector(`[data-err="${name}"]`);
    if (errEl?.textContent) {
      const errors = validate(step);
      showErrors(errors, [name]);
    }
  });
  form.addEventListener('change', saveDraft);

  /* ── serviços pré-selecionam o interesse ── */
  document.querySelectorAll<HTMLElement>('[data-interest]').forEach((a) =>
    a.addEventListener('click', () => {
      const wanted = a.dataset.interest!;
      const radios = Array.from(form.querySelectorAll<HTMLInputElement>('[name="interesse"]'));
      const match =
        radios.find((r) => r.value === wanted) ??
        radios.find((r) => wanted.toLowerCase().includes(r.value.split(' ')[0].toLowerCase()));
      if (match) match.checked = true;
      else {
        // serviço sem chip próprio (ex.: Design & Motion): cria a opção para não perder a intenção
        const label = document.createElement('label');
        label.className = 'chip';
        label.innerHTML = `<input type="radio" name="interesse" checked><span></span>`;
        label.querySelector('input')!.value = wanted;
        label.querySelector('span')!.textContent = wanted;
        form.querySelector('[data-step="3"] .chips')!.appendChild(label);
      }
      saveDraft();
    }),
  );

  /* ── envio ── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    track('form_submit_attempt', { form: 'diagnostico' });

    const data = read();
    const all = { ...validateStep1(data), ...validateStep2(data) };
    if (hasErrors(all)) {
      const s1 = hasErrors(validateStep1(data));
      go(s1 ? 1 : 2, -1);
      showErrors(all, [...STEP_FIELDS[1], ...STEP_FIELDS[2]]);
      focusFirstError(all);
      track('form_validation_error', { form: 'diagnostico', step: s1 ? 1 : 2 });
      return;
    }

    sending = true;
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    backBtn.disabled = true;
    submitBtn.querySelector('[data-submit-label]')!.textContent = 'Enviando…';
    setAlert(null);

    const result = await submitLead(data, token, {
      origin: location.origin,
      pathname: location.pathname,
      title: document.title,
      userAgent: navigator.userAgent || null,
      utm: readUtm(location.search, sessionStorage),
      now: new Date(),
    });

    sending = false;
    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;
    backBtn.disabled = false;
    submitBtn.querySelector('[data-submit-label]')!.textContent = 'Enviar e garantir meu diagnóstico';

    if (result.ok) {
      trackLead();
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      const first = data.nome.trim().split(/\s+/)[0];
      success.querySelector('[data-success-name]')!.textContent = first ? `, ${first}` : '';
      stateEl.hidden = true;
      success.hidden = false;
      success.focus();
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    track('form_submit_error', { form: 'diagnostico' });
    // o token do Turnstile é de uso único: renova para a próxima tentativa
    token = '';
    ts?.reset();
    if (OFFICIAL_HOST) setAlert(result.message, result.retryable);
    else setAlert(PREVIEW_MSG);
  });

  retryBtn.addEventListener('click', () => {
    setAlert(null);
    form.requestSubmit(submitBtn);
  });

  // a gaveta move o cartão de lugar: o iframe do Turnstile recarrega e o token antigo deixa de valer
  card.addEventListener('form:moved', () => {
    if (!ts) return;
    token = '';
    ts.reset();
  });

  go(1, 1, false);
}
