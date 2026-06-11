import ServicePage from "./ServicePage";

const pageConfig = {
  title: "Gestão de Agenda para Barbearia | BACKE.co",
  metaDescription:
    "Gestão de agenda profissional para barbearias. Agendamento online automático, controle de horários e redução de faltas. Teste grátis com a BACKE.co.",
  canonicalUrl: "https://backe.com.br/gestao-de-agenda-para-barbearia",
  heroTitle: (
    <>
      Gestão de <span className="br-gradient-text">agenda</span>
      <br />
      para barbearia
    </>
  ),
  heroSubtitle:
    "Acabe com faltas, atrasos e agenda bagunçada. Sistema inteligente de agendamento que organiza sua barbearia e aumenta seu faturamento.",
  serviceInterest: "Gestão de agenda para barbearia",
  features: [
    {
      icon: "ONL",
      title: "Agendamento 100% Online",
      description:
        "Cliente agenda pelo celular a qualquer hora. Sem ligar, sem mensagem, sem espera. A agenda se organiza sozinha.",
    },
    {
      icon: "LEM",
      title: "Lembretes Automáticos",
      description:
        "WhatsApp e SMS automáticos antes do horário. Reduza faltas em até 60% com lembretes inteligentes.",
    },
    {
      icon: "BAR",
      title: "Controle por Barbeiro",
      description:
        "Cada profissional tem sua própria agenda, horários e serviços. Você acompanha tudo em tempo real.",
    },
    {
      icon: "BLO",
      title: "Bloqueio de Horários",
      description:
        "Bloqueie horários para almoço, folgas ou eventos especiais. A agenda se ajusta automaticamente.",
    },
    {
      icon: "LIS",
      title: "Lista de Espera",
      description:
        "Quando um cliente cancela, o próximo da lista de espera é notificado automaticamente. Agenda sempre cheia.",
    },
    {
      icon: "HIS",
      title: "Histórico Completo",
      description:
        "Saiba quais horários são mais procurados, quais serviços têm mais demanda e como otimizar sua grade.",
    },
  ],
  faqItems: [
    {
      question: "O sistema envia lembretes automáticos para os clientes?",
      answer:
        "Sim. Enviamos lembretes por WhatsApp e SMS antes do agendamento. Você configura o tempo de antecedência que preferir.",
    },
    {
      question: "Posso definir intervalos entre atendimentos?",
      answer:
        "Sim. Você define o tempo de cada serviço e o sistema calcula automaticamente os intervalos necessários.",
    },
    {
      question: "E se um cliente faltar?",
      answer:
        "O sistema registra as faltas e você pode configurar políticas de confirmação prévia. A lista de espera preenche vagas canceladas automaticamente.",
    },
    {
      question: "Funciona com mais de um barbeiro?",
      answer:
        "Sim. Cada barbeiro tem sua agenda individual e você acompanha tudo pelo painel administrativo.",
    },
  ],
  testimonial: {
    quote:
      "Nossa taxa de faltas caiu de 25% para 8%. Os clientes adoram poder agendar pelo celular e receber lembretes automáticos. A agenda nunca mais foi problema.",
    author: "Rafael Mendes",
    role: "Gerente da Barbearia Corte Fino — Pinheiros, SP",
  },
  schemaMarkup: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://backe.com.br/#localbusiness",
    name: "BACKE.co — Gestão de Agenda para Barbearia",
    description:
      "Sistema de gestão de agenda profissional para barbearias: agendamento online, lembretes automáticos e controle de horários.",
    url: "https://backe.com.br/gestao-de-agenda-para-barbearia",
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
    serviceType: "Gestão de Agenda para Barbearia",
    priceRange: "$$",
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "O sistema envia lembretes automáticos para os clientes?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Enviamos lembretes por WhatsApp e SMS antes do agendamento.",
          },
        },
        {
          "@type": "Question",
          name: "Posso definir intervalos entre atendimentos?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Você define o tempo de cada serviço e o sistema calcula automaticamente.",
          },
        },
        {
          "@type": "Question",
          name: "E se um cliente faltar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "O sistema registra as faltas e a lista de espera preenche vagas canceladas automaticamente.",
          },
        },
        {
          "@type": "Question",
          name: "Funciona com mais de um barbeiro?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Cada barbeiro tem sua agenda individual.",
          },
        },
      ],
    },
  },
};

const GestaoAgendaBarbearia = () => <ServicePage {...pageConfig} />;

export default GestaoAgendaBarbearia;
