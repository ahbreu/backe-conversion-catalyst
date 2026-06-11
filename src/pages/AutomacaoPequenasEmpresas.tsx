import ServicePage from "./ServicePage";

const pageConfig = {
  title: "Automação para Pequenas Empresas | BACKE.co",
  metaDescription:
    "Automação de processos para pequenas empresas. WhatsApp, agendamento, financeiro e marketing automatizados. Economize tempo com a BACKE.co.",
  canonicalUrl: "https://backe.com.br/automacao-para-pequenas-empresas",
  heroTitle: (
    <>
      Automação para <span className="br-gradient-text">pequenas empresas</span>
    </>
  ),
  heroSubtitle:
    "Automatize processos repetitivos e foque no que importa: crescer. WhatsApp, agendamento, financeiro e marketing — tudo integrado e funcionando por você.",
  serviceInterest: "Automação para pequenas empresas",
  features: [
    {
      icon: "WPP",
      title: "WhatsApp Automatizado",
      description:
        "Respostas automáticas, agendamento por chat, follow-ups programados. Atenda seus clientes 24h sem equipe extra.",
    },
    {
      icon: "CRM",
      title: "CRM Simplificado",
      description:
        "Acompanhe leads, oportunidades e vendas em um painel visual. Saiba exatamente quem está em cada etapa do funil.",
    },
    {
      icon: "INV",
      title: "Invoices Automáticos",
      description:
        "Gere orçamentos e faturas automaticamente. Envie por WhatsApp ou e-mail e acompanhe pagamentos em tempo real.",
    },
    {
      icon: "MKT",
      title: "Marketing Automatizado",
      description:
        "Campanhas de e-mail, SMS e WhatsApp segmentadas. Reative clientes inativos e promova serviços no momento certo.",
    },
    {
      icon: "REL",
      title: "Relatórios Automáticos",
      description:
        "Dashboards com métricas que importam: faturamento, novos clientes, taxa de retorno. Tudo atualizado em tempo real.",
    },
    {
      icon: "INT",
      title: "Integrações Prontas",
      description:
        "Conecte com Google Agenda, Google Business Profile, redes sociais e ferramentas de pagamento. Tudo sincronizado.",
    },
  ],
  faqItems: [
    {
      question: "Preciso de conhecimento técnico para usar?",
      answer:
        "Não. Nossa equipe configura tudo para você e faz o treinamento. O sistema é intuitivo e pensado para quem não é de TI.",
    },
    {
      question: "Quanto tempo economizo com automação?",
      answer:
        "Nossos clientes economizam em média 15-20 horas por semana em tarefas repetitivas como agendamento, follow-up e cobrança.",
    },
    {
      question: "Funciona para qualquer tipo de negócio?",
      answer:
        "Atendemos barbearias, salões, clínicas, consultórios, escritórios e comércios locais. A automação é personalizada para seu nicho.",
    },
    {
      question: "Posso começar com apenas uma automação?",
      answer:
        "Sim. Você pode começar com WhatsApp automatizado ou agendamento online e adicionar módulos conforme sua necessidade cresce.",
    },
  ],
  testimonial: {
    quote:
      "Automatizamos o WhatsApp, agendamento e follow-ups. Antes gastávamos 3 horas por dia só respondendo mensagens. Agora o sistema cuida disso e focamos em atender melhor.",
    author: "Lucas Oliveira",
    role: "Proprietário da Barbearia Premium — Moema, SP",
  },
  schemaMarkup: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://backe.com.br/#localbusiness",
    name: "BACKE.co — Automação para Pequenas Empresas",
    description:
      "Automação de processos para pequenas empresas: WhatsApp, agendamento, financeiro e marketing automatizados.",
    url: "https://backe.com.br/automacao-para-pequenas-empresas",
    telephone: "+55-61-99999-9999",
    address: {
      "@type": "PostalAddress",
      addressLocality: "São Paulo",
      addressRegion: "SP",
      addressCountry: "BR",
    },
    areaServed: {
      "@type": "City",
      name: "São Paulo",
    },
    serviceType: "Automação para Pequenas Empresas",
    priceRange: "$$",
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Preciso de conhecimento técnico para usar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Não. Configuramos tudo e fazemos o treinamento. O sistema é intuitivo.",
          },
        },
        {
          "@type": "Question",
          name: "Quanto tempo economizo com automação?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Em média 15-20 horas por semana em tarefas repetitivas.",
          },
        },
        {
          "@type": "Question",
          name: "Funciona para qualquer tipo de negócio?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Atendemos barbearias, salões, clínicas, consultórios e comércios locais.",
          },
        },
        {
          "@type": "Question",
          name: "Posso começar com apenas uma automação?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Comece com WhatsApp ou agendamento e adicione módulos conforme necessário.",
          },
        },
      ],
    },
  },
};

const AutomacaoPequenasEmpresas = () => <ServicePage {...pageConfig} />;

export default AutomacaoPequenasEmpresas;
