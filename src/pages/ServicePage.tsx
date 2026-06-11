import { FormEvent, useState } from "react";
import { toast } from "sonner";
import logoTransparent from "@/assets/logo-backe-transparent.png";
import {
  ContactFormErrors,
  ContactLeadForm,
  normalizeLeadPayload,
  sanitizeContactForm,
  validateContactForm,
} from "@/lib/leadCapture";
import { API_URL, assertApiUrl } from "@/config/api";
import { useSEO } from "@/hooks/useSEO";
import "../components/BackeLandingReference.css";

const PUBLIC_WHATSAPP_PHONE = String(import.meta.env.VITE_PUBLIC_WHATSAPP_PHONE || "").replace(/\D/g, "");

interface ServicePageProps {
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  schemaMarkup: Record<string, unknown>;
  heroTitle: string;
  heroSubtitle: string;
  features: { icon: string; title: string; description: string }[];
  faqItems: { question: string; answer: string }[];
  testimonial: { quote: string; author: string; role: string } | null;
  serviceInterest: string;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length > 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length > 0) return `(${digits}`;
  return "";
};

const initialForm: ContactLeadForm = {
  nome: "",
  email: "",
  whatsapp: "",
  empresa: "",
  nicho: "",
  faturamento: "",
  interesse: "Diagnóstico gratuito",
  website: "",
};

const ServicePage = ({
  title,
  metaDescription,
  canonicalUrl,
  schemaMarkup,
  heroTitle,
  heroSubtitle,
  features,
  faqItems,
  testimonial,
  serviceInterest,
}: ServicePageProps) => {
  const [form, setForm] = useState<ContactLeadForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState(-1);

  useSEO({
    title,
    description: metaDescription,
    canonicalUrl,
    schema: schemaMarkup,
  });

  const updateField = (field: keyof ContactLeadForm, value: string) => {
    const nextValue = field === "whatsapp" ? formatPhone(value) : value;
    setForm((current) => ({ ...current, [field]: nextValue }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const sanitized = sanitizeContactForm(form);
    const validation = validateContactForm(sanitized);
    const nextErrors = { ...validation.fields };

    if (!sanitized.email) nextErrors.email = "Informe seu e-mail.";
    if (!sanitized.empresa) nextErrors.empresa = "Informe sua empresa ou Instagram.";

    setFieldErrors(nextErrors);
    const firstError = nextErrors.nome || nextErrors.whatsapp || nextErrors.email || nextErrors.empresa;
    if (firstError) {
      toast.error(firstError);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage(null);
      if (!assertApiUrl()) throw new Error("Canal indisponível. Fale conosco pelo WhatsApp.");

      const formWithInterest = { ...sanitized, interesse: serviceInterest };
      const response = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeLeadPayload(formWithInterest)),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) throw new Error(data?.message || "Erro ao enviar. Tente novamente.");

      setIsSubmitted(true);
      toast.success("Recebemos sua solicitação. Um especialista da BACKE.co vai entrar em contato em breve.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar. Tente novamente ou fale pelo WhatsApp.";
      setSubmitMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappGeneralHref = PUBLIC_WHATSAPP_PHONE
    ? `https://wa.me/${PUBLIC_WHATSAPP_PHONE}?text=${encodeURIComponent("Olá! Vim pelo site da BACKE.co e gostaria de saber mais.")}`
    : null;

  return (
    <main className="backe-reference">
      <nav className="br-nav" aria-label="Navegação principal">
        <a className="br-nav-logo" href="/#" aria-label="BACKE.co">
          <img src={logoTransparent} alt="BACKE.co" />
        </a>
        <div className="br-nav-links">
          <a href="/#">Início</a>
          <a href="/#servicos">Serviços</a>
          <a href="/#contato">Contato</a>
        </div>
        <a className="br-btn-main" href="/#contato">
          Diagnóstico gratuito
        </a>
      </nav>

      <section className="br-hero service-hero">
        <div className="br-hero-glow" />
        <h1 className="br-fade">{heroTitle}</h1>
        <p className="br-hero-sub br-fade br-d2">{heroSubtitle}</p>
        <div className="br-hero-btns br-fade br-d3">
          <a className="br-btn-main br-btn-large" href="#formulario">
            Solicitar diagnóstico gratuito
          </a>
          <a className="br-btn-ghost" href="#funcionalidades">
            Ver funcionalidades
          </a>
        </div>
      </section>

      <section id="funcionalidades" className="br-section">
        <div className="br-wrap">
          <div className="br-label">Funcionalidades</div>
          <h2 className="br-title">
            Tudo que você precisa para
            <br />
            <span className="br-gradient-text">gerenciar seu negócio</span>
          </h2>
          <div className="br-service-grid">
            {features.map((feature) => (
              <article className="br-service-card" key={feature.title}>
                <div className="br-service-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {testimonial && (
        <section className="br-manifesto">
          <div className="br-manifesto-inner">
            <div>
              <div className="br-label">Case de sucesso</div>
              <p className="br-manifesto-quote">"{testimonial.quote}"</p>
            </div>
            <div className="br-manifesto-body">
              <p>
                <strong>{testimonial.author}</strong>
              </p>
              <p>{testimonial.role}</p>
            </div>
          </div>
        </section>
      )}

      <section id="faq" className="br-faq-section">
        <div className="br-wrap">
          <div className="br-label">Perguntas frequentes</div>
          <h2 className="br-title">
            Dúvidas comuns sobre
            <br />
            <span className="br-gradient-text">nossa solução</span>
          </h2>
          <div className="br-faq-list">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <article className="br-faq-item" key={item.question}>
                  <button
                    className={`br-faq-question ${isOpen ? "open" : ""}`}
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <span className="br-faq-icon">+</span>
                  </button>
                  <div className={`br-faq-answer ${isOpen ? "open" : ""}`}>{item.answer}</div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="formulario" className="br-contact-section">
        <div className="br-wrap">
          <div className="br-form-wrap">
            <div className="br-form-left">
              <div className="br-label">Vamos conversar</div>
              <h2 className="br-title">
                Pronto para transformar
                <br />
                <span className="br-gradient-text">seu negócio?</span>
              </h2>
              <p>
                Preencha o formulário. Um especialista da Backe entra em contato em até <strong>24 horas</strong> com um
                diagnóstico real do que pode ser feito no seu negócio agora.
              </p>
            </div>

            <form className="br-form-card" onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <input className="br-honeypot" type="text" value={form.website} onChange={(e) => updateField("website", e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" />

              {!isSubmitted ? (
                <>
                  <div className="br-field">
                    <label htmlFor="lead-name">Nome completo *</label>
                    <input
                      id="lead-name"
                      type="text"
                      value={form.nome}
                      onChange={(e) => updateField("nome", e.target.value)}
                      placeholder="Seu nome"
                      maxLength={120}
                      aria-invalid={Boolean(fieldErrors.nome)}
                    />
                    {fieldErrors.nome && <p className="br-field-error">{fieldErrors.nome}</p>}
                  </div>

                  <div className="br-field">
                    <label htmlFor="lead-phone">Telefone / WhatsApp *</label>
                    <input
                      id="lead-phone"
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => updateField("whatsapp", e.target.value)}
                      placeholder="(00) 90000-0000"
                      maxLength={16}
                      aria-invalid={Boolean(fieldErrors.whatsapp)}
                    />
                    {fieldErrors.whatsapp && <p className="br-field-error">{fieldErrors.whatsapp}</p>}
                  </div>

                  <div className="br-field">
                    <label htmlFor="lead-email">E-mail *</label>
                    <input
                      id="lead-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="voce@empresa.com"
                      maxLength={255}
                      aria-invalid={Boolean(fieldErrors.email)}
                    />
                    {fieldErrors.email && <p className="br-field-error">{fieldErrors.email}</p>}
                  </div>

                  <div className="br-field">
                    <label htmlFor="lead-company">Empresa / Instagram *</label>
                    <input
                      id="lead-company"
                      type="text"
                      value={form.empresa}
                      onChange={(e) => updateField("empresa", e.target.value)}
                      placeholder="@suamarca"
                      maxLength={120}
                      aria-invalid={Boolean(fieldErrors.empresa)}
                    />
                    {fieldErrors.empresa && <p className="br-field-error">{fieldErrors.empresa}</p>}
                  </div>

                  <button className="br-submit-btn" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Solicitar diagnóstico gratuito"}
                  </button>
                  {submitMessage && (
                    <div className="br-error-actions">
                      <p className="br-form-alert">{submitMessage}</p>
                      {whatsappGeneralHref && (
                        <a className="br-wpp-btn br-wpp-btn-inline" href={whatsappGeneralHref} target="_blank" rel="noreferrer">
                          Falar no WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  <p className="br-form-legal">Seus dados são protegidos e nunca serão compartilhados.</p>
                </>
              ) : (
                <div className="br-form-success">
                  <div className="br-success-icon">✓</div>
                  <h3>Recebemos tudo!</h3>
                  <p>Nossa equipe vai entrar em contato em até <strong>24 horas</strong>.</p>
                  <p className="br-success-muted">Confira seu e-mail e WhatsApp.</p>
                  {whatsappGeneralHref && (
                    <a className="br-wpp-btn" href={whatsappGeneralHref} target="_blank" rel="noreferrer">
                      Chamar no WhatsApp agora
                    </a>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      <footer className="br-footer">
        <img src={logoTransparent} alt="BACKE.co" />
        <p>© 2026 BACKE.co. Todos os direitos reservados.</p>
        <div className="br-foot-links">
          <a href="https://www.instagram.com/backe.co/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="/#">LinkedIn</a>
          {whatsappGeneralHref ? (
            <a href={whatsappGeneralHref} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : (
            <button type="button">WhatsApp</button>
          )}
        </div>
      </footer>
    </main>
  );
};

export default ServicePage;
