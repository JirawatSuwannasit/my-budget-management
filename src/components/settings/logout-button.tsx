"use client";

import { createClient } from "@/lib/supabase/browser";

export function LogoutButton({ label }: { label: string }) {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button onClick={signOut} className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 shadow-card transition hover:bg-rose-100">
      {label}
    </button>
  );
}
