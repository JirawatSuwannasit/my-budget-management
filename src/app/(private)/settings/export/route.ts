import { createClient } from "@/lib/supabase/server";

// Read-only personal data export. Everything is scoped to the logged-in user by Supabase RLS
// (and additionally filtered by user_id where the table is keyed by it). This never writes data.

const USER_TABLES = [
  "accounts",
  "transactions",
  "budgets",
  "subscriptions",
  "annual_expenses",
  "debts",
  "debt_payments",
  "credit_cards",
  "credit_card_statements",
  "card_transactions",
  "categories"
] as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const format = new URL(request.url).searchParams.get("format");

  try {
    if (format === "csv") {
      const { data, error } = await supabase.from("transactions").select("*").order("transaction_date", { ascending: false });
      if (error) throw new Error(error.message);
      const csv = toCsv((data ?? []) as Record<string, unknown>[]);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="budget-transactions-' + todayKey() + '.csv"',
          "Cache-Control": "no-store"
        }
      });
    }

    const tableResults = await Promise.all(USER_TABLES.map((table) => supabase.from(table).select("*")));
    const data: Record<string, unknown> = {};
    USER_TABLES.forEach((table, index) => {
      const result = tableResults[index];
      if (result.error) throw new Error(table + ": " + result.error.message);
      data[table] = result.data ?? [];
    });

    const [profileResult, appSettingsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle()
    ]);
    if (profileResult.error) throw new Error("profiles: " + profileResult.error.message);
    if (appSettingsResult.error) throw new Error("app_settings: " + appSettingsResult.error.message);

    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      app: "my-budget-management",
      user: { id: user.id, email: user.email ?? null },
      profile: profileResult.data ?? null,
      appSettings: appSettingsResult.data ?? null,
      data
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="budget-backup-' + todayKey() + '.json"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
