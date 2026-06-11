import ServicePage from "./ServicePage";

const pageConfig = {
  title: "Software para Salão de Beleza | BACKE.co",
  metaDescription:
    "Software completo para salão de beleza. Gestão de agenda, comissões, estoque e fidelização de clientes. Comece grátis com a BACKE.co.",
  canonicalUrl: "https://backe.com.br/software-para-salao-de-beleza",
  heroTitle: (
    <>
      Software para <span className="br-gradient-text">salão de beleza</span>
    </>
  ),
  heroSubtitle:
    "Gerencie seu salão de beleza com profissionalismo: agenda inteligente, controle de comissões, estoque de produtos e programa de fidelidade.",
  serviceInterest: "Software para salão de beleza",
  features: [
    {
      icon: "AGE",
      title: "Agenda Inteligente",
      description:
        "Agendamento online com cálculo automático de tempo por serviço. Clientes agendam pelo celular e você controla tudo.",
    },
    {
      icon: "COM",
      title: "Controle de Comissões",
      description:
        "Cálculo automático de comissões por profissional, serviço e produto. Relatórios claros e pagamento sem erro.",
    },
    {
      icon: "EST",
      title: "Gestão de Estoque",
      description:
        "Controle de produtos profissionais e de revenda. Alertas de reposição e relatórios de consumo por profissional.",
    },
    {
      icon: "FID",
      title: "Programa de Fidelidade",
      description:
        "Pontos por visita, descontos automáticos e campanhas de retorno. Mantenha suas clientes fiéis e voltando sempre.",
    },
    {
      icon: "FIN",
      title: "Financeiro Completo",
      description:
        "Fluxo de caixa, contas a pagar e receber, relatórios de faturamento. Visão completa da saúde do seu salão.",
    },
    {
      icon: "APP",
      title: "App para Clientes",
      description:
        "Página personalizada com sua marca para agendamento, histórico e promoções. Experiência profissional do início ao fim.",
    },
  ],
  faqItems: [
    {
      question: "O software atende salões de qualquer porte?",
      answer:
        "Sim. Desde salões pequenos com 2 profissionais até grandes espaços com 20+ colaboradores. O plano cresce com você.",
    },
    {
      question: "Consigo controlar comissões de diferentes formas?",
      answer:
        "Sim. Configuramos comissões fixas, percentuais por serviço, por produto vendido ou combinações. Cada profissional pode ter regras diferentes.",
    },
    {
      question: "O sistema controla estoque de produtos?",
      answer:
        "Sim. Você cadastra os produtos, define quantidades mínimas e recebe alertas quando precisa repor. Também registra consumo por profissional.",
    },
    {
      question: "Tem programa de fidelidade incluso?",
      answer:
        "Sim. Você configura regras de pontuação, descontos automáticos e campanhas de retorno para manter suas clientes fiéis.",
    },
  ],
  testimonial: {
    quote:
      "Antes controlávamos tudo no caderno. Com o software da BACKE, organizamos agenda, comissões e estoque. O faturamento cresceu 40% e as clientes adoraram o agendamento online.",
    author: "Ana Paula Ferreira",
    role: "Proprietária do Studio Bella — Jardins, SP",
  },
  schemaMarkup: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://backe.com.br/#localbusiness",
    name: "BACKE.co — Software para Salão de Beleza",
    description:
      "Software completo para gestão de salões de beleza: agenda inteligente, comissões, estoque e programa de fidelidade.",
    url: "https://backe.com.br/software-para-salao-de-beleza",
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
    serviceType: "Software para Salão de Beleza",
    priceRange: "$$",
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "O software atende salões de qualquer porte?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Desde salões pequenos com 2 profissionais até grandes espaços com 20+ colaboradores.",
          },
        },
        {
          "@type": "Question",
          name: "Consigo controlar comissões de diferentes formas?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Configuramos comissões fixas, percentuais por serviço, por produto ou combinações.",
          },
        },
        {
          "@type": "Question",
          name: "O sistema controla estoque de produtos?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Cadastro de produtos, alertas de reposição e consumo por profissional.",
          },
        },
        {
          "@type": "Question",
          name: "Tem programa de fidelidade incluso?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Regras de pontuação, descontos automáticos e campanhas de retorno.",
          },
        },
      ],
    },
  },
};

const SoftwareSalaoBeleza = () => <ServicePage {...pageConfig} />;

export default SoftwareSalaoBeleza;
