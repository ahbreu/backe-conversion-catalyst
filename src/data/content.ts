/**
 * Conteúdo do site — fonte única.
 * Regra: só fatos já publicados no site atual ou confirmados pela Backe.
 */

import { CONTACT_EMAIL, WHATSAPP_MESSAGE, WHATSAPP_NUMBER } from '../config/site';

/** "5561999999999" → "(61) 99999-9999" */
const displayPhone = (digits: string) =>
  digits.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');

/** WhatsApp e e-mail vêm das variáveis de build (src/config/site.ts), não ficam escritos aqui. */
export const CONTACT = {
  whatsappDisplay: displayPhone(WHATSAPP_NUMBER),
  whatsappText: WHATSAPP_MESSAGE,
  email: CONTACT_EMAIL,
  instagram: 'https://www.instagram.com/backe.co/',
  instagramHandle: '@backe.co',
  city: 'Brasília, DF',
  hours: ['Segunda a sexta, das 9h às 18h', 'Sábado, das 9h às 13h'],
};

/** Confirmados pela Backe em 12/11/2026. */
export const STATS = [
  { prefix: '+', value: 100, suffix: '', decimals: 0, label: 'clientes atendidos' },
  { prefix: '', value: 3.8, suffix: 'x', decimals: 1, label: 'ROI médio entregue' },
  { prefix: '+R$', value: 5, suffix: 'M', decimals: 0, label: 'investidos em mídia' },
  { prefix: '', value: 98, suffix: '%', decimals: 0, label: 'de clientes satisfeitos' },
];

export const CLIENTS = [
  { file: 'globo', name: 'TV Globo' },
  { file: 'world-gym', name: 'World Gym' },
  { file: 'rede-dos-cosmeticos', name: 'Rede dos Cosméticos' },
  { file: 'acai', name: 'Açaí Puríssimo' },
  { file: 'nossa', name: 'Nossa Galera' },
  { file: 'pl4no', name: 'PL4NO' },
  { file: 'funn', name: 'Funn' },
  { file: 'pueblito', name: 'Pueblito' },
  { file: 'fazendinho', name: 'Fazendinha' },
  { file: 'assim', name: 'Assim que se Faz' },
  { file: 'panela', name: 'Empório Panela Velha' },
  { file: 'sexta', name: 'Sexta Gode' },
  { file: 'trust', name: 'Trust Love' },
  { file: 'quituarte', name: 'Quituarte' },
  { file: '5uinta', name: '5uinta Marcha' },
];

export interface Service {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  impact: string;
}

export interface Front {
  n: string;
  id: string;
  name: string;
  promise: string;
  intro: string;
  services: Service[];
}

export const FRONTS: Front[] = [
  {
    n: '01',
    id: 'estrategia',
    name: 'Estratégia',
    promise: 'Para onde ir e como chegar.',
    intro: 'O ponto de partida de tudo: metas claras, dados lidos do jeito certo e um plano que mostra onde investir primeiro.',
    services: [
      {
        id: 'estrategia-performance',
        title: 'Estratégia & Performance',
        description:
          'Planejamento completo com metas claras, análise de dados, relatórios que fazem sentido e otimização constante para escalar o que realmente funciona.',
        deliverables: ['Planejamento e metas', 'Análise de dados', 'Relatórios que fazem sentido', 'Otimização contínua'],
        impact:
          'Conecta marketing a metas comerciais, reduz decisões no escuro e direciona orçamento e esforço para as iniciativas com maior retorno.',
      },
    ],
  },
  {
    n: '02',
    id: 'demanda',
    name: 'Demanda',
    promise: 'As pessoas certas chegando todos os dias.',
    intro: 'Mídia paga e presença social trabalhando juntas para gerar oportunidades previsíveis, não só alcance.',
    services: [
      {
        id: 'trafego-pago',
        title: 'Tráfego Pago',
        description:
          'Gestão de campanhas no Meta Ads e Google Ads com foco em performance. Segmentamos o público certo, no momento certo, com o criativo certo. Chega de queimar verba.',
        deliverables: ['Meta Ads', 'Google Ads', 'Segmentação de público', 'Otimização de campanhas'],
        impact:
          'Transforma investimento em demanda previsível, atraindo pessoas com intenção de compra e mostrando quais campanhas realmente trazem oportunidades.',
      },
      {
        id: 'redes-sociais',
        title: 'Gestão de Redes Sociais',
        description:
          'Calendário editorial estratégico, produção de conteúdo e gestão de comunidade. Transformamos seguidores em clientes com consistência e intenção de marca.',
        deliverables: ['Calendário editorial', 'Produção de conteúdo', 'Gestão de comunidade'],
        impact:
          'Mantém sua marca presente na rotina do público, fortalece a confiança antes da compra e cria mais pontos de entrada para conversas comerciais.',
      },
    ],
  },
  {
    n: '03',
    id: 'marca',
    name: 'Marca',
    promise: 'Ser lembrada. E ser escolhida.',
    intro: 'Identidade, design e presença digital que comunicam quem você é antes mesmo de você abrir a boca.',
    services: [
      {
        id: 'branding',
        title: 'Branding & Identidade Visual',
        description:
          'Criamos identidades visuais completas: logo, paleta, tipografia e brandbook. Sua marca passa a comunicar quem você é antes mesmo de abrir a boca.',
        deliverables: ['Logo', 'Paleta e tipografia', 'Brandbook'],
        impact:
          'Eleva a percepção de valor, diferencia sua empresa dos concorrentes e transmite mais confiança desde o primeiro contato.',
      },
      {
        id: 'design-motion',
        title: 'Design Gráfico & Motion',
        description:
          'Peças gráficas para digital e impresso, animações em motion graphics e vídeos animados. Conteúdo visual que comunica com impacto e retém atenção.',
        deliverables: ['Peças digitais e impressas', 'Motion graphics', 'Vídeos animados'],
        impact:
          'Faz sua comunicação ser percebida mais rápido, melhora a retenção da mensagem e dá consistência visual a campanhas e materiais comerciais.',
      },
      {
        id: 'sites',
        title: 'Sites & Landing Pages',
        description:
          'Sites institucionais e landing pages otimizadas para conversão. Design responsivo, copy persuasivo e integração com ferramentas de automação e CRM.',
        deliverables: ['Sites institucionais', 'Landing pages de conversão', 'Copy persuasivo', 'Integração com CRM e automação'],
        impact:
          'Transforma visitas em oportunidades 24 horas por dia, organiza a captação de contatos e reduz o atrito entre o interesse e a conversa comercial.',
      },
    ],
  },
  {
    n: '04',
    id: 'imagem',
    name: 'Imagem',
    promise: 'O que as palavras não conseguem mostrar.',
    intro: 'Produção audiovisual própria, no chão e no ar, para campanhas, redes sociais e vídeos institucionais.',
    services: [
      {
        id: 'audiovisual',
        title: 'Captação Audiovisual',
        description:
          'Produção de vídeos profissionais para campanhas, redes sociais e institucionais. Direção, gravação e edição com padrão de qualidade que eleva sua marca.',
        deliverables: ['Direção', 'Gravação', 'Edição'],
        impact:
          'Demonstra produtos, histórias e diferenciais com mais clareza, aumentando atenção, confiança e capacidade de convencimento.',
      },
      {
        id: 'drone',
        title: 'Captação com Drone',
        description:
          'Imagens e vídeos aéreos de alta resolução para imóveis, eventos e campanhas de impacto. Perspectivas que nenhuma câmera convencional consegue entregar.',
        deliverables: ['Foto e vídeo aéreo', 'Imóveis e empreendimentos', 'Eventos e campanhas'],
        impact:
          'Valoriza espaços, projetos e experiências com uma perspectiva marcante, ajudando sua oferta a se destacar e ser lembrada.',
      },
    ],
  },
];

export const DIFFERENTIALS = [
  { theme: 'Estratégia antes da execução', them: 'Começa pelo post e pelo anúncio.', us: 'Começa pelo diagnóstico do seu negócio, mercado e oportunidades reais.' },
  { theme: 'Criatividade com objetivo', them: 'Peça bonita que não sabe o que precisa gerar.', us: 'Execução criativa que nasce dos dados e trabalha por uma meta.' },
  { theme: 'Visão de negócio', them: 'Fala de curtidas e alcance.', us: 'Conecta cada ação de marketing às metas comerciais da empresa.' },
  { theme: 'Tudo integrado', them: 'Um fornecedor para cada coisa, ninguém responsável pelo todo.', us: 'Estratégia, mídia, marca e imagem no mesmo time, no mesmo plano.' },
];

export const STEPS = [
  { n: '01', title: 'Diagnóstico gratuito', text: 'Mapeamos seu negócio, mercado e oportunidades reais. Sem compromisso, sem pressão de venda.' },
  { n: '02', title: 'Plano personalizado', text: 'Cada estratégia é construída do zero para o seu negócio. Nada de pacote padrão que serve pra todo mundo.' },
  { n: '03', title: 'Execução que você acompanha', text: 'Você vê o que está sendo feito, quanto está sendo investido e o que está trazendo de retorno, todo mês.' },
  { n: '04', title: 'Otimização contínua', text: 'O que funciona ganha mais verba. O que não funciona sai. Assim o marketing vira um motor de crescimento, não uma aposta.' },
];

export const FAQ = [
  {
    q: 'Para que tipo de empresa a Backe é indicada?',
    a: 'Para empresas que já vendem e querem crescer com previsibilidade: negócios locais, prestadores de serviço, varejo, imobiliárias, saúde, eventos e marcas pessoais. Se você está começando do zero, o diagnóstico mostra se faz sentido começar agora ou o que preparar antes.',
  },
  {
    q: 'Quanto tempo leva para ver resultados?',
    a: 'Em tráfego pago, os primeiros dados já aparecem nos dias iniciais de campanha ativa. Porém, é entre 60 e 90 dias que a estratégia se consolida e os resultados começam a crescer de forma consistente.',
  },
  {
    q: 'Preciso contratar todos os serviços? Qual o investimento?',
    a: 'Não. O diagnóstico mostra onde está o maior gargalo do seu negócio, e o plano começa por ele. Por isso não existe pacote fechado: na reunião de diagnóstico apresentamos uma proposta sob medida, com valores claros e sem surpresa.',
  },
  {
    q: 'Como funciona o contrato?',
    a: 'Trabalhamos com contratos mensais renováveis, sem fidelidade forçada. Para serviços de gestão contínua, recomendamos um ciclo mínimo de 3 meses para a estratégia ter tempo de mostrar resultado real.',
  },
  {
    q: 'Quem vai cuidar da minha empresa?',
    a: 'Um time sênior da própria Backe. Não terceirizamos o atendimento, e muito menos o pensamento estratégico.',
  },
  {
    q: 'Como acompanho os resultados?',
    a: 'Você acompanha relatórios mensais, principais indicadores e reuniões de alinhamento. Quando aplicável, também damos visibilidade das plataformas de mídia e automação.',
  },
  {
    q: 'Vocês criam os criativos ou eu preciso fornecer?',
    a: 'Depende do escopo. Em projetos de criação, design ou audiovisual, cuidamos da produção. Em escopos só de gestão, entregamos roteiros, briefings e direcionamento criativo.',
  },
  {
    q: 'Vocês atendem fora de Brasília?',
    a: 'Sim. Atendemos clientes em qualquer lugar do Brasil e do mundo de forma remota. Para serviços presenciais, como captação audiovisual e drone, alinhamos logística e deslocamento no escopo.',
  },
];

/** Garantias ao lado do formulário. `icon` é a chave do desenho em Contact.astro; `t` tem a palavra-chave em <em>. */
export const GUARANTEES = [
  { icon: 'free', t: 'Diagnóstico 100% <em>gratuito</em>', d: 'Sem custo e sem compromisso.' },
  { icon: 'clock', t: 'Resposta em até <em>24h</em>', d: 'Em dias úteis, direto no seu WhatsApp.' },
  { icon: 'target', t: 'Feito para o seu <em>nicho</em>', d: 'Estratégia personalizada, nada de pacote pronto.' },
  { icon: 'team', t: 'Time <em>sênior</em>', d: 'Sem terceirizar o seu atendimento.' },
  { icon: 'unlock', t: 'Sem <em>fidelidade</em> forçada', d: 'Você fica pelo resultado, não pelo contrato.' },
];

/** Opções da etapa 3 do formulário → campo `serviceInterest` do worker. */
export const INTEREST_OPTIONS = [
  'Diagnóstico gratuito',
  'Estratégia & Performance',
  'Tráfego Pago',
  'Gestão de Redes Sociais',
  'Branding & Identidade Visual',
  'Sites & Landing Pages',
  'Captação Audiovisual / Drone',
];
