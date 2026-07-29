import { UpcomingView } from "@/components/upcoming/upcoming-ui";
import { emptyUpcomingSummary, type UpcomingSummary } from "@/lib/finance/upcoming";
import { loadUpcomingSummaryForRequest } from "@/lib/finance/upcoming-query";
import { getPrivateContext, todayDateKey } from "@/lib/server/private-context";

export default async function UpcomingPage() {
  const { user, locale } = await getPrivateContext();

  let summary: UpcomingSummary = emptyUpcomingSummary();
  let loadError: string | null = null;

  if (user) {
    try {
      summary = await loadUpcomingSummaryForRequest(user.id, todayDateKey());
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to load reminders.";
    }
  }

  return <UpcomingView summary={summary} locale={locale} loadError={loadError} />;
}
