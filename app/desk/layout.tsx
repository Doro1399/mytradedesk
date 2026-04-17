import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspaceProfileProvider } from "@/components/auth/workspace-profile-provider";
import { JournalProvider } from "@/components/journal/journal-provider";
import { JournalStorageProvider } from "@/components/journal/journal-storage-context";
import type { UserProfileRow } from "@/lib/auth/profile";
import { ensurePremiumTrialBootstrapped, ensureTrialExpiredIfNeeded } from "@/lib/auth/plan";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "TradeDesk | MyTradeDesk",
  description:
    "Prop accounts, PnL, fees and payouts — local-first data in your browser for now.",
};

export const dynamic = "force-dynamic";

export default async function JournalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/desk/dashboard");
  }

  let initialProfile: UserProfileRow | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) {
      let row = data as UserProfileRow;
      row = await ensurePremiumTrialBootstrapped(supabase, row);
      row = await ensureTrialExpiredIfNeeded(supabase, row);
      initialProfile = row;
    }
  }

  return (
    <JournalStorageProvider userId={user.id}>
      <WorkspaceProfileProvider initialProfile={initialProfile}>
        <JournalProvider>
          {/* h-dvh: nested scroll (main overflow-y-auto) needs a definite height; flex-1+h-full alone breaks when the root layout no longer wraps children in a full-height flex item. */}
          <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden">{children}</div>
        </JournalProvider>
      </WorkspaceProfileProvider>
    </JournalStorageProvider>
  );
}
