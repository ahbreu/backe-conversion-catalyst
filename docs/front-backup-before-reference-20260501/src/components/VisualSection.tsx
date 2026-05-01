import heroVisual from "@/assets/hero-visual.jpg";

const VisualSection = () => {
  return (
    <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
      <img
        src={heroVisual}
        alt="Equipe criativa trabalhando"
        loading="lazy"
        width={1920}
        height={800}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-background/60" />
      <div className="relative z-10 flex items-end h-full px-6 md:px-16 pb-16">
        <h2 className="text-foreground font-heading font-bold text-4xl md:text-6xl lg:text-7xl uppercase leading-tight max-w-3xl">
          Ground Breaking
          <br />
          Technology
        </h2>
      </div>
    </section>
  );
};

export default VisualSection;
