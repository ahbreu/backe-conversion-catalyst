import logoTransparent from "@/assets/logo-backe-transparent.png";

const steps = [
  {
    number: "01",
    title: "Cadastro rápido",
    description: "Preencha seus dados e diga como conhece empresas que precisam de marketing digital.",
  },
  {
    number: "02",
    title: "Indicação feita",
    description: "Apresente a BACKE.co para seu cliente. Nós cuidamos do diagnóstico gratuito e da proposta comercial.",
  },
  {
    number: "03",
    title: "Comissão garantida",
    description: "Se o cliente fechar conosco, você recebe 15% do valor do primeiro mês de contrato. Sem burocracia.",
  },
];

const partnerTypes = [
  {
    type: "Contadores",
    description: "Escritórios contábeis que atendem PMEs e querem oferecer marketing digital como serviço agregado.",
  },
  {
    type: "Desenvolvedores",
    description: "Devs freelancers que criam sites mas não oferecem gestão de tráfego ou marketing contínuo.",
  },
  {
    type: "Consultores",
    description: "Mentores, coaches e consultores de negócio que identificam oportunidades de marketing nos clientes.",
  },
  {
    type: "Associações",
    description: "CDL, SEBRAE, sindicatos e associações comerciais que buscam benefícios reais para seus associados.",
  },
];

const Parceiros = () => {
  return (
    <main className="backe-reference">
      <nav className="br-nav" aria-label="Navegação principal">
        <a className="br-nav-logo" href="#/" aria-label="BACKE.co">
          <img src={logoTransparent} alt="BACKE.co" />
        </a>
        <div className="br-nav-links">
          <a href="#/">Home</a>
          <a href="#/blog">Blog</a>
          <a href="#/parceiros" className="active">Seja Parceiro</a>
        </div>
        <a className="br-btn-main" href="#/">
          Diagnóstico gratuito
        </a>
      </nav>

      <section className="br-section" style={{ paddingTop: "8rem" }}>
        <div className="br-wrap">
          <div className="br-label">Programa de Parcerias</div>
          <h2 className="br-title">
            Transforme sua rede em
            <br />
            <span className="br-gradient-text">receita recorrente</span>
          </h2>
          <p className="br-subtitle" style={{ maxWidth: 640 }}>
            Você indica, a BACKE.co faz todo o trabalho de marketing e vendas. Se o cliente fechar, você ganha comissão.
            Simples assim.
          </p>

          <div className="br-partner-commission">
            <span className="br-commission-value">15%</span>
            <span className="br-commission-label">de comissão no primeiro mês do contrato</span>
          </div>

          <div className="br-process-grid" style={{ marginTop: 48 }}>
            {steps.map((step) => (
              <article className="br-process" key={step.number}>
                <div className="br-process-num" style={{ background: "linear-gradient(118deg, var(--br-orange), var(--br-coral))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="br-section" style={{ background: "var(--br-bg-2)" }}>
        <div className="br-wrap">
          <div className="br-label">Quem pode participar</div>
          <h2 className="br-title">
            Perfis de <span className="br-gradient-text">parceiros</span>
          </h2>
          <p className="br-subtitle">
            Profissionais e organizações que estão próximos de empresas que precisam de marketing digital.
          </p>

          <div className="br-partner-grid">
            {partnerTypes.map((partner) => (
              <article className="br-blog-card" key={partner.type}>
                <h3 className="br-blog-title" style={{ marginBottom: 8 }}>{partner.type}</h3>
                <p className="br-blog-excerpt">{partner.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="br-section">
        <div className="br-wrap" style={{ textAlign: "center" }}>
          <div className="br-label">Quero ser parceiro</div>
          <h2 className="br-title">
            Vamos crescer <span className="br-gradient-text">juntos</span>
          </h2>
          <p className="br-subtitle">
            Entre em contato pelo WhatsApp ou e-mail e descubra como podemos construir uma parceria de sucesso.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <a className="br-btn-main br-btn-large" href="https://wa.me/556192240234?text=Ol%C3%A1!%20Quero%20ser%20parceiro%20da%20BACKE.co" target="_blank" rel="noreferrer">
              Falar no WhatsApp
            </a>
            <a className="br-btn-ghost" href="mailto:parcerias@backe.co" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", border: "1px solid var(--br-border)", borderRadius: 8, color: "var(--br-text-1)", textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
              Enviar e-mail
            </a>
          </div>
        </div>
      </section>

      <footer className="br-footer">
        <img src={logoTransparent} alt="BACKE.co" />
        <p>© 2026 BACKE.co. Todos os direitos reservados.</p>
        <div className="br-foot-links">
          <a href="https://www.instagram.com/backe.co/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="#/blog">Blog</a>
          <a href="#/parceiros">Seja Parceiro</a>
        </div>
      </footer>
    </main>
  );
};

export default Parceiros;