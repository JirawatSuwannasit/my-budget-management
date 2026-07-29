import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { loadUpcomingSummaryForRequest } from "@/lib/finance/upcoming-query";
import { getPrivateContext, todayDateKey } from "@/lib/server/private-context";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, locale } = await getPrivateContext();

  if (!user) {
    redirect("/login");
  }

  // Surface urgent (overdue + due-soon) counts as navigation badges.
  const upcoming = await loadUpcomingSummaryForRequest(user.id, todayDateKey());
  const badges: Record<string, number> = {
    "/upcoming": upcoming.urgentCount,
    "/planning": upcoming.urgentByHref["/planning"],
    "/debts-cards": upcoming.urgentByHref["/debts-cards"],
    "/accounts": upcoming.urgentByHref["/accounts"]
  };

  return <AppShell userEmail={user.email ?? "private user"} locale={locale} badges={badges}>{children}</AppShell>;
}
