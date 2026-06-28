import { ReportsView } from "@/components/reports/reports-view";
import { getUserCycleStartDay } from "@/lib/finance/cycle";
import { hasRealDashboardRows, loadDashboardRows } from "@/lib/finance/dashboard-data";
import { buildReportsData, type ReportCategory, type ReportsData } from "@/lib/finance/reports";
import { dictionaries, isLocale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

type CategoryRow = { id: string; name: string; active: boolean };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ cycle?: string }> }) {
  const { cycle: selectedCycle } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : { data: null };
  const locale = isLocale(profile?.locale) ? profile.locale : "th";
  const startDay = user ? await getUserCycleStartDay(supabase, user.id) : 25;

  let data: ReportsData | null = null;
  let hasRows = false;
  let loadError: string | null = null;

  try {
    const [rows, categoriesResult] = await Promise.all([
      loadDashboardRows(supabase),
      supabase.from("categories").select("id,name,active")
    ]);
    if (categoriesResult.error) throw new Error(categoriesResult.error.message);

    hasRows = hasRealDashboardRows(rows);
    const categories = (categoriesResult.data ?? []) as CategoryRow[];
    data = buildReportsData({
      rows,
      categories: categories as ReportCategory[],
      startDay,
      selectedCycleStartDate: selectedCycle,
      noCategoryLabel: dictionaries[locale].common.noCategory,
      otherLabel: dictionaries[locale].common.other
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load reports.";
  }

  return <ReportsView locale={locale} data={data} hasRows={hasRows} loadError={loadError} />;
}
