import { UpcomingView } from "@/components/upcoming/upcoming-ui";
import { emptyUpcomingSummary, type UpcomingSummary } from "@/lib/finance/upcoming";
import { loadUpcomingSummary } from "@/lib/finance/upcoming-data";
import { isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export default async function UpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : { data: null };
  const locale = isLocale(profile?.locale) ? profile.locale : "th";

  let summary: UpcomingSummary = emptyUpcomingSummary();
  let loadError: string | null = null;

  if (user) {
    try {
      summary = await loadUpcomingSummary(supabase, user.id);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to load reminders.";
    }
  }

  return <UpcomingView summary={summary} locale={locale} loadError={loadError} />;
}
