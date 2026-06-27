import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[28px] border border-primary/15 bg-white/85 p-5 shadow-soft backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-8">
          <section className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-primary to-emerald-700 p-6 text-white md:min-h-[620px] md:p-8">
            <div>
              <p className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-normal">Private finance control</p>
              <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight md:text-6xl">เงินใช้ได้จริง, not guesswork.</h1>
              <p className="mt-4 max-w-lg text-base text-white/78 md:text-lg">Login is required. Your dashboard is designed to keep bills, card payables, debt payments, and sinking funds out of your safe-to-spend cash.</p>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-white/86 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/12 p-4"><strong className="block text-white">25-24</strong>Financial cycle</div>
              <div className="rounded-2xl bg-white/12 p-4"><strong className="block text-white">Cash only</strong>Available money</div>
              <div className="rounded-2xl bg-white/12 p-4"><strong className="block text-white">Private</strong>RLS protected</div>
            </div>
          </section>
          <section className="flex items-center">
            <LoginForm />
          </section>
        </div>
      </div>
    </main>
  );
}
