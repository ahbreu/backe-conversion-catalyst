import ServicePage from "./ServicePage";

const pageConfig = {
  title: "Sistema para Barbearia em São Paulo | BACKE.co",
  metaDescription:
    "Sistema completo para barbearia em São Paulo. Gestão de agenda, financeiro, clientes e marketing digital. Diagnóstico gratuito com a BACKE.co.",
  canonicalUrl: "https://backe.com.br/sistema-para-barbearia-sao-paulo",
  heroTitle: (
    <>
      Sistema para <span className="br-gradient-text">barbearia</span>
      <br />
      em São Paulo
    </>
  ),
  heroSubtitle:
    "Gerencie sua barbearia com tecnologia: agendamento online, controle financeiro, fidelização de clientes e marketing digital. Tudo em um só lugar.",
  serviceInterest: "Sistema para barbearia em São Paulo",
  features: [
    {
      icon: "AGE",
      title: "Agendamento Online",
      description:
        "Seus clientes agendam pelo celular, 24h por dia. Sem ligações, sem confusão. Você controla a agenda e evita buracos ou sobreposições.",
    },
    {
      icon: "FIN",
      title: "Controle Financeiro",
      description:
        "Fluxo de caixa, comissões automáticas, relatórios de faturamento. Saiba exatamente quanto entra e sai, todo dia.",
    },
    {
      icon: "CLI",
      title: "Gestão de Clientes",
      description:
        "Histórico completo de cada cliente: serviços, frequência, preferências. Envie lembretes automáticos e aumente o retorno.",
    },
    {
      icon: "MKT",
      title: "Marketing Integrado",
      description:
        "Disparos de WhatsApp, promoções por SMS, página de agendamento personalizada. Traga clientes de volta sem esforço.",
    },
    {
      icon: "REL",
      title: "Relatórios Inteligentes",
      description:
        "Dashboard com os números que importam: serviços mais realizados, horários de pico, ticket médio e retenção.",
    },
    {
      icon: "SUP",
      title: "Suporte Dedicado",
      description:
        "Time disponível para ajudar na configuração, treinamento e dúvidas. Você não fica sozinho em nenhum momento.",
    },
  ],
  faqItems: [
    {
      question: "O sistema funciona para barbearias de qualquer tamanho?",
      answer:
        "Sim. Atendemos desde barbearias individuais até redes com múltiplas unidades em São Paulo. O plano é ajustado conforme sua necessidade.",
    },
    {
      question: "Preciso instalar algo no computador?",
      answer:
        "Não. O sistema é 100% online e acessível pelo celular, tablet ou computador. Basta ter internet.",
    },
    {
      question: "Quanto tempo leva para começar a usar?",
      answer:
        "A configuração inicial leva menos de 1 hora. Nossa equipe faz todo o setup e treina sua equipe no mesmo dia.",
    },
    {
      question: "Vocês ajudam com a migração de outro sistema?",
      answer:
        "Sim. Fazemos a migração completa dos dados dos seus clientes, histórico e configurações sem perda de informação.",
    },
  ],
  testimonial: {
    quote:
      "Antes perdíamos agendamentos por telefone e a agenda ficava bagunçada. Com o sistema da BACKE, organizamos tudo e aumentamos o faturamento em 35% em 3 meses.",
    author: "Carlos Silva",
    role: "Proprietário da Barbearia Old School — Vila Madalena, SP",
  },
  schemaMarkup: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://backe.com.br/#localbusiness",
    name: "BACKE.co — Sistema para Barbearia em São Paulo",
    description:
      "Sistema completo para gestão de barbearias em São Paulo: agendamento online, financeiro, clientes e marketing digital.",
    url: "https://backe.com.br/sistema-para-barbearia-sao-paulo",
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
    serviceType: "Sistema de Gestão para Barbearia",
    priceRange: "$$",
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "O sistema funciona para barbearias de qualquer tamanho?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Atendemos desde barbearias individuais até redes com múltiplas unidades em São Paulo.",
          },
        },
        {
          "@type": "Question",
          name: "Preciso instalar algo no computador?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Não. O sistema é 100% online e acessível pelo celular, tablet ou computador.",
          },
        },
        {
          "@type": "Question",
          name: "Quanto tempo leva para começar a usar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A configuração inicial leva menos de 1 hora.",
          },
        },
        {
          "@type": "Question",
          name: "Vocês ajudam com a migração de outro sistema?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Fazemos a migração completa dos dados sem perda de informação.",
          },
        },
      ],
    },
  },
};

const SistemaBarbeariaSP = () => <ServicePage {...pageConfig} />;

export default SistemaBarbeariaSP;
