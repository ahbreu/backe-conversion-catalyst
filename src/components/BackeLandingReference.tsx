import { FormEvent, useMemo, useState } from "react";
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
import "./BackeLandingReference.css";

const PUBLIC_WHATSAPP_PHONE = String(import.meta.env.VITE_PUBLIC_WHATSAPP_PHONE || "").replace(/\D/g, "");

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

const categories = [
  { id: "todos", label: "Todos" },
  { id: "digital", label: "Marketing Digital" },
  { id: "criativo", label: "Criação & Design" },
  { id: "audiovisual", label: "Audiovisual" },
  { id: "estrategia", label: "Estratégia" },
];

const services = [
  {
    category: "digital",
    categoryLabel: "Marketing Digital",
    icon: "ADS",
    title: "Tráfego Pago",
    description:
      "Gestão de campanhas no Meta Ads e Google Ads com foco em performance. Segmentamos o público certo, no momento certo, com o criativo certo. Chega de queimar verba.",
  },
  {
    category: "digital",
    categoryLabel: "Marketing Digital",
    icon: "SOC",
    title: "Gestão de Redes Sociais",
    description:
      "Calendário editorial estratégico, produção de conteúdo e gestão de comunidade. Transformamos seguidores em clientes com consistência e intenção de marca.",
  },
  {
    category: "estrategia",
    categoryLabel: "Estratégia",
    icon: "PER",
    title: "Estratégia & Performance",
    description:
      "Planejamento completo com metas claras, análise de dados, relatórios que fazem sentido e otimização constante para escalar o que realmente funciona.",
  },
  {
    category: "estrategia",
    categoryLabel: "Estratégia",
    icon: "VEN",
    title: "Treinamento & Capacitação de Vendas",
    description:
      "Preparamos seu time comercial com metodologias modernas, scripts de abordagem, técnicas de fechamento e inteligência de mercado para vender mais e melhor.",
  },
  {
    category: "criativo",
    categoryLabel: "Criação & Design",
    icon: "BRD",
    title: "Branding & Identidade Visual",
    description:
      "Criamos identidades visuais completas: logo, paleta, tipografia e brandbook. Sua marca passa a comunicar quem você é antes mesmo de abrir a boca.",
  },
  {
    category: "criativo",
    categoryLabel: "Criação & Design",
    icon: "DSN",
    title: "Design Gráfico & Motions",
    description:
      "Peças gráficas para digital e impresso, animações em motion graphics e vídeos animados. Conteúdo visual que comunica com impacto e retém atenção.",
  },
  {
    category: "criativo",
    categoryLabel: "Criação & Design",
    icon: "WEB",
    title: "Criação de Sites & Landing Pages",
    description:
      "Sites institucionais e landing pages otimizadas para conversão. Design responsivo, copy persuasivo e integração com ferramentas de automação e CRM.",
  },
  {
    category: "audiovisual",
    categoryLabel: "Audiovisual",
    icon: "VID",
    title: "Captação Audiovisual",
    description:
      "Produção de vídeos profissionais para campanhas, redes sociais e institucionais. Direção, gravação e edição com padrão de qualidade que eleva sua marca.",
  },
  {
    category: "audiovisual",
    categoryLabel: "Audiovisual",
    icon: "DRN",
    title: "Captação com Drone",
    description:
      "Imagens e vídeos aéreos de alta resolução para imóveis, eventos e campanhas de impacto. Perspectivas únicas que nenhuma câmera convencional consegue entregar.",
  },
];

const marqueeItems = [
  "Tráfego Pago",
  "Gestão de Redes",
  "Branding",
  "Captação Audiovisual",
  "Design Gráfico",
  "Drone",
  "Sites & Landing Pages",
  "Motion Graphics",
  "Capacitação de Vendas",
  "Performance",
];

const stats = [
  { value: "+200", label: "Marcas atendidas" },
  { value: "3.8x", label: "ROI médio entregue" },
  { value: "+R$5M", label: "Investido em mídia" },
  { value: "98%", label: "Clientes satisfeitos" },
];

const processSteps = [
  {
    number: "01",
    title: "Diagnóstico gratuito",
    description: "Mapeamos seu negócio, mercado e oportunidades reais. Sem compromisso, sem pressão de venda.",
  },
  {
    number: "02",
    title: "Plano personalizado",
    description: "Cada estratégia é construída do zero para o seu negócio. Nada de pacote padrão que serve pra todo mundo.",
  },
  {
    number: "03",
    title: "Execução com responsabilidade",
    description: "Time focado, prazo cumprido. Você acompanha tudo com transparência e em tempo real.",
  },
  {
    number: "04",
    title: "Crescimento sustentável",
    description: "Otimizamos continuamente. O objetivo é construir um motor de crescimento que trabalha por você.",
  },
];

const faqItems = [
  {
    question: "Quanto tempo leva para ver resultados?",
    answer:
      "Em tráfego pago, os primeiros dados já aparecem nos dias iniciais de campanha ativa. Porém, é entre 60 e 90 dias que a estratégia se consolida e os resultados começam a crescer de forma consistente.",
  },
  {
    question: "Vocês atendem fora de Brasília?",
    answer:
      "Sim. Atendemos clientes em qualquer lugar do Brasil e do mundo de forma remota. Para serviços presenciais como captação audiovisual e drone, alinhamos logística e deslocamento no escopo.",
  },
  {
    question: "Como funciona o contrato?",
    answer:
      "Trabalhamos com contratos mensais renováveis. Para serviços de gestão contínua, recomendamos um ciclo mínimo de 3 meses para a estratégia ter tempo de mostrar resultado real.",
  },
  {
    question: "Qual o investimento mínimo para começar?",
    answer:
      "Cada proposta é personalizada de acordo com escopo, nicho e objetivos. Na reunião de diagnóstico apresentamos uma proposta sob medida, com valores claros e sem surpresa.",
  },
  {
    question: "Como acompanho os resultados das campanhas?",
    answer:
      "Você acompanha relatórios mensais, principais indicadores e reuniões de alinhamento. Quando aplicável, também damos visibilidade das plataformas de mídia e automação.",
  },
  {
    question: "Vocês criam os criativos ou eu preciso fornecer?",
    answer:
      "Depende do escopo. Em projetos de criação, design ou audiovisual, cuidamos da produção. Em escopos só de gestão, entregamos roteiros, briefings e direcionamento criativo.",
  },
];

const nicheOptions = [
  "E-commerce",
  "Serviços / Consultoria",
  "Saúde e Bem-estar",
  "Educação / Infoprodutos",
  "Alimentação / Food",
  "Imobiliário",
  "Moda & Beleza",
  "Tecnologia / SaaS",
  "Varejo Físico",
  "Jurídico / Contábil",
  "Outro",
];

const revenueOptions = [
  "Ainda estou começando (pré-faturamento)",
  "Até R$ 10.000/mês",
  "R$ 10.000 - R$ 50.000/mês",
  "R$ 50.000 - R$ 150.000/mês",
  "R$ 150.000 - R$ 500.000/mês",
  "Acima de R$ 500.000/mês",
];

const checks = [
  "Diagnóstico 100% gratuito, sem compromisso",
  "Resposta garantida em até 24h úteis",
  "Estratégia personalizada para o seu nicho",
  "Time sênior, sem terceirização do atendimento",
  "Sem contrato de fidelidade forçada",
];

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length > 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length > 2) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length > 0) {
    return `(${digits}`;
  }

  return "";
};

const scrollToSection = (sectionId: string) => {
  const target = document.getElementById(sectionId);

  if (!target) {
    return;
  }

  const y = target.getBoundingClientRect().top + window.scrollY - 78;
  window.scrollTo({ top: y, behavior: "smooth" });
};

const BackeLandingReference = () => {
  const [activeCategory, setActiveCategory] = useState("todos");
  const [openFaq, setOpenFaq] = useState(0);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ContactLeadForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const visibleServices = useMemo(
    () =>
      activeCategory === "todos"
        ? services
        : services.filter((service) => service.category === activeCategory),
    [activeCategory]
  );

  const whatsappHref = useMemo(() => {
    if (!PUBLIC_WHATSAPP_PHONE) {
      return null;
    }

    const message = `Olá! Sou ${form.nome || "visitante"} da ${
      form.empresa || "minha empresa"
    }. Acabei de preencher o formulário no site da BACKE.co e gostaria do diagnóstico gratuito.`;

    return `https://wa.me/${PUBLIC_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  }, [form.empresa, form.nome]);

  const updateField = (field: keyof ContactLeadForm, value: string) => {
    const nextValue = field === "whatsapp" ? formatPhone(value) : value;
    setForm((currentForm) => ({ ...currentForm, [field]: nextValue }));

    if (fieldErrors[field]) {
      setFieldErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const selectInterestAndScroll = (interest: string) => {
    setForm((currentForm) => ({ ...currentForm, interesse: interest }));
    scrollToSection("contato");
  };

  const validateStepOne = () => {
    const sanitizedForm = sanitizeContactForm(form);
    const validation = validateContactForm(sanitizedForm);
    const nextErrors: ContactFormErrors = {};

    if (validation.fields.nome) {
      nextErrors.nome = validation.fields.nome;
    }

    if (validation.fields.whatsapp) {
      nextErrors.whatsapp = validation.fields.whatsapp;
    }

    setFieldErrors(nextErrors);

    if (nextErrors.nome || nextErrors.whatsapp) {
      toast.error(nextErrors.nome || nextErrors.whatsapp);
      return false;
    }

    return true;
  };

  const validateFinalStep = () => {
    const sanitizedForm = sanitizeContactForm(form);
    const validation = validateContactForm(sanitizedForm);
    const nextErrors: ContactFormErrors = { ...validation.fields };

    if (!sanitizedForm.email) {
      nextErrors.email = "Informe seu e-mail.";
    }

    if (!sanitizedForm.empresa) {
      nextErrors.empresa = "Informe sua empresa ou Instagram.";
    }

    if (!sanitizedForm.nicho) {
      nextErrors.nicho = "Selecione seu nicho.";
    }

    if (!sanitizedForm.faturamento) {
      nextErrors.faturamento = "Selecione uma faixa de faturamento.";
    }

    setFieldErrors(nextErrors);

    const firstError =
      nextErrors.nome ||
      nextErrors.whatsapp ||
      nextErrors.email ||
      nextErrors.empresa ||
      nextErrors.nicho ||
      nextErrors.faturamento;

    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const handleStepOne = () => {
    if (validateStepOne()) {
      setStep(2);
      setSubmitMessage(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateFinalStep()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage(null);

      if (!assertApiUrl()) {
        throw new Error("Canal de atendimento indisponível no momento. Fale conosco pelo WhatsApp.");
      }

      const sanitizedForm = sanitizeContactForm(form);
      const response = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizeLeadPayload(sanitizedForm)),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.message ||
            "Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp."
        );
      }

      setIsSubmitted(true);
      toast.success("Recebemos sua solicitação. Um especialista da BACKE.co vai entrar em contato em breve.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp.";
      setSubmitMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="backe-reference">
      <nav className="br-nav" aria-label="Navegação principal">
        <a className="br-nav-logo" href="#top" aria-label="BACKE.co">
          <img src={logoTransparent} alt="BACKE.co" />
        </a>
        <div className="br-nav-links">
          <a href="#servicos">Serviços</a>
          <a href="#processo">Processo</a>
          <a href="#contato">Contato</a>
        </div>
        <button className="br-btn-main" type="button" onClick={() => selectInterestAndScroll("Diagnóstico gratuito")}>
          Diagnóstico gratuito
        </button>
      </nav>

      <section id="top" className="br-hero">
        <div className="br-hero-glow" />
        <div className="br-hero-badge br-fade">
          <span className="br-badge-dot" />
          Agência de Marketing Estratégico & Criativo
        </div>
        <h1 className="br-fade br-d1">
          Estratégia que <span className="br-gradient-text">conecta.</span>
          <br />
          Criatividade que <span className="br-gradient-text">converte.</span>
        </h1>
        <p className="br-hero-sub br-fade br-d2">
          Empresas que crescem de forma consistente não escolhem entre ser criativas ou estratégicas. Elas fazem as
          duas coisas ao mesmo tempo. A Backe foi criada exatamente pra isso.
        </p>
        <div className="br-hero-btns br-fade br-d3">
          <button className="br-btn-main br-btn-large" type="button" onClick={() => selectInterestAndScroll("Diagnóstico gratuito")}>
            Quero crescer com a Backe
          </button>
          <button className="br-btn-ghost" type="button" onClick={() => scrollToSection("servicos")}>
            Ver nossos serviços
          </button>
        </div>
        <div className="br-hero-scroll" aria-hidden="true">
          <span />
          <span />
        </div>
      </section>

      <div className="br-marquee" aria-hidden="true">
        <div className="br-marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span className="br-mq-item" key={`${item}-${index}`}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="br-stats" aria-label="Indicadores BACKE.co">
        {stats.map((stat) => (
          <div className="br-stat" key={stat.label}>
            <strong className="br-gradient-text">{stat.value}</strong>
            <p>{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="br-manifesto">
        <div className="br-manifesto-inner">
          <div>
            <div className="br-label">Nossa visão</div>
            <h2 className="br-manifesto-quote">
              Marketing sem <span className="br-gradient-text">alma</span> não vende.
              <br />
              Criatividade sem <span className="br-gradient-text">estratégia</span> não escala.
            </h2>
          </div>
          <div className="br-manifesto-body">
            <p>
              Toda agência diz que entrega resultado. A diferença está em <strong>como</strong> chega lá.
            </p>
            <p>
              Na Backe, cada decisão começa com dados e termina com uma execução criativa que faz sua marca{" "}
              <strong>ser lembrada</strong> e <strong>ser escolhida</strong>.
            </p>
            <p>Não terceirizamos o pensamento. A estratégia do seu negócio é tratada como se fosse a nossa.</p>
          </div>
        </div>
      </section>

      <section id="servicos" className="br-section">
        <div className="br-wrap">
          <div className="br-label">Nossos serviços</div>
          <h2 className="br-title">
            Tudo que sua marca precisa
            <br />
            para <span className="br-gradient-text">crescer de verdade</span>
          </h2>
          <p className="br-subtitle">
            Do planejamento estratégico à execução criativa. A Backe opera em todas as frentes do marketing moderno.
          </p>

          <div className="br-filters" aria-label="Filtrar serviços">
            {categories.map((category) => (
              <button
                className={`br-filter ${activeCategory === category.id ? "active" : ""}`}
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="br-service-grid">
            {visibleServices.map((service) => (
              <article className="br-service-card" key={service.title}>
                <div className="br-service-icon">{service.icon}</div>
                <div className="br-service-cat">{service.categoryLabel}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <button className="br-service-more" type="button" onClick={() => selectInterestAndScroll(service.title)}>
                  Saiba mais
                </button>
              </article>
            ))}
          </div>

          <div className="br-cta-banner">
            <div>
              <h3>Não encontrou o que procurava?</h3>
              <p>
                Nossa equipe cria soluções personalizadas. Fale com um especialista e descubra o que a Backe pode fazer
                pelo seu negócio.
              </p>
            </div>
            <button className="br-btn-main br-nowrap" type="button" onClick={() => selectInterestAndScroll("Solução personalizada")}>
              Falar com especialista
            </button>
          </div>
        </div>
      </section>

      <section id="processo" className="br-process-bg">
        <div className="br-wrap">
          <div className="br-label">Como funciona</div>
          <h2 className="br-title">
            Da primeira conversa
            <br />
            <span className="br-gradient-text">ao primeiro resultado</span>
          </h2>
          <p className="br-subtitle">
            Processo direto. Sem enrolação. Sem metodologia com nome bonito que não entrega nada.
          </p>
          <div className="br-process-grid">
            {processSteps.map((stepItem) => (
              <article className="br-process" key={stepItem.number}>
                <div className="br-process-num">{stepItem.number}</div>
                <h3>{stepItem.title}</h3>
                <p>{stepItem.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="br-faq-section">
        <div className="br-wrap">
          <div className="br-label">Perguntas frequentes</div>
          <h2 className="br-title">
            O que todo cliente
            <br />
            quer saber <span className="br-gradient-text">antes de decidir</span>
          </h2>
          <p className="br-subtitle br-faq-subtitle">
            Transparência faz parte do nosso jeito de trabalhar. Se sua dúvida não estiver aqui, a gente responde no
            WhatsApp.
          </p>

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

          <div className="br-faq-cta">
            <p>Ainda tem dúvida? A gente responde na hora.</p>
            <button className="br-btn-main" type="button" onClick={() => selectInterestAndScroll("Dúvida comercial")}>
              Falar com um especialista
            </button>
          </div>
        </div>
      </section>

      <section id="contato" className="br-contact-section">
        <div className="br-wrap">
          <div className="br-form-wrap">
            <div className="br-form-left">
              <div className="br-label">Vamos conversar</div>
              <h2 className="br-title br-contact-title">
                Pronto para parar de
                <br />
                <span className="br-gradient-text">deixar dinheiro na mesa?</span>
              </h2>
              <p>
                Preencha o formulário ao lado. Um especialista da Backe entra em contato em até <strong>24 horas</strong>{" "}
                com um diagnóstico real do que pode ser feito no seu negócio agora.
              </p>
              <div className="br-checks">
                {checks.map((check) => (
                  <div className="br-check" key={check}>
                    <span className="br-check-icon">✓</span>
                    {check}
                  </div>
                ))}
              </div>
            </div>

            <form className="br-form-card" onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <input
                className="br-honeypot"
                type="text"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              {!isSubmitted ? (
                <>
                  {step === 1 ? (
                    <div>
                      <div className="br-form-title">Solicite seu diagnóstico gratuito</div>
                      <div className="br-form-subtitle">Rápido e sem compromisso. Começa com dois campos só.</div>
                      <div className="br-step-indicator" aria-hidden="true">
                        <div className="br-step-dot active" />
                        <div className="br-step-line" />
                        <div className="br-step-dot" />
                      </div>

                      <div className="br-field">
                        <label htmlFor="lead-name">Nome completo *</label>
                        <input
                          id="lead-name"
                          type="text"
                          value={form.nome}
                          onChange={(event) => updateField("nome", event.target.value)}
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
                          onChange={(event) => updateField("whatsapp", event.target.value)}
                          placeholder="(00) 90000-0000"
                          maxLength={16}
                          aria-invalid={Boolean(fieldErrors.whatsapp)}
                        />
                        {fieldErrors.whatsapp && <p className="br-field-error">{fieldErrors.whatsapp}</p>}
                      </div>

                      <button className="br-submit-btn" type="button" onClick={handleStepOne}>
                        Continuar
                      </button>
                      <p className="br-form-legal">Seus dados são protegidos e nunca serão compartilhados.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="br-form-title">Quase lá!</div>
                      <div className="br-form-subtitle">
                        Só mais alguns detalhes para personalizarmos seu diagnóstico.
                      </div>
                      <div className="br-step-indicator" aria-hidden="true">
                        <div className="br-step-dot done" />
                        <div className="br-step-line active" />
                        <div className="br-step-dot active" />
                      </div>

                      <div className="br-field">
                        <label htmlFor="lead-email">E-mail *</label>
                        <input
                          id="lead-email"
                          type="email"
                          value={form.email}
                          onChange={(event) => updateField("email", event.target.value)}
                          placeholder="voce@empresa.com"
                          maxLength={255}
                          aria-invalid={Boolean(fieldErrors.email)}
                        />
                        {fieldErrors.email && <p className="br-field-error">{fieldErrors.email}</p>}
                      </div>

                      <div className="br-form-row">
                        <div className="br-field">
                          <label htmlFor="lead-company">Empresa / Instagram *</label>
                          <input
                            id="lead-company"
                            type="text"
                            value={form.empresa}
                            onChange={(event) => updateField("empresa", event.target.value)}
                            placeholder="@suamarca"
                            maxLength={120}
                            aria-invalid={Boolean(fieldErrors.empresa)}
                          />
                          {fieldErrors.empresa && <p className="br-field-error">{fieldErrors.empresa}</p>}
                        </div>

                        <div className="br-field">
                          <label htmlFor="lead-niche">Nicho de atuação *</label>
                          <select
                            id="lead-niche"
                            value={form.nicho}
                            onChange={(event) => updateField("nicho", event.target.value)}
                            aria-invalid={Boolean(fieldErrors.nicho)}
                          >
                            <option value="">Selecione</option>
                            {nicheOptions.map((option) => (
                              <option value={option} key={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {fieldErrors.nicho && <p className="br-field-error">{fieldErrors.nicho}</p>}
                        </div>
                      </div>

                      <div className="br-field">
                        <label htmlFor="lead-revenue">Faturamento médio mensal *</label>
                        <select
                          id="lead-revenue"
                          value={form.faturamento}
                          onChange={(event) => updateField("faturamento", event.target.value)}
                          aria-invalid={Boolean(fieldErrors.faturamento)}
                        >
                          <option value="">Selecione uma faixa</option>
                          {revenueOptions.map((option) => (
                            <option value={option} key={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.faturamento && <p className="br-field-error">{fieldErrors.faturamento}</p>}
                      </div>

                      <div className="br-submit-row">
                        <button className="br-submit-btn br-back-btn" type="button" onClick={() => setStep(1)}>
                          ←
                        </button>
                        <button className="br-submit-btn" type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Enviando..." : "Enviar e garantir meu diagnóstico"}
                        </button>
                      </div>
                      {submitMessage && <p className="br-form-alert">{submitMessage}</p>}
                      <p className="br-form-legal">Seus dados são protegidos e nunca serão compartilhados.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="br-form-success">
                  <div className="br-success-icon">✓</div>
                  <h3>Recebemos tudo!</h3>
                  <p>
                    Nossa equipe vai entrar em contato em até <strong>24 horas</strong>.
                  </p>
                  <p className="br-success-muted">Confira seu e-mail e WhatsApp.</p>
                  {whatsappHref && (
                    <a className="br-wpp-btn" href={whatsappHref} target="_blank" rel="noreferrer">
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
          <a href="#contato">Instagram</a>
          <a href="#contato">LinkedIn</a>
          <button type="button" onClick={() => selectInterestAndScroll("WhatsApp")}>
            WhatsApp
          </button>
        </div>
      </footer>
    </main>
  );
};

export default BackeLandingReference;
