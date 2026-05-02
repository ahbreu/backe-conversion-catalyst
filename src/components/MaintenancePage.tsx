import logoTransparent from "@/assets/logo-backe-transparent.png";
import { MAINTENANCE_CONTACT } from "@/config/maintenance";

const MaintenancePage = () => {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
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

      <div className="absolute inset-x-0 top-0 z-10 border-b border-foreground/10 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 md:px-10 lg:px-16">
          <img src={logoTransparent} alt="BACKE Creative" className="h-8 w-8 shrink-0 md:h-11 md:w-11" />
          <span className="shrink-0 whitespace-nowrap rounded-full border border-primary/40 px-2.5 py-1.5 font-heading text-[0.54rem] font-semibold uppercase leading-none tracking-[0.08em] text-primary min-[360px]:px-3 min-[360px]:text-[0.58rem] min-[360px]:tracking-[0.14em] sm:px-4 sm:py-2 sm:text-[0.68rem] sm:tracking-[0.22em]">
            <span className="sm:hidden">Atualizando</span>
            <span className="hidden sm:inline">Em atualiza&ccedil;&atilde;o</span>
          </span>
        </div>
      </div>

      <section className="relative z-10 flex min-h-[100dvh] items-center px-4 pb-12 pt-24 sm:px-6 sm:pt-28 md:px-10 md:pb-16 md:pt-32 lg:px-16">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 items-center gap-9 sm:gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.55fr)]">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-4 font-heading text-xs font-semibold uppercase leading-relaxed tracking-[0.18em] text-primary sm:mb-5 sm:text-sm sm:tracking-[0.28em]">
              Site em constru&ccedil;&atilde;o
            </p>
            <h1 className="max-w-[12ch] font-heading text-[clamp(2.25rem,11vw,4.1rem)] font-bold leading-[1.08] tracking-normal text-balance sm:max-w-3xl sm:text-[clamp(3rem,7vw,6.5rem)] sm:leading-[1.04]">
              Estamos atualizando nossa presen&ccedil;a digital.
            </h1>
            <p className="mt-6 max-w-full font-body text-base leading-relaxed text-muted-foreground sm:mt-7 sm:max-w-2xl md:text-lg">
              O site da Backe est&aacute; sendo preparado para uma nova fase. Em breve,
              voltaremos com uma experi&ecirc;ncia mais completa para apresentar nossos
              servi&ccedil;os, projetos e canais de atendimento.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:mt-9 sm:flex-row sm:items-center">
              <a
                href={MAINTENANCE_CONTACT.href}
                className="inline-flex min-h-12 w-full max-w-full items-center justify-center rounded-full bg-gradient-brand px-6 py-3 text-center font-heading text-xs font-semibold uppercase leading-relaxed tracking-[0.14em] text-primary-foreground transition-all duration-300 glow-brand hover:scale-[1.02] hover:glow-brand-hover sm:w-auto sm:px-8 sm:text-sm sm:tracking-widest"
              >
                {MAINTENANCE_CONTACT.label}
              </a>
              <span className="font-body text-sm leading-relaxed text-muted-foreground">
                Atendimento dispon&iacute;vel pelos canais comerciais da Backe.
              </span>
            </div>
          </div>

          <aside className="min-w-0 border-t border-primary/30 pt-6 lg:border-l lg:border-t-0 lg:border-primary/40 lg:pl-8 lg:pt-0">
            <p className="font-heading text-xs font-semibold uppercase leading-relaxed tracking-[0.2em] text-primary sm:tracking-[0.25em]">
              Voltamos em breve
            </p>
            <p className="mt-4 max-w-xl font-body text-xl font-medium leading-snug text-foreground sm:mt-5 sm:text-2xl md:text-3xl">
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
