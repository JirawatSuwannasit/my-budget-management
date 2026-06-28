import type { createClient } from "@/lib/supabase/server";
import { getFinancialCycle, getUserCycleStartDay } from "./cycle";
import { loadDashboardRows } from "./dashboard-data";
import { buildUpcomingItems, emptyUpcomingSummary, type UpcomingSummary } from "./upcoming";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Loads the "due & to-do this cycle" summary for a user using the same RLS-scoped rows and the same
// configurable-cycle helpers the dashboard uses. Returns an empty (all-caught-up) summary on failure
// so navigation badges never break a page render.
export async function loadUpcomingSummary(supabase: SupabaseServerClient, userId: string, today: Date = new Date()): Promise<UpcomingSummary> {
  try {
    const startDay = await getUserCycleStartDay(supabase, userId);
    const cycle = getFinancialCycle(today, startDay);
    const rows = await loadDashboardRows(supabase);
    return buildUpcomingItems({ rows, cycleStart: cycle.start, cycleEnd: cycle.end, today });
  } catch {
    return emptyUpcomingSummary();
  }
}
