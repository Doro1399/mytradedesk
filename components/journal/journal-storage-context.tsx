"use client";

import { createContext, useContext, type ReactNode } from "react";

type JournalStorageContextValue = {
  /** Supabase `auth.users.id` — scopes localStorage journal + trades. */
  userId: string | null;
};

const JournalStorageContext = createContext<JournalStorageContextValue | null>(null);

export function JournalStorageProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  return (
    <JournalStorageContext.Provider value={{ userId }}>{children}</JournalStorageContext.Provider>
  );
}

/**
 * `null` = no provider (e.g. `/demo`) or logged-out — do not persist to shared keys.
 * In `/desk`, use the value from `JournalStorageProvider`.
 */
export function useJournalStorageUserId(): string | null {
  return useContext(JournalStorageContext)?.userId ?? null;
}
