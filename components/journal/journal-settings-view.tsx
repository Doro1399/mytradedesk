"use client";

const SECTION = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85";

const CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const LINK_OUT =
  "font-medium text-sky-300/90 underline decoration-sky-400/35 underline-offset-2 transition hover:text-sky-200 hover:decoration-sky-300/60";

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M21 12a9 9 0 0 1-9 9 4.5 4.5 0 0 1-4.5-4.5V15" strokeLinecap="round" />
      <path d="M3 12a9 9 0 0 1 9-9 4.5 4.5 0 0 1 4.5 4.5V9" strokeLinecap="round" />
      <path d="M8 15H3v5M21 4h-5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" strokeLinejoin="round" />
    </svg>
  );
}

function UnplugIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M19 5l3-3M2 22l7-7" strokeLinecap="round" />
      <path d="M13 11l4-4a2.4 2.4 0 0 1 3.4 0l.6.6a2.4 2.4 0 0 1 0 3.4l-4 4" strokeLinejoin="round" />
      <path d="M11 13L7.4 16.6a2.4 2.4 0 0 0 0 3.4l.6.6a2.4 2.4 0 0 0 3.4 0L15 17" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
      <path d="M14 3h7v7M10 14 21 3" strokeLinecap="round" />
    </svg>
  );
}

function IconButton({
  label,
  children,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-lg border border-white/10 p-2 text-white/55 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Maquette : même structure que les lignes réelles après OAuth (pas de données). */
function MockConnectionRows() {
  return (
    <div
      className="mt-5 space-y-3 rounded-xl border border-dashed border-white/15 bg-black/20 p-4"
      aria-hidden
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        Aperçu interface (données factices)
      </p>

      <div className="rounded-xl border border-white/10 bg-[#0a1018]/90 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Connexion #235</p>
            <span className="mt-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200/95">
              Connecté
            </span>
            <p className="mt-2 text-xs text-white/45">Dernière synchro : 02/04/2026 01:57:46</p>
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton label="Synchroniser">
              <RefreshIcon className="h-4 w-4" />
            </IconButton>
            <IconButton label="Modifier">
              <PencilIcon className="h-4 w-4" />
            </IconButton>
            <IconButton label="Déconnecter">
              <UnplugIcon className="h-4 w-4 text-rose-300/80" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/25 bg-amber-950/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Connexion #234</p>
            <span className="mt-2 inline-flex rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200/95">
              Jeton expiré
            </span>
            <p className="mt-2 text-xs text-white/45">1 compte · Dernière synchro : 02/04/2026 01:57:44</p>
            <button
              type="button"
              disabled
              className="mt-3 inline-flex w-full max-w-xs cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-100/90 sm:w-auto"
            >
              <ExternalLinkIcon className="h-4 w-4" />
              Reconnecter
            </button>
            <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-100/75">
              Jeton expiré. Reconnectez votre compte Tradovate. Cliquez sur « Reconnecter » pour réautoriser.
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton label="Modifier">
              <PencilIcon className="h-4 w-4" />
            </IconButton>
            <IconButton label="Déconnecter">
              <UnplugIcon className="h-4 w-4 text-rose-300/80" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JournalSettingsView() {
  const activeCount = 0;

  return (
    <>
      <header className="shrink-0 border-b border-white/10 bg-black/55 px-[clamp(16px,2.5vw,40px)] py-[clamp(14px,1.8vw,24px)] backdrop-blur-xl">
        <p className={SECTION}>Workspace</p>
        <h1 className="mt-1 text-[clamp(1.35rem,2.2vw,1.9rem)] font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
          Connectez vos plateformes pour synchroniser automatiquement vos trades. OAuth et backend MyTradeDesk sont en
          cours ; l’import CSV dans Trades reste disponible en attendant.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-[clamp(12px,2.5vw,40px)] py-6">
        <section className={`${CARD} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/25 to-orange-950/40 text-sm font-bold text-orange-200 ring-1 ring-orange-400/25"
                aria-hidden
              >
                NT
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">NinjaTrader / Tradovate</h2>
                <p className="mt-0.5 text-sm text-white/45">
                  {activeCount === 0 ? "Aucune connexion active" : `${activeCount} connexion${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            {activeCount === 0 ? (
              <span className="inline-flex shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/45">
                Non connecté
              </span>
            ) : (
              <span className="inline-flex shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200/95">
                {activeCount} connecté{activeCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/40"
            >
              <RefreshIcon className="h-4 w-4" />
              Sync tout ({activeCount})
            </button>
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-200/50"
            >
              <PlusIcon className="h-4 w-4" />
              Ajouter une connexion
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-10 text-center">
            <p className="text-sm font-medium text-white/55">Aucune connexion pour l’instant</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/40">
              Tu pourras lier plusieurs comptes (comme chez les autres journaux), voir la dernière synchro, forcer un sync
              et reconnecter si le jeton OAuth expire.
            </p>
          </div>

          <MockConnectionRows />

          <p className="mt-5 text-xs text-white/40">
            Documentation :{" "}
            <a href="https://api.tradovate.com/" target="_blank" rel="noopener noreferrer" className={LINK_OUT}>
              api.tradovate.com
            </a>
            {" · "}
            <a
              href="https://github.com/tradovate/example-api-oauth"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_OUT}
            >
              OAuth Tradovate
            </a>
            {" · "}
            <a
              href="https://developer.ninjatrader.com/products/api"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_OUT}
            >
              API NinjaTrader
            </a>
          </p>
        </section>

        <section className={`${CARD} border-white/[0.08] p-5 sm:p-6`}>
          <p className={SECTION}>Données</p>
          <h3 className="mt-1 text-base font-semibold text-white">Stockage local</h3>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Comptes, PnL manuel et trades importés CSV restent dans ce navigateur. Les connexions ci-dessus, une fois
            actives, synchroniseront via nos serveurs (jetons sécurisés) — on documentera exactement quelles données sont
            envoyées.
          </p>
        </section>
      </div>
    </>
  );
}
