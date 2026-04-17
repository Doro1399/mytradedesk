"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { accountsLimitFromProfile } from "@/lib/auth/accounts-limit";
import { ensurePremiumTrialBootstrapped, ensureTrialExpiredIfNeeded } from "@/lib/auth/plan";
import type { UserProfileRow } from "@/lib/auth/profile";
import { useSupabase } from "@/components/auth/supabase-provider";

type WorkspaceProfileContextValue = {
  profile: UserProfileRow | null;
  accountsLimit: number;
  refreshProfile: () => Promise<void>;
};

const WorkspaceProfileContext = createContext<WorkspaceProfileContextValue | null>(null);

export function WorkspaceProfileProvider({
  children,
  initialProfile,
}: {
  children: ReactNode;
  /** Loaded in RSC journal layout (may be null if row missing). */
  initialProfile: UserProfileRow | null;
}) {
  const supabase = useSupabase();
  const [profile, setProfile] = useState<UserProfileRow | null>(initialProfile);

  const hydrateProfile = useCallback(
    async (row: UserProfileRow | null) => {
      if (!row) {
        setProfile(null);
        return;
      }
      let synced = await ensurePremiumTrialBootstrapped(supabase, row);
      synced = await ensureTrialExpiredIfNeeded(supabase, synced);
      setProfile(synced);
    },
    [supabase]
  );

  useEffect(() => {
    void hydrateProfile(initialProfile);
  }, [initialProfile, hydrateProfile]);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!error && data) {
      await hydrateProfile(data as UserProfileRow);
    }
  }, [supabase, hydrateProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null);
        return;
      }
      void refreshProfile();
    });
    return () => subscription.unsubscribe();
  }, [supabase, refreshProfile]);

  const accountsLimit = useMemo(() => accountsLimitFromProfile(profile), [profile]);

  const value = useMemo(
    () => ({
      profile,
      accountsLimit,
      refreshProfile,
    }),
    [profile, accountsLimit, refreshProfile]
  );

  return (
    <WorkspaceProfileContext.Provider value={value}>{children}</WorkspaceProfileContext.Provider>
  );
}

export function useWorkspaceProfile(): WorkspaceProfileContextValue {
  const ctx = useContext(WorkspaceProfileContext);
  if (!ctx) {
    throw new Error("useWorkspaceProfile must be used within WorkspaceProfileProvider");
  }
  return ctx;
}

/** Optional consumer outside journal shell (e.g. landing) — returns null if no provider. */
export function useWorkspaceProfileOptional(): WorkspaceProfileContextValue | null {
  return useContext(WorkspaceProfileContext);
}
