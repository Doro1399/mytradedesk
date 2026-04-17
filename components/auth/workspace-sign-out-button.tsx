"use client";

import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/auth/supabase-provider";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function WorkspaceSignOutButton({ className, children }: Props) {
  const supabase = useSupabase();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void signOut()} className={className}>
      {children ?? "Sign out"}
    </button>
  );
}
