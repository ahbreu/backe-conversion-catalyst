import logoTransparent from "@/assets/logo-backe-transparent.png";
import { useSEO } from "@/hooks/useSEO";

interface BlogPostData {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  content: string[];
}

const posts: BlogPostData[] = [
  {
    slug: "marketing-para-pequenas-empresas",
    title: "Marketing para Pequenas Empresas: Guia Prático para Começar",
    excerpt: "Descubra como estruturar uma estratégia de marketing digital que cabe no seu orçamento e gera resultados reais para o seu negócio.",
    date: "2026-05-20",
    category: "Marketing Digital",
    readTime: "8 min",
    content: [
      "Pequenas empresas enfrentam um desafio constante: como fazer marketing com orçamento limitado? A boa notícia é que você não precisa de um budget de grande empresa para começar a construir presença digital e atrair clientes.",
      "O primeiro passo é definir seu público-alvo com clareza. Quem é seu cliente ideal? Onde ele está? Quais problemas ele precisa resolver? Quanto mais específico você for, mais eficiente será seu investimento em marketing.",
      "Comece com o básico: um site profissional e bem otimizado para SEO. Sua página é seu cartão de visitas digital. Invista em um design limpo, carregamento rápido e conteúdo relevante que responda às perguntas dos seus clientes.",
      "O Google Meu Negócio é gratuito e essencial para negócios locais. Mantenha suas informações atualizadas, responda avaliações e publique fotos regularmente. Isso aumenta sua visibilidade nas buscas locais.",
      "Nas redes sociais, escolha uma ou duas plataformas onde seu público está presente, em vez de tentar estar em todas. Produza conteúdo consistente e engaje com seus seguidores. Qualidade supera quantidade.",
      "E-mail marketing continua sendo um dos canais com melhor ROI. Construa sua lista desde o primeiro dia e nutra seus contatos com conteúdo relevante. Ferramentas como Mailchimp têm planos gratuitos para começar.",
      "Por fim, meça seus resultados. Use ferramentas como Google Analytics para entender o que funciona e ajustar sua estratégia. Marketing digital é um processo contínuo de teste, aprendizado e otimização.",
    ],
  },
  {
    slug: "trafego-pago-para-iniciantes",
    title: "Tráfego Pago para Iniciantes: O Que Você Precisa Saber Antes de Investir",
    excerpt: "Aprenda os fundamentos do tráfego pago, como definir orçamento e evitar erros comuns que queimam verba sem trazer retorno.",
    date: "2026-05-13",
    category: "Tráfego Pago",
    readTime: "10 min",
    content: [
      "Tráfego pago é uma das formas mais rápidas de atrair clientes, mas também uma das mais fáceis de desperdiçar dinheiro se não for feita corretamente. Antes de investir, é fundamental entender os princípios básicos.",
      "O primeiro passo é definir seu objetivo. Você quer vendas diretas, geração de leads, tráfego para o site ou reconhecimento de marca? Cada objetivo exige uma estratégia diferente e métricas específicas de sucesso.",
      "Conheça seu público profundamente. As plataformas de anúncios oferecem segmentações poderosas, mas elas só funcionam se você souber exatamente quem está procurando. Crie personas detalhadas antes de começar.",
      "Comece com um orçamento pequeno para testar. Não invista todo seu budget de uma vez. Crie variações de anúncios, teste diferentes públicos e criativos, e escale apenas o que funciona. A regra de ouro: teste pequeno, escale o que der certo.",
      "Acompanhe suas métricas religiosamente. Custo por clique (CPC), taxa de conversão, retorno sobre investimento (ROAS) e custo por lead (CPL) são indicadores essenciais. Se uma campanha não está performando, pausa e ajusta antes de colocar mais dinheiro.",
      "Invista em páginas de destino (landing pages) otimizadas. Não adianta mandar tráfego pago para sua página inicial genérica. Crie páginas específicas para cada campanha, com mensagem clara e um único objetivo de conversão.",
      "Lembre-se: tráfego pago potencializa o que já funciona. Se seu produto, serviço ou site não está convertendo bem organicamente, os anúncios vão apenas acelerar o desperdício de dinheiro. Resolva a base primeiro.",
    ],
  },
  {
    slug: "branding-identidade-visual",
    title: "Branding e Identidade Visual: Por Que Sua Marca Precisa de Ambos",
    excerpt: "Entenda a diferença entre branding e identidade visual, e como os dois trabalham juntos para construir uma marca forte e memorável.",
    date: "2026-05-06",
    category: "Branding",
    readTime: "6 min",
    content: [
      "Branding e identidade visual são frequentemente confundidos, mas representam conceitos diferentes e complementares. Enquanto um é a alma do negócio, o outro é o corpo que dá forma a essa alma.",
      "Branding é o conjunto de estratégias para construir e gerenciar a percepção da sua marca. É a promessa que você faz ao cliente e a experiência que ele tem ao interagir com seu negócio. Inclui propósito, valores, personalidade e posicionamento.",
      "Identidade visual é a parte tangível da marca: logotipo, cores, tipografia, imagens e todos os elementos visuais que representam a empresa. É o que as pessoas veem e reconhecem.",
      "Uma marca forte começa com um branding sólido. Antes de pensar em logotipo ou cores, defina: qual é seu propósito? Para quem você existe? O que te diferencia da concorrência? Como você quer ser percebido?",
      "Com o branding definido, a identidade visual traduz esses conceitos em elementos concretos. Um logotipo bem desenhado, uma paleta de cores coerente e uma tipografia consistente comunicam visualmente os valores da marca.",
      "A consistência é fundamental. Sua marca deve ser reconhecível em todos os pontos de contato: site, redes sociais, embalagens, atendimento. Cada interação reforça ou enfraquece a percepção que o cliente tem de você.",
      "Invista em branding e identidade visual desde o início. Marcas fortes não são construídas da noite para o dia, mas cada passo consistente cria uma base sólida para o crescimento sustentável do seu negócio.",
    ],
  },
];

const schemaForPost = (post: BlogPostData) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.excerpt,
  datePublished: post.date,
  author: {
    "@type": "Organization",
    name: "BACKE.co",
  },
  publisher: {
    "@type": "Organization",
    name: "BACKE.co",
    url: "https://backe.co",
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `https://backe.co/#/blog/${post.slug}`,
  },
});

interface BlogPostProps {
  slug: string;
}

const BlogPost = ({ slug }: BlogPostProps) => {
  const post = posts.find((p) => p.slug === slug);

  useSEO({
    title: post ? `${post.title} | Blog BACKE.co` : "Blog | BACKE.co",
    description: post ? post.excerpt : "Artigo não encontrado.",
    canonicalUrl: `https://backe.co/#/blog/${slug}`,
    schema: post ? schemaForPost(post) : undefined,
  });

  if (!post) {
    return (
      <main className="backe-reference">
        <nav className="br-nav" aria-label="Navegação principal">
          <a className="br-nav-logo" href="#/" aria-label="BACKE.co">
            <img src={logoTransparent} alt="BACKE.co" />
          </a>
          <div className="br-nav-links">
            <a href="#/">Home</a>
            <a href="#/blog" className="active">Blog</a>
          </div>
          <a className="br-btn-main" href="#/">
            Diagnóstico gratuito
          </a>
        </nav>
        <section className="br-section" style={{ paddingTop: "8rem" }}>
          <div className="br-wrap" style={{ textAlign: "center" }}>
            <h2 className="br-title">Artigo não encontrado</h2>
            <p className="br-subtitle">Volte para o <a href="#/blog" style={{ color: "var(--br-orange)" }}>blog</a> e confira nossos artigos.</p>
          </div>
        </section>
        <footer className="br-footer">
          <img src={logoTransparent} alt="BACKE.co" />
          <p>© 2026 BACKE.co. Todos os direitos reservados.</p>
        </footer>
      </main>
    );
  }

  return (
    <main className="backe-reference">
      <nav className="br-nav" aria-label="Navegação principal">
        <a className="br-nav-logo" href="#/" aria-label="BACKE.co">
          <img src={logoTransparent} alt="BACKE.co" />
        </a>
        <div className="br-nav-links">
          <a href="#/">Home</a>
          <a href="#/blog" className="active">Blog</a>
        </div>
        <a className="br-btn-main" href="#/">
          Diagnóstico gratuito
        </a>
      </nav>

      <section className="br-section" style={{ paddingTop: "8rem" }}>
        <div className="br-wrap">
          <a href="#/blog" className="br-blog-back" style={{ color: "var(--br-orange)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px", fontSize: "15px" }}>
            ← Voltar para o blog
          </a>

          <div className="br-blog-meta" style={{ marginBottom: "16px" }}>
            <span className="br-blog-category">{post.category}</span>
            <span className="br-blog-date">{post.date} · {post.readTime}</span>
          </div>

          <h1 className="br-title" style={{ fontSize: "clamp(28px, 4vw, 48px)", marginBottom: "20px" }}>
            {post.title}
          </h1>

          <p className="br-subtitle" style={{ fontSize: "17px", marginBottom: "40px" }}>
            {post.excerpt}
          </p>

          <div className="br-blog-body" style={{
            maxWidth: "720px",
            margin: "0 auto",
            fontSize: "17px",
            lineHeight: 1.8,
            color: "var(--br-text-2)",
          }}>
            {post.content.map((paragraph, i) => (
              <p key={i} style={{ marginBottom: "20px" }}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="br-section" style={{ borderTop: "1px solid var(--br-border)" }}>
        <div className="br-wrap" style={{ textAlign: "center" }}>
          <h2 className="br-title">
            Leia mais artigos
            <br />
            <span className="br-gradient-text">no nosso blog</span>
          </h2>
          <a className="br-btn-main br-btn-large" href="#/blog" style={{ marginTop: "24px" }}>
            Ver todos os artigos
          </a>
        </div>
      </section>

      <footer className="br-footer">
        <img src={logoTransparent} alt="BACKE.co" />
        <p>© 2026 BACKE.co. Todos os direitos reservados.</p>
        <div className="br-foot-links">
          <a href="https://www.instagram.com/backe.co/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="#/blog">Blog</a>
        </div>
      </footer>
    </main>
  );
};

export default BlogPost;
