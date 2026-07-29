import { ReportsView } from "@/components/reports/reports-view";
import { buildReportsData, type ReportsData } from "@/lib/finance/reports";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { loadReportsFeatureRows } from "@/lib/finance/reports-query";
import { getPrivateContext } from "@/lib/server/private-context";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ cycle?: string }> }) {
  const { cycle: selectedCycle } = await searchParams;
  const { user, locale, startDay } = await getPrivateContext();

  let data: ReportsData | null = null;
  let hasRows = false;
  let loadError: string | null = null;

  try {
    if (!user) throw new Error("Authentication required.");
    const { rows, categories, hasRows: featureHasRows } = await loadReportsFeatureRows(user.id);
    hasRows = featureHasRows;
    data = buildReportsData({
      rows,
      categories,
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
