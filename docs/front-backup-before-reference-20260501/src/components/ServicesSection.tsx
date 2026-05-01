import serviceTraffic from "@/assets/service-traffic.jpg";
import serviceDesign from "@/assets/service-design.jpg";
import serviceCaptacao from "@/assets/service-captacao.jpg";

const services = [
  {
    title: "Gestão de Tráfego",
    image: serviceTraffic,
    cta: "Receber diagnóstico",
  },
  {
    title: "Identidade Visual e Design Gráfico",
    image: serviceDesign,
    cta: "Receber diagnóstico",
  },
  {
    title: "Captação",
    image: serviceCaptacao,
    cta: "Entre em contato",
  },
];

const ServicesSection = () => {
  const scrollToForm = (serviceInterest: string) => {
    window.dispatchEvent(
      new CustomEvent("backe:lead-interest", {
        detail: { serviceInterest },
      })
    );
    document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Outline title */}
      <div className="container mx-auto px-6 md:px-16 mb-16">
        <h2 className="text-outline text-5xl md:text-8xl lg:text-9xl font-heading font-bold uppercase text-center select-none">
          O QUE FAZEMOS
        </h2>
      </div>

      <div className="container mx-auto px-6 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {services.map((service, i) => (
            <div
              key={service.title}
              className={`group relative ${i === 1 ? "md:mt-12" : ""}`}
            >
              <div className="relative overflow-hidden rounded-xl mb-6">
                <img
                  src={service.image}
                  alt={service.title}
                  loading="lazy"
                  width={640}
                  height={512}
                  className="w-full h-64 md:h-72 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-background/30 group-hover:bg-background/10 transition-colors duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"
                  style={{ boxShadow: "inset 0 0 40px hsl(14, 91%, 54%, 0.15)" }}
                />
              </div>

              <h3 className="text-foreground font-heading font-bold text-xl mb-4">
                {service.title}
              </h3>

              <button
                onClick={() => scrollToForm(service.title)}
                className="flex items-center gap-2 text-primary font-heading font-semibold text-sm uppercase tracking-wider hover:gap-3 transition-all duration-300"
              >
                {service.cta}
                <span className="text-primary">▶</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
