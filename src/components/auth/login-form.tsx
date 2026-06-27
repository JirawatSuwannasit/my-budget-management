"use client";

import { useState, useTransition } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-card md:p-7">
      <div className="mb-6">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={24} aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-black text-ink">เข้าสู่ระบบ</h2>
        <p className="mt-2 text-sm text-muted">Private access only. Public signup is disabled for v1; create your first user in Supabase Auth.</p>
      </div>

      <form className="grid gap-4" onSubmit={handleLogin}>
        <label className="grid gap-2 text-sm font-bold text-ink">
          Email
          <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-primary/60 focus-within:bg-white">
            <Mail size={18} className="text-muted" aria-hidden="true" />
            <input className="w-full bg-transparent outline-none" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-ink">
          Password
          <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-primary/60 focus-within:bg-white">
            <LockKeyhole size={18} className="text-muted" aria-hidden="true" />
            <input className="w-full bg-transparent outline-none" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required />
          </span>
        </label>
        <button className="mt-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending} type="submit">
          {isPending ? "Checking..." : "Login"}
        </button>
        {message ? <p className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{message}</p> : null}
      </form>
    </div>
  );
}
