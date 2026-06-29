"use client";

import { createClient } from "@/lib/supabase/browser";

export function LogoutButton({ label }: { label: string }) {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button onClick={signOut} className="rounded-2xl border border-danger/30 bg-danger/10 px-5 py-3 text-sm font-black text-danger shadow-card transition hover:bg-danger/15">
      {label}
    </button>
  );
}
