import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { calculateDashboardSnapshot } from "@/lib/finance/dashboard";
import { getSalaryPaymentForCycle } from "@/lib/finance/cycle";
import { mapDashboardRowsToInput, type DashboardDataSource } from "@/lib/finance/dashboard-data";
import { emptyUpcomingSummary, type UpcomingSummary } from "@/lib/finance/upcoming";
import { sampleDashboardInput } from "@/lib/finance/sample-data";
import { loadDashboardFeatureRows } from "@/lib/finance/dashboard-query";
import { loadUpcomingSummaryForRequest } from "@/lib/finance/upcoming-query";
import { getPrivateCycleContext, todayDateKey } from "@/lib/server/private-context";

export default async function DashboardPage() {
  const asOfDate = todayDateKey();
  const { user, locale, cycle } = await getPrivateCycleContext(asOfDate);
  const salaryPayment = getSalaryPaymentForCycle(cycle.start);

  let source: DashboardDataSource = "demo";
  let status: "ready" | "empty" | "error" = "empty";
  let notices: string[] = [];
  let errorMessage: string | undefined;
  let dashboardInput = sampleDashboardInput;
  let upcoming: UpcomingSummary = emptyUpcomingSummary();

  try {
    if (!user) throw new Error("Authentication required.");
    const [dashboardResult, upcomingResult] = await Promise.all([
      loadDashboardFeatureRows(user.id, cycle.start.toISOString().slice(0, 10), cycle.end.toISOString().slice(0, 10)),
      loadUpcomingSummaryForRequest(user.id, asOfDate)
    ]);
    const { rows, hasRows } = dashboardResult;
    upcoming = upcomingResult;

    if (hasRows) {
      dashboardInput = mapDashboardRowsToInput(rows, cycle.start, cycle.end);
      source = "supabase";
      status = "ready";
      notices = [locale === "th" ? "โหลดจากตาราง Supabase ส่วนตัวของคุณแล้ว" : "Loaded from your private Supabase tables."];
    } else {
      status = "empty";
      notices = [locale === "th" ? "ยังไม่พบข้อมูลเงินจริง จึงแสดงข้อมูลตัวอย่างจนกว่าคุณจะเพิ่มบัญชีและรายการเงิน" : "No finance records found yet. Showing clearly labeled demo data until you add accounts and transactions."];
    }
  } catch (error) {
    status = "error";
    errorMessage = error instanceof Error ? error.message : "Unable to load dashboard data.";
    notices = [locale === "th" ? "โหลดข้อมูล Dashboard จาก Supabase ไม่สำเร็จ จึงแสดงข้อมูลตัวอย่างไว้ก่อน" : "Could not load Supabase dashboard data. Showing clearly labeled demo data so the layout remains reviewable."];
  }

  const snapshot = calculateDashboardSnapshot(dashboardInput);

  return (
    <DashboardShell
      cycle={cycle}
      salaryPaymentDate={salaryPayment}
      input={dashboardInput}
      snapshot={snapshot}
      upcoming={upcoming}
      source={source}
      status={status}
      notices={notices}
      errorMessage={errorMessage}
      locale={locale}
    />
  );
}
