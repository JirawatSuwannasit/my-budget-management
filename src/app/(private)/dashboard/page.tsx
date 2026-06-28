import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { calculateDashboardSnapshot } from "@/lib/finance/dashboard";
import { getFinancialCycle, getSalaryPaymentForCycle } from "@/lib/finance/cycle";
import { hasRealDashboardRows, loadDashboardRows, mapDashboardRowsToInput, type DashboardDataSource } from "@/lib/finance/dashboard-data";
import { isLocale } from "@/lib/i18n/dictionaries";
import { sampleDashboardInput } from "@/lib/finance/sample-data";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const today = new Date();
  const cycle = getFinancialCycle(today);
  const salaryPayment = getSalaryPaymentForCycle(cycle.start);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : { data: null };
  const locale = isLocale(profile?.locale) ? profile.locale : "th";

  let source: DashboardDataSource = "demo";
  let status: "ready" | "empty" | "error" = "empty";
  let notices: string[] = [];
  let errorMessage: string | undefined;
  let dashboardInput = sampleDashboardInput;

  try {
    const rows = await loadDashboardRows(supabase);

    if (hasRealDashboardRows(rows)) {
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
      source={source}
      status={status}
      notices={notices}
      errorMessage={errorMessage}
      locale={locale}
    />
  );
}
