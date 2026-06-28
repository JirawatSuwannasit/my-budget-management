import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isLocale } from "@/lib/i18n/dictionaries";
import { loadUpcomingSummary } from "@/lib/finance/upcoming-data";
import { createClient } from "@/lib/supabase/server";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle();
  const locale = isLocale(profile?.locale) ? profile.locale : "th";

  // Surface urgent (overdue + due-soon) counts as navigation badges.
  const upcoming = await loadUpcomingSummary(supabase, user.id);
  const badges: Record<string, number> = {
    "/upcoming": upcoming.urgentCount,
    "/planning": upcoming.urgentByHref["/planning"],
    "/debts-cards": upcoming.urgentByHref["/debts-cards"]
  };

  return <AppShell userEmail={user.email ?? "private user"} locale={locale} badges={badges}>{children}</AppShell>;
}
