import { notFound } from "next/navigation";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";
import { IS_DESK_SANDBOX_VISIBLE } from "@/lib/dev/desk-sandbox";

export default function DeskSandboxPage() {
  if (!IS_DESK_SANDBOX_VISIBLE) {
    notFound();
  }

  return (
    <JournalWorkspaceShell active="sandbox">
      <div className="flex min-h-0 flex-1 flex-col px-[clamp(16px,2.5vw,40px)] py-[clamp(18px,3vw,40px)]">
        <header className="shrink-0 border-b border-amber-500/25 bg-amber-950/20 px-1 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">Local only</p>
          <h1 className="mt-1 text-[clamp(1.25rem,2vw,1.65rem)] font-semibold tracking-tight text-white">
            Sandbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Cette page n’existe pas en production. Sert d’espace d’essai (ex. Rithmic Protocol) sans exposer
            quoi que ce soit aux utilisateurs déployés.
          </p>
        </header>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-sm text-white/55">
          <p className="text-white/70">Contenu à ajouter : scripts Rithmic, tests d’API, etc.</p>
        </div>
      </div>
    </JournalWorkspaceShell>
  );
}
