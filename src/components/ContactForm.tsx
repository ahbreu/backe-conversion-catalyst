import { useState } from "react";
import { toast } from "sonner";

const faturamentoOptions = [
  "Até R$ 10.000",
  "R$ 10.000 - R$ 50.000",
  "R$ 50.000 - R$ 100.000",
  "R$ 100.000 - R$ 500.000",
  "Acima de R$ 500.000",
] as const;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LeadForm = {
  nome: string;
  email: string;
  whatsapp: string;
  empresa: string;
  nicho: string;
  faturamento: string;
};

const initialForm: LeadForm = {
  nome: "",
  email: "",
  whatsapp: "",
  empresa: "",
  nicho: "",
  faturamento: "",
};

const sanitizeForm = (form: LeadForm): LeadForm => ({
  nome: form.nome.trim(),
  email: form.email.trim(),
  whatsapp: form.whatsapp.trim(),
  empresa: form.empresa.trim(),
  nicho: form.nicho.trim(),
  faturamento: form.faturamento.trim(),
});

const validateLeadForm = (form: LeadForm): string | null => {
  if (
    !form.nome ||
    !form.email ||
    !form.whatsapp ||
    !form.empresa ||
    !form.nicho ||
    !form.faturamento
  ) {
    return "Preencha todos os campos obrigatórios.";
  }

  if (!EMAIL_PATTERN.test(form.email)) {
    return "Informe um email válido.";
  }

  const phoneDigits = form.whatsapp.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return "Informe um WhatsApp válido.";
  }

  if (!faturamentoOptions.includes(form.faturamento as (typeof faturamentoOptions)[number])) {
    return "Selecione uma faixa de faturamento válida.";
  }

  return null;
};

const ContactForm = () => {
  const [form, setForm] = useState<LeadForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedForm = sanitizeForm(form);
    const validationError = validateLeadForm(sanitizedForm);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Erro ao enviar formulário.");
      }

      toast.success("Diagnóstico solicitado com sucesso!");
      setForm(initialForm);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o formulário.";
      toast.error(message);
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Nome <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Seu nome completo"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={100}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Email <span className="text-primary">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={255}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                WhatsApp <span className="text-primary">*</span>
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={20}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Nome da empresa <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                placeholder="Ex: BACKE Creative"
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={100}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Nicho da empresa <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={form.nicho}
                onChange={(e) => setForm({ ...form, nicho: e.target.value })}
                placeholder="Ex: E-commerce, Saúde, Educação..."
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground/50"
                maxLength={100}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-foreground font-heading font-medium text-sm mb-2 block">
                Faturamento mensal <span className="text-primary">*</span>
              </label>
              <select
                value={form.faturamento}
                onChange={(e) => setForm({ ...form, faturamento: e.target.value })}
                className="w-full bg-foreground text-background rounded-lg px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow appearance-none cursor-pointer"
                disabled={isLoading}
              >
                <option value="" disabled>
                  Selecione...
                </option>
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
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
