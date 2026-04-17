"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const SupabaseClientContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return (
    <SupabaseClientContext.Provider value={supabase}>{children}</SupabaseClientContext.Provider>
  );
}

export function useSupabase(): SupabaseClient {
  const ctx = useContext(SupabaseClientContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return ctx;
}
