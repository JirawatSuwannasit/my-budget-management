import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle();
  const locale = isLocale(profile?.locale) ? profile.locale : "th";

  return <AppShell userEmail={user.email ?? "private user"} locale={locale}>{children}</AppShell>;
}
