import logoTransparent from "@/assets/logo-backe-transparent.png";

const HeroSection = () => {
  const titleHighlightClass =
    "bg-[linear-gradient(180deg,_#f4511e_0%,_#f44730_100%)] bg-clip-text text-transparent";

  const scrollToForm = () => {
    document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
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
      <nav className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-5 md:px-16 md:py-6">
        <img src={logoTransparent} alt="BACKE Creative" className="h-8 md:h-12" />
      </nav>

      {/* Content */}
      <div className="relative z-10 container mx-auto flex min-h-[100svh] flex-col items-center justify-center px-6 pb-10 pt-24 text-center md:px-16 md:pb-14 md:pt-28">
        <h1 className="mx-auto max-w-[10ch] text-center text-[clamp(2.1rem,5.6vw,4.9rem)] font-display font-bold leading-[0.88] tracking-[-0.03em]">
          <span className={`${titleHighlightClass} block`}>Criatividade</span>
          <span className="block text-foreground">que chama</span>
          <span className="block text-foreground">atenção.</span>
          <span className={`${titleHighlightClass} mt-[0.08em] block`}>Estratégia</span>
          <span className="block text-foreground">que gera</span>
          <span className="block text-foreground">resultado.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base font-body leading-relaxed text-muted-foreground md:mt-8 md:text-lg">
          Criatividade e estratégia unidas para transformar o marketing da sua empresa em um canal de aquisição que gera clientes e escala o faturamento todo mês.
        </p>

        <button
          onClick={scrollToForm}
          className="mt-8 rounded-full bg-gradient-brand px-10 py-4 font-heading text-sm font-semibold uppercase tracking-widest text-primary-foreground transition-all duration-300 hover:scale-105 glow-brand hover:glow-brand-hover md:mt-10 md:text-base"
        >
          Receber Diagnóstico
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
