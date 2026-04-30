import logoTransparent from "@/assets/logo-backe-transparent.png";
import { MAINTENANCE_CONTACT } from "@/config/maintenance";

const MaintenancePage = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        <svg
          className="h-full w-full"
          viewBox="0 0 1200 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="maintenanceGlowOne" cx="68%" cy="24%" r="45%">
              <stop offset="0%" stopColor="hsl(14, 91%, 54%)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="maintenanceGlowTwo" cx="24%" cy="72%" r="42%">
              <stop offset="0%" stopColor="hsl(7, 89%, 55%)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="900" fill="url(#maintenanceGlowOne)" />
          <rect width="1200" height="900" fill="url(#maintenanceGlowTwo)" />
          {Array.from({ length: 6 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => {
              const x = col * 160 + (row % 2 === 0 ? 0 : 80);
              const y = row * 140;
              const size = 70;
              const points = Array.from({ length: 6 })
                .map((__, i) => {
                  const angle = (Math.PI / 3) * i - Math.PI / 6;
                  return `${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`;
                })
                .join(" ");

              return (
                <polygon
                  key={`maintenance-hex-${row}-${col}`}
                  points={points}
                  stroke="hsl(14, 91%, 54%)"
                  strokeWidth="0.6"
                  fill="none"
                  opacity="0.08"
                />
              );
            })
          )}
        </svg>
      </div>

      <div className="absolute inset-x-0 top-0 z-10 border-b border-foreground/10 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-5 md:px-16">
          <img src={logoTransparent} alt="BACKE Creative" className="h-8 md:h-11" />
          <span className="rounded-full border border-primary/40 px-4 py-2 font-heading text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary">
            Em atualiza&ccedil;&atilde;o
          </span>
        </div>
      </div>

      <section className="relative z-10 flex min-h-screen items-center px-6 pb-16 pt-28 md:px-16 md:pt-32">
        <div className="container mx-auto grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.55fr)]">
          <div className="max-w-3xl">
            <p className="mb-5 font-heading text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Site em constru&ccedil;&atilde;o
            </p>
            <h1 className="font-display text-[clamp(2.6rem,7vw,6.5rem)] font-bold leading-[0.88] tracking-normal">
              Estamos atualizando nossa presen&ccedil;a digital.
            </h1>
            <p className="mt-7 max-w-2xl font-body text-base leading-relaxed text-muted-foreground md:text-lg">
              O site da Backe est&aacute; sendo preparado para uma nova fase. Em breve,
              voltaremos com uma experi&ecirc;ncia mais completa para apresentar nossos
              servi&ccedil;os, projetos e canais de atendimento.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href={MAINTENANCE_CONTACT.href}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-brand px-8 py-3 font-heading text-sm font-semibold uppercase tracking-widest text-primary-foreground transition-all duration-300 glow-brand hover:scale-[1.02] hover:glow-brand-hover"
              >
                {MAINTENANCE_CONTACT.label}
              </a>
              <span className="font-body text-sm leading-relaxed text-muted-foreground">
                Atendimento dispon&iacute;vel pelos canais comerciais da Backe.
              </span>
            </div>
          </div>

          <aside className="border-l border-primary/40 pl-6 md:pl-8">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Voltamos em breve
            </p>
            <p className="mt-5 font-body text-2xl font-medium leading-tight text-foreground md:text-3xl">
              Obrigado pela paci&ecirc;ncia enquanto finalizamos os pr&oacute;ximos detalhes.
            </p>
            <div className="mt-8 h-1 w-28 rounded-full bg-gradient-brand" />
          </aside>
        </div>
      </section>
    </main>
  );
};

export default MaintenancePage;
