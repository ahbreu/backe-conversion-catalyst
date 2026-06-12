const logos = [
  "5uinta.png",
  "acai.png",
  "assim.png",
  "fazendinho.png",
  "funn.png",
  "globo.png",
  "nossa.png",
  "panela.png",
  "pl4no.png",
  "pueblito.png",
  "quituarte.png",
  "rede-dos-cosmeticos.png",
  "sexta.png",
  "trust.png",
  "world-gym.png",
];

const ClientsMarquee = () => {
  return (
    <section className="clients-marquee-section border-y border-border py-8 overflow-hidden bg-background">
      <div className="clients-marquee-track">
        {[...logos, ...logos].map((logo, index) => (
          <img
            key={`${logo}-${index}`}
            src={`/logos/${logo}`}
            alt={logo.replace(".png", "")}
            className="clients-marquee-logo h-[50px] md:h-[70px] w-auto flex-shrink-0"
          />
        ))}
      </div>
    </section>
  );
};

export default ClientsMarquee;
