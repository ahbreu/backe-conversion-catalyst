import logoTransparent from "@/assets/logo-backe-transparent.png";

const HeroSection = () => {
  const scrollToForm = () => {
    document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Animated background pattern - hexagonal grid */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" viewBox="0 0 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="glow1" cx="70%" cy="30%" r="50%">
              <stop offset="0%" stopColor="hsl(14, 91%, 54%)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glow2" cx="30%" cy="70%" r="40%">
              <stop offset="0%" stopColor="hsl(7, 89%, 55%)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="900" fill="url(#glow1)" />
          <rect width="1200" height="900" fill="url(#glow2)" />
          {/* Hexagon grid */}
          {Array.from({ length: 6 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => {
              const x = col * 160 + (row % 2 === 0 ? 0 : 80);
              const y = row * 140;
              const size = 70;
              const points = Array.from({ length: 6 }).map((_, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
              }).join(" ");
              return (
                <polygon
                  key={`hex-${row}-${col}`}
                  points={points}
                  stroke="hsl(14, 91%, 54%)"
                  strokeWidth="0.6"
                  fill="none"
                  opacity="0.07"
                />
              );
            })
          )}
          {/* Diagonal lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`diag-${i}`}
              x1={-100 + i * 150}
              y1={0}
              x2={100 + i * 150}
              y2={900}
              stroke="hsl(7, 89%, 55%)"
              strokeWidth="0.4"
              opacity="0.06"
            />
          ))}
          {/* Floating dots */}
          {Array.from({ length: 20 }).map((_, i) => (
            <circle
              key={`dot-${i}`}
              cx={60 + (i * 137) % 1100}
              cy={40 + (i * 89) % 820}
              r="1.5"
              fill="hsl(14, 91%, 54%)"
              opacity="0.15"
            />
          ))}
        </svg>
      </div>

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 md:px-16 py-6">
        <img src={logoTransparent} alt="BACKE Creative" className="h-10 md:h-14" />
      </nav>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-16 text-center mt-20">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-8">
          <span className="text-gradient">Criatividade</span>
          <br />
          <span className="text-foreground">que chama atenção.</span>
          <br />
          <span className="text-gradient">Estratégia</span>
          <br />
          <span className="text-foreground">que gera resultado.</span>
        </h1>

        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-12 font-body leading-relaxed">
          Nós estudamos seu mercado, entendemos o que realmente move vendas e criamos campanhas
          pensadas para transformar atenção em clientes e marketing em crescimento real.
        </p>

        <button
          onClick={scrollToForm}
          className="bg-gradient-brand text-primary-foreground font-heading font-semibold text-sm md:text-base tracking-widest uppercase px-10 py-4 rounded-full glow-brand hover:glow-brand-hover transition-all duration-300 hover:scale-105"
        >
          Receber Diagnóstico
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
