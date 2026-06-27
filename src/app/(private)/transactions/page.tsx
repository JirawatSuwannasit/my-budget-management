import { ListChecks, Trash2 } from "lucide-react";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { deleteTransaction } from "./actions";
import { createClient } from "@/lib/supabase/server";
import type { AccountType, TransactionType } from "@/lib/finance/types";

type AccountRow = { id: string; name: string; type: AccountType; active: boolean };
type CategoryRow = { id: string; name: string; kind: "income" | "expense"; active: boolean };
type DebtRow = { id: string; name: string; active: boolean };
type CardRow = { id: string; name: string; active: boolean };
type StatementRow = { id: string; card_id: string; due_date: string; statement_amount_due: number | string; paid_amount: number | string; remaining_payable: number | string; status: "unpaid" | "partial" | "paid" };
type AnnualExpenseRow = { id: string; name: string; active: boolean };
type SubscriptionRow = { id: string; name: string; frequency: "monthly" | "yearly"; active: boolean };
type TransactionRow = { id: string; account_id: string | null; destination_account_id: string | null; category_id: string | null; type: TransactionType; amount: number | string; transaction_date: string; cycle_start_date: string; related_entity_id: string | null; notes: string | null; created_at: string };

const typeLabels: Record<TransactionType, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
  transfer: "โอนระหว่างบัญชี",
  credit_card_expense: "ใช้บัตรเครดิต",
  credit_card_payment: "จ่ายบัตรเครดิต",
  debt_payment: "จ่ายหนี้",
  investment_transfer: "โอนไปลงทุน",
  sinking_fund_reserve: "กันเงินรายปี"
};

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value));
}

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [accountsResult, categoriesResult, debtsResult, cardsResult, statementsResult, annualResult, subscriptionsResult, transactionsResult] = await Promise.all([
    supabase.from("accounts").select("id,name,type,active").order("active", { ascending: false }).order("name"),
    supabase.from("categories").select("id,name,kind,active").order("name"),
    supabase.from("debts").select("id,name,active").order("active", { ascending: false }).order("name"),
    supabase.from("credit_cards").select("id,name,active").order("active", { ascending: false }).order("name"),
    supabase.from("credit_card_statements").select("id,card_id,due_date,statement_amount_due,paid_amount,remaining_payable,status").order("due_date", { ascending: true }),
    supabase.from("annual_expenses").select("id,name,active").order("name"),
    supabase.from("subscriptions").select("id,name,frequency,active").order("name"),
    supabase.from("transactions").select("id,account_id,destination_account_id,category_id,type,amount,transaction_date,cycle_start_date,related_entity_id,notes,created_at").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(100)
  ]);

  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const debts = (debtsResult.data ?? []) as DebtRow[];
  const cards = (cardsResult.data ?? []) as CardRow[];
  const statements = (statementsResult.data ?? []) as StatementRow[];
  const annualExpenses = (annualResult.data ?? []) as AnnualExpenseRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const reserves = [
    ...annualExpenses.filter((item) => item.active).map((item) => ({ id: item.id, label: item.name, kind: "annual" as const })),
    ...subscriptions.filter((item) => item.active && item.frequency === "yearly").map((item) => ({ id: item.id, label: item.name, kind: "subscription" as const }))
  ];
  const payables = [
    ...subscriptions.filter((item) => item.active && item.frequency === "monthly").map((item) => ({ id: item.id, label: item.name + " - monthly subscription", kind: "monthly_subscription" as const })),
    ...subscriptions.filter((item) => item.active && item.frequency === "yearly").map((item) => ({ id: item.id, label: item.name + " - yearly subscription", kind: "yearly_subscription" as const })),
    ...annualExpenses.filter((item) => item.active).map((item) => ({ id: item.id, label: item.name + " - annual expense", kind: "annual_expense" as const }))
  ];
  const accountName = new Map(accounts.map((account) => [account.id, account.name]));
  const loadError = accountsResult.error ?? categoriesResult.error ?? debtsResult.error ?? cardsResult.error ?? statementsResult.error ?? annualResult.error ?? subscriptionsResult.error ?? transactionsResult.error;

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-teal-50 to-blue-50 p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">Transactions</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">บันทึกรายการเงิน</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">เพิ่มรายจ่ายได้เร็ว โอนเงินไม่ถูกนับเป็นรายจ่าย และรายการลงทุนจะแยกจากการใช้จ่ายประจำวัน</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-card"><ListChecks size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">โหลดข้อมูลไม่สำเร็จ: {loadError.message}</p> : null}
      {accounts.length === 0 ? <p className="rounded-panel border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">เพิ่มบัญชีก่อน จึงจะบันทึกรายรับ รายจ่าย หรือโอนได้</p> : null}

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <h2 className="mb-3 text-xl font-black text-ink">เพิ่มรายการ</h2>
          <TransactionForm accounts={accounts} categories={categories} debts={debts} cards={cards} statements={statements} reserves={reserves} payables={payables} />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">รายการล่าสุด</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-card">ล่าสุด {transactions.length}</span>
          </div>
          {transactions.length === 0 ? <p className="rounded-panel border border-dashed border-slate-300 bg-white/80 p-5 text-sm font-bold text-muted">ยังไม่มีรายการ เริ่มจากเพิ่มรายรับหรือรายจ่ายแรก</p> : null}
          {transactions.map((transaction) => (
            <article key={transaction.id} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{typeLabels[transaction.type]}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-muted">{transaction.transaction_date}</span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-ink">{formatMoney(transaction.amount)}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{transaction.account_id ? accountName.get(transaction.account_id) ?? "Account" : "No cash account"}{transaction.destination_account_id ? " → " + (accountName.get(transaction.destination_account_id) ?? "Destination") : ""}</p>
                  {transaction.notes ? <p className="mt-2 text-sm font-semibold text-muted">{transaction.notes}</p> : null}
                </div>
                <form action={deleteTransaction}>
                  <input type="hidden" name="id" value={transaction.id} />
                  <button className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"><Trash2 size={14} aria-hidden="true" /> ลบถ้าปลอดภัย</button>
                </form>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-black text-primary">แก้ไขรายการ</summary>
                <div className="mt-3"><TransactionForm accounts={accounts} categories={categories} debts={debts} cards={cards} statements={statements} reserves={reserves} payables={payables} transaction={transaction} compact /></div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
