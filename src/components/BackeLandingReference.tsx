import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import ClientsMarquee from "./ClientsMarquee";
import TurnstileWidget from "./TurnstileWidget";
import { META_PIXEL_READY_EVENT, trackMetaEvent, trackMetaLead } from "@/lib/metaPixel";
import "./BackeLandingReference.css";

const PUBLIC_WHATSAPP_PHONE = String(import.meta.env.VITE_PUBLIC_WHATSAPP_PHONE || "556192240234").replace(/\D/g, "");

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
    icon: "🎯",
    title: "Tráfego Pago",
    description:
      "Gestão de campanhas no Meta Ads e Google Ads com foco em performance. Segmentamos o público certo, no momento certo, com o criativo certo. Chega de queimar verba.",
    benefit: "Ajuda a transformar investimento em demanda previsível, atraindo pessoas com intenção de compra e mostrando quais campanhas realmente trazem oportunidades.",
  },
  {
    category: "digital",
    categoryLabel: "Marketing Digital",
    icon: "📱",
    title: "Gestão de Redes Sociais",
    description:
      "Calendário editorial estratégico, produção de conteúdo e gestão de comunidade. Transformamos seguidores em clientes com consistência e intenção de marca.",
    benefit: "Mantém sua marca presente na rotina do público, fortalece confiança antes da compra e cria mais pontos de entrada para conversas comerciais.",
  },
  {
    category: "estrategia",
    categoryLabel: "Estratégia",
    icon: "📊",
    title: "Estratégia & Performance",
    description:
      "Planejamento completo com metas claras, análise de dados, relatórios que fazem sentido e otimização constante para escalar o que realmente funciona.",
    benefit: "Conecta marketing a metas comerciais, reduz decisões no escuro e direciona orçamento e esforço para as iniciativas com maior retorno.",
  },
  {
    category: "estrategia",
    categoryLabel: "Estratégia",
    icon: "🤝",
    title: "Treinamento & Capacitação de Vendas",
    description:
      "Preparamos seu time comercial com metodologias modernas, scripts de abordagem, técnicas de fechamento e inteligência de mercado para vender mais e melhor.",
    benefit: "Aumenta a qualidade do atendimento, reduz oportunidades perdidas e dá ao time um processo replicável para conduzir contatos até o fechamento.",
  },
  {
    category: "criativo",
    categoryLabel: "Criação & Design",
    icon: "🎨",
    title: "Branding & Identidade Visual",
    description:
      "Criamos identidades visuais completas: logo, paleta, tipografia e brandbook. Sua marca passa a comunicar quem você é antes mesmo de abrir a boca.",
    benefit: "Eleva a percepção de valor, diferencia sua empresa dos concorrentes e transmite mais confiança desde o primeiro contato com a marca.",
  },
  {
    category: "criativo",
    categoryLabel: "Criação & Design",
    icon: "✨",
    title: "Design Gráfico & Motions",
    description:
      "Peças gráficas para digital e impresso, animações em motion graphics e vídeos animados. Conteúdo visual que comunica com impacto e retém atenção.",
    benefit: "Faz sua comunicação ser percebida mais rápido, melhora a retenção da mensagem e dá consistência visual a campanhas e materiais comerciais.",
  },
  {
    category: "criativo",
    categoryLabel: "Criação & Design",
    icon: "🌐",
    title: "Criação de Sites & Landing Pages",
    description:
      "Sites institucionais e landing pages otimizadas para conversão. Design responsivo, copy persuasivo e integração com ferramentas de automação e CRM.",
    benefit: "Transforma visitas em oportunidades 24 horas por dia, organiza a captação de contatos e reduz atrito entre o interesse e a conversa comercial.",
  },
  {
    category: "audiovisual",
    categoryLabel: "Audiovisual",
    icon: "🎬",
    title: "Captação Audiovisual",
    description:
      "Produção de vídeos profissionais para campanhas, redes sociais e institucionais. Direção, gravação e edição com padrão de qualidade que eleva sua marca.",
    benefit: "Demonstra produtos, histórias e diferenciais com mais clareza, aumentando atenção, confiança e capacidade de convencimento da sua comunicação.",
  },
  {
    category: "audiovisual",
    categoryLabel: "Audiovisual",
    icon: "🚁",
    title: "Captação com Drone",
    description:
      "Imagens e vídeos aéreos de alta resolução para imóveis, eventos e campanhas de impacto. Perspectivas únicas que nenhuma câmera convencional consegue entregar.",
    benefit: "Valoriza espaços, projetos e experiências com uma perspectiva marcante, ajudando sua oferta a se destacar e ser lembrada pelo público.",
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
  const [flippedService, setFlippedService] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ContactLeadForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const formStarted = useRef(false);

  useEffect(() => {
    const sectionIds = ["top", "indicadores", "manifesto", "servicos", "processo", "faq", "contato"];
    const seen = new Set<string>();
    const visible = new Set<string>();
    const timers = new Map<string, number>();
    const elements = sectionIds.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target.id;
        if (!entry.isIntersecting) {
          visible.delete(section);
          const timer = timers.get(section);
          if (timer) window.clearTimeout(timer);
          timers.delete(section);
          return;
        }

        visible.add(section);
        if (seen.has(section) || timers.has(section)) return;
        timers.set(section, window.setTimeout(() => {
          timers.delete(section);
          if (visible.has(section) && trackMetaEvent("section_view", { section })) {
            seen.add(section);
            observer.unobserve(entry.target);
          }
        }, 600));
      });
    }, { threshold: 0.15 });
    const observe = () => elements.forEach((element) => {
      if (!seen.has(element.id)) {
        observer.unobserve(element);
        observer.observe(element);
      }
    });

    observe();
    window.addEventListener(META_PIXEL_READY_EVENT, observe);
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener(META_PIXEL_READY_EVENT, observe);
    };
  }, []);

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

  const whatsappGeneralHref = useMemo(() => {
    if (!PUBLIC_WHATSAPP_PHONE) {
      return null;
    }

    return `https://wa.me/${PUBLIC_WHATSAPP_PHONE}?text=${encodeURIComponent("Olá! Vim pelo site da BACKE.co e gostaria de saber mais.")}`;
  }, []);

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

  const resetForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setSubmitMessage(null);
    setIsSubmitted(false);
    setStep(1);
    setTurnstileToken("");
    setTurnstileResetKey((current) => current + 1);
  };

  const selectInterestAndScroll = (interest: string, source = "unknown") => {
    trackMetaEvent("cta_click", { source, destination: "contact_form" });
    setForm((currentForm) => ({ ...currentForm, interesse: interest }));
    scrollToSection("contato");
  };

  const trackFormStart = () => {
    if (formStarted.current) return;
    if (trackMetaEvent("form_start", { form: "diagnostico" })) formStarted.current = true;
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
      trackMetaEvent("form_step_complete", { form: "diagnostico", step: 1 });
      setStep(2);
      setSubmitMessage(null);
    } else {
      trackMetaEvent("form_validation_error", { form: "diagnostico", step: 1 });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    trackMetaEvent("form_submit_attempt", { form: "diagnostico" });

    if (!validateFinalStep()) {
      trackMetaEvent("form_validation_error", { form: "diagnostico", step: 2 });
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
        body: JSON.stringify(normalizeLeadPayload(sanitizedForm, turnstileToken)),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.message ||
            "Não conseguimos enviar sua solicitação agora. Tente novamente ou fale conosco pelo WhatsApp."
        );
      }

      setIsSubmitted(true);
      trackMetaLead();
      setTurnstileToken("");
      toast.success("Recebemos sua solicitação. Um especialista da BACKE.co vai entrar em contato em breve.");
    } catch (error) {
      trackMetaEvent("form_submit_error", { form: "diagnostico" });
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
          <a href="#servicos" onClick={() => trackMetaEvent("cta_click", { source: "nav_services", destination: "services" })}>Serviços</a>
          <a href="#processo" onClick={() => trackMetaEvent("cta_click", { source: "nav_process", destination: "process" })}>Processo</a>
          <a href="#contato" onClick={() => trackMetaEvent("cta_click", { source: "nav_contact", destination: "contact_form" })}>Contato</a>
        </div>
        <button className="br-btn-main" type="button" onClick={() => selectInterestAndScroll("Diagnóstico gratuito", "nav")}>
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
          <button className="br-btn-main br-btn-large" type="button" onClick={() => selectInterestAndScroll("Diagnóstico gratuito", "hero_primary")}>
            Quero crescer com a Backe
          </button>
          <button className="br-btn-ghost" type="button" onClick={() => { trackMetaEvent("cta_click", { source: "hero_services", destination: "services" }); scrollToSection("servicos"); }}>
            Ver nossos serviços
          </button>
        </div>
        <div className="br-hero-scroll" aria-hidden="true">
          <span />
          <span />
        </div>
      </section>

      <ClientsMarquee />

      <section id="indicadores" className="br-stats" aria-label="Indicadores BACKE.co">
        {stats.map((stat) => (
          <div className="br-stat" key={stat.label}>
            <strong className="br-gradient-text">{stat.value}</strong>
            <p>{stat.label}</p>
          </div>
        ))}
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

      <section id="manifesto" className="br-manifesto">
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
                onClick={() => {
                  setActiveCategory(category.id);
                  setFlippedService(null);
                  trackMetaEvent("service_filter", { category: category.id });
                }}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="br-service-grid">
            {visibleServices.map((service) => {
              const isFlipped = flippedService === service.title;
              return (
                <article className={`br-service-card ${isFlipped ? "is-flipped" : ""}`} key={service.title}>
                  <div className="br-service-card-inner">
                    <div className="br-service-face br-service-front" aria-hidden={isFlipped}>
                      <div className="br-service-icon">{service.icon}</div>
                      <div className="br-service-cat">{service.categoryLabel}</div>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                      <button
                        className="br-service-more"
                        type="button"
                        tabIndex={isFlipped ? -1 : 0}
                        onClick={() => {
                          setFlippedService(service.title);
                          trackMetaEvent("service_card_flip", { service: service.title, face: "benefit" });
                        }}
                      >
                        Como isso ajuda
                      </button>
                    </div>
                    <div className="br-service-face br-service-back" aria-hidden={!isFlipped}>
                      <div className="br-service-cat">Impacto no seu negócio</div>
                      <h3>{service.title}</h3>
                      <p>{service.benefit}</p>
                      <div className="br-service-actions">
                        <button className="br-service-back-button" type="button" tabIndex={isFlipped ? 0 : -1} onClick={() => setFlippedService(null)}>
                          Voltar
                        </button>
                        <button
                          className="br-service-more"
                          type="button"
                          tabIndex={isFlipped ? 0 : -1}
                          onClick={() => {
                            trackMetaEvent("service_interest", { service: service.title });
                            selectInterestAndScroll(service.title, "service_card");
                          }}
                        >
                          Quero aplicar isso
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="br-cta-banner">
            <div>
              <h3>Não encontrou o que procurava?</h3>
              <p>
                Nossa equipe cria soluções personalizadas. Fale com um especialista e descubra o que a Backe pode fazer
                pelo seu negócio.
              </p>
            </div>
            <button className="br-btn-main br-nowrap" type="button" onClick={() => selectInterestAndScroll("Solução personalizada", "services_banner")}>
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
                    onClick={() => {
                      setOpenFaq(isOpen ? -1 : index);
                      if (!isOpen) trackMetaEvent("faq_open", { position: index + 1 });
                    }}
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
            <button className="br-btn-main" type="button" onClick={() => selectInterestAndScroll("Dúvida comercial", "faq")}>
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

            <form className="br-form-card" onSubmit={handleSubmit} onFocus={trackFormStart} aria-busy={isSubmitting}>
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
                      <p className="br-form-legal">Dados protegidos e usados somente para atender sua solicitação.</p>
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

                      <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />
                      <div className="br-submit-row">
                        <button className="br-submit-btn br-back-btn" type="button" onClick={() => setStep(1)}>
                          ←
                        </button>
                        <button className="br-submit-btn" type="submit" disabled={isSubmitting || Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken)}>
                          {isSubmitting ? "Enviando..." : "Enviar e garantir meu diagnóstico"}
                        </button>
                      </div>
                      {submitMessage && (
                        <div className="br-error-actions">
                          <p className="br-form-alert">{submitMessage}</p>
                          <div className="br-error-btns">
                            <button className="br-retry-btn" type="button" onClick={resetForm}>
                              Tentar novamente
                            </button>
                            {whatsappHref && (
                              <a className="br-wpp-btn br-wpp-btn-inline" href={whatsappHref} target="_blank" rel="noreferrer" onClick={() => trackMetaEvent("contact_whatsapp", { source: "form_error" })}>
                                Falar no WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="br-form-legal">
                        Usamos seus dados para retornar o contato. Consulte a{" "}
                        <a href="/privacidade.html" target="_blank" rel="noreferrer">Política de Privacidade</a>.
                      </p>
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
                  {whatsappHref ? (
                    <a className="br-wpp-btn" href={whatsappHref} target="_blank" rel="noreferrer" onClick={() => trackMetaEvent("contact_whatsapp", { source: "form_success" })}>
                      Chamar no WhatsApp agora
                    </a>
                  ) : (
                    <button className="br-wpp-btn br-wpp-btn-text" type="button" onClick={resetForm}>
                      Fazer nova solicitação
                    </button>
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
          <a href="https://www.instagram.com/backe.co/" target="_blank" rel="noreferrer" onClick={() => trackMetaEvent("contact_instagram", { source: "footer" })}>Instagram</a>
          {whatsappGeneralHref ? (
            <a href={whatsappGeneralHref} target="_blank" rel="noreferrer" onClick={() => trackMetaEvent("contact_whatsapp", { source: "footer" })}>
              WhatsApp
            </a>
          ) : (
            <button type="button" onClick={() => selectInterestAndScroll("WhatsApp", "footer_fallback")}>
              WhatsApp
            </button>
          )}
        </div>
      </footer>

      <a
        className="br-wpp-float"
        href="https://wa.me/556192240234?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20BACKE.co%20e%20gostaria%20de%20saber%20mais."
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
        onClick={() => trackMetaEvent("contact_whatsapp", { source: "floating_button" })}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </main>
  );
};

export default BackeLandingReference;
