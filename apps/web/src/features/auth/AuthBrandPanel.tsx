/** Painel de branding escuro compartilhado (login / register) — visual V1. */
export function AuthBrandPanel() {
  return (
    <div className="relative hidden items-center justify-center overflow-hidden border-r border-white/5 bg-black p-12 md:flex md:w-[75%]">
      <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-blue-500/20 blur-[120px] [animation-delay:700ms]" />

      <div className="relative z-10 max-w-2xl space-y-8 text-center">
        <div className="inline-flex animate-in items-center justify-center rounded-2xl p-6 fade-in zoom-in duration-700">
          <img
            src="/assets/logo-dark.png"
            alt="Lumini"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="animate-in space-y-4 slide-in-from-bottom-8 duration-700">
          <p className="mx-auto max-w-lg text-xl font-light leading-relaxed tracking-wide text-zinc-400">
            Inteligência e precisão para o futuro das marmorarias de alto padrão.
          </p>
        </div>
      </div>

      <div className="absolute bottom-12 left-12 flex items-center gap-6 opacity-40">
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/20" />
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">
          Precision Engineering
        </p>
      </div>
    </div>
  );
}
