import { useEffect } from "react";
import logoTransparent from "@/assets/logo-backe-transparent.png";
import { useSEO } from "@/hooks/useSEO";

const posts = [
  {
    slug: "marketing-para-pequenas-empresas",
    title: "Marketing para Pequenas Empresas: Guia Prático para Começar",
    excerpt: "Descubra como estruturar uma estratégia de marketing digital que cabe no seu orçamento e gera resultados reais para o seu negócio.",
    date: "2026-05-20",
    category: "Marketing Digital",
    readTime: "8 min",
  },
  {
    slug: "trafego-pago-para-iniciantes",
    title: "Tráfego Pago para Iniciantes: O Que Você Precisa Saber Antes de Investir",
    excerpt: "Aprenda os fundamentos do tráfego pago, como definir orçamento e evitar erros comuns que queimam verba sem trazer retorno.",
    date: "2026-05-13",
    category: "Tráfego Pago",
    readTime: "10 min",
  },
  {
    slug: "branding-identidade-visual",
    title: "Branding e Identidade Visual: Por Que Sua Marca Precisa de Ambos",
    excerpt: "Entenda a diferença entre branding e identidade visual, e como os dois trabalham juntos para construir uma marca forte e memorável.",
    date: "2026-05-06",
    category: "Branding",
    readTime: "6 min",
  },
];

const POST_SCHEMAS = posts.map((post) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.excerpt,
  datePublished: post.date,
  url: `https://backe.co/#/blog/${post.slug}`,
  author: {
    "@type": "Organization",
    name: "BACKE.co",
  },
}));

const BLOG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Blog BACKE.co",
  description: "Artigos sobre marketing digital, tráfego pago, branding, automação e estratégia para pequenas empresas.",
  url: "https://backe.co/#/blog",
  blogPost: POST_SCHEMAS,
};

const Blog = () => {
  useSEO({
    title: "Blog | BACKE.co — Marketing Digital, Tráfego Pago e Branding",
    description: "Artigos sobre marketing digital, tráfego pago, branding, automação e estratégia para pequenas empresas. Aprenda com a BACKE.co.",
    canonicalUrl: "https://backe.co/#/blog",
    schema: BLOG_SCHEMA,
  });

  const goHome = () => {
    window.location.hash = "#/";
  };

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
        <button className="br-btn-main" type="button" onClick={goHome}>
          Diagnóstico gratuito
        </button>
      </nav>

      <section className="br-section" style={{ paddingTop: "8rem" }}>
        <div className="br-wrap">
          <div className="br-label">Blog</div>
          <h2 className="br-title">
            Conteúdo para
            <br />
            <span className="br-gradient-text">crescer sua marca</span>
          </h2>
          <p className="br-subtitle">
            Artigos sobre marketing digital, tráfego pago, branding, automação e estratégia para pequenas empresas.
          </p>

          <div className="br-blog-grid">
            {posts.map((post) => (
              <a className="br-blog-card" href={`#/blog/${post.slug}`} key={post.slug}>
                <article>
                  <div className="br-blog-meta">
                    <span className="br-blog-category">{post.category}</span>
                    <span className="br-blog-date">{post.date} · {post.readTime}</span>
                  </div>
                  <h3 className="br-blog-title">{post.title}</h3>
                  <p className="br-blog-excerpt">{post.excerpt}</p>
                  <span className="br-blog-read">Ler artigo →</span>
                </article>
              </a>
            ))}
          </div>
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

export default Blog;