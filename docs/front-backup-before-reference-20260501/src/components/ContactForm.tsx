import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ContactFormErrors,
  ContactLeadForm,
  normalizeLeadPayload,
  sanitizeContactForm,
  validateContactForm,
} from "@/lib/leadCapture";

const faturamentoOptions = [
  "Até R$ 10.000",
  "R$ 10.000 - R$ 50.000",
  "R$ 50.000 - R$ 100.000",
  "R$ 100.000 - R$ 500.000",
  "Acima de R$ 500.000",
] as const;

const interestOptions = [
  "Diagnóstico estratégico",
  "Gestão de Tráfego",
  "Identidade Visual e Design Gráfico",
  "Captação",
] as const;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SUCCESS_MESSAGE =
  "Recebemos sua solicitação. Um especialista da BACKE.co vai entrar em contato em breve.";
const ERROR_MESSAGE =
  "Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.";

const initialForm: ContactLeadForm = {
  nome: "",
  email: "",
  whatsapp: "",
  empresa: "",
  nicho: "",
  faturamento: "",
  interesse: "Diagnóstico estratégico",
  website: "",
};

type SubmitStatus = {
  type: "success" | "error";
  message: string;
} | null;

const ContactForm = () => {
  const [form, setForm] = useState<ContactLeadForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);

  const updateField = (field: keyof ContactLeadForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));

    if (fieldErrors[field]) {
      setFieldErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  useEffect(() => {
    const handleLeadInterest = (event: Event) => {
      const { serviceInterest } = (event as CustomEvent<{ serviceInterest?: string }>).detail || {};

      if (!serviceInterest) {
        return;
      }

      setForm((currentForm) => ({
        ...currentForm,
        interesse: serviceInterest,
      }));
    };

    window.addEventListener("backe:lead-interest", handleLeadInterest);

    return () => {
      window.removeEventListener("backe:lead-interest", handleLeadInterest);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedForm = sanitizeContactForm(form);
    const validation = validateContactForm(sanitizedForm);

    if (!validation.ok) {
      const message = validation.message || ERROR_MESSAGE;
      setFieldErrors(validation.fields);
      setSubmitStatus({ type: "error", message });
      toast.error(message);
      return;
    }

    try {
      setIsLoading(true);
      setFieldErrors({});
      setSubmitStatus(null);

      const response = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizeLeadPayload(sanitizedForm)),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || ERROR_MESSAGE);
      }

      toast.success(SUCCESS_MESSAGE);
      setSubmitStatus({ type: "success", message: SUCCESS_MESSAGE });
      setForm(initialForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGE;
      toast.error(message || ERROR_MESSAGE);
      setSubmitStatus({ type: "error", message: message || ERROR_MESSAGE });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="formulario" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <svg className="w-full h-full" viewBox="0 0 800 600" fill="none" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="formGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(14, 91%, 54%)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="600" fill="url(#formGlow)" />
          {Array.from({ length: 6 }).map((_, i) => (
            <circle
              key={i}
              cx={100 + i * 130}
              cy={300}
              r={80 + i * 20}
              stroke="hsl(14, 91%, 54%)"
              strokeWidth="0.3"
              fill="none"
              opacity="0.05"
            />
          ))}
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-6 md:px-16 max-w-3xl">
        <div className="border border-primary rounded-2xl p-8 md:p-12 bg-card/50 backdrop-blur-sm">
          <h2 className="text-foreground font-heading font-bold text-2xl md:text-3xl mb-2 text-center">
            Receba um diagnóstico estratégico
          </h2>
          <p className="text-muted-foreground text-center mb-10 font-body">
            Preencha abaixo e nossa equipe entrará em contato.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Site</label>
              <input
                id="website"
                type="text"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                autoComplete="off"
                tabIndex={-1}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Nome <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => updateField("nome", e.target.value)}
                placeholder="Seu nome completo"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={120}
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.nome)}
                aria-describedby={fieldErrors.nome ? "nome-error" : undefined}
              />
              {fieldErrors.nome && (
                <p id="nome-error" className="mt-2 font-body text-xs text-destructive">
                  {fieldErrors.nome}
                </p>
              )}
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={255}
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-2 font-body text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                WhatsApp <span className="text-primary">*</span>
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => updateField("whatsapp", e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={20}
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.whatsapp)}
                aria-describedby={fieldErrors.whatsapp ? "whatsapp-error" : undefined}
              />
              {fieldErrors.whatsapp && (
                <p id="whatsapp-error" className="mt-2 font-body text-xs text-destructive">
                  {fieldErrors.whatsapp}
                </p>
              )}
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Nome da empresa
              </label>
              <input
                type="text"
                value={form.empresa}
                onChange={(e) => updateField("empresa", e.target.value)}
                placeholder="Ex: BACKE.co"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={120}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Nicho da empresa
              </label>
              <input
                type="text"
                value={form.nicho}
                onChange={(e) => updateField("nicho", e.target.value)}
                placeholder="Ex: E-commerce, Saúde, Educação..."
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={120}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Interesse principal
              </label>
              <select
                value={form.interesse}
                onChange={(e) => updateField("interesse", e.target.value)}
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow appearance-none cursor-pointer"
                disabled={isLoading}
              >
                {interestOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Faturamento mensal
              </label>
              <select
                value={form.faturamento}
                onChange={(e) => updateField("faturamento", e.target.value)}
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow appearance-none cursor-pointer"
                disabled={isLoading}
              >
                <option value="">Selecione...</option>
                {faturamentoOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-brand text-primary-foreground font-heading font-semibold text-sm tracking-widest uppercase py-4 rounded-full glow-brand hover:glow-brand-hover transition-all duration-300 hover:scale-[1.02] mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Enviando..." : "Quero meu diagnóstico"}
            </button>

            {submitStatus && (
              <p
                role={submitStatus.type === "error" ? "alert" : "status"}
                className={`font-body text-sm leading-relaxed ${
                  submitStatus.type === "success" ? "text-primary" : "text-destructive"
                }`}
              >
                {submitStatus.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
