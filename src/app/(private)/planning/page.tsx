import { Banknote, CalendarClock, PiggyBank, Repeat, WalletCards } from "lucide-react";
import { AnnualExpenseForm } from "@/components/planning/annual-expense-form";
import { BudgetForm } from "@/components/planning/budget-form";
import { SubscriptionForm } from "@/components/planning/subscription-form";
import { getFinancialCycle } from "@/lib/finance/cycle";
import { createClient } from "@/lib/supabase/server";
import { setAnnualExpenseActive, setBudgetActive, setSubscriptionActive } from "./actions";

type BudgetRow = { id: string; category_id: string | null; label: string; amount: number | string; cycle_start_date: string; active: boolean };
type SubscriptionRow = { id: string; category_id: string | null; name: string; frequency: "monthly" | "yearly"; price: number | string; billing_day: number; payment_method: string | null; active: boolean };
type AnnualExpenseRow = { id: string; category_id: string | null; name: string; annual_amount: number | string; monthly_reserve: number | string | null; due_date: string | null; active: boolean };
type CategoryRow = { id: string; name: string; kind: "income" | "expense"; active: boolean };
type TransactionRow = { id: string; category_id: string | null; type: string; amount: number | string; cycle_start_date: string; related_entity_id: string | null };

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(toNumber(value));
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function ProgressBar({ percent, warning = false }: { percent: number; warning?: boolean }) {
  const capped = Math.max(0, Math.min(100, percent));
  const color = warning ? "bg-rose-500" : percent >= 85 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div className={"h-full rounded-full " + color} style={{ width: capped + "%" }} />
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-muted")}>{active ? "Active" : "Inactive"}</span>;
}

function ToggleActiveForm({ id, active, action, activeLabel = "ปิดใช้งาน", inactiveLabel = "เปิดใช้งาน" }: { id: string; active: boolean; action: (formData: FormData) => void | Promise<void>; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{active ? activeLabel : inactiveLabel}</button>
    </form>
  );
}

export default async function PlanningPage() {
  const cycle = getFinancialCycle(new Date());
  const cycleStartDate = toDateInput(cycle.start);
  const supabase = await createClient();
  const [budgetsResult, subscriptionsResult, annualResult, categoriesResult, transactionsResult] = await Promise.all([
    supabase.from("budgets").select("id,category_id,label,amount,cycle_start_date,active").eq("cycle_start_date", cycleStartDate).order("active", { ascending: false }).order("label"),
    supabase.from("subscriptions").select("id,category_id,name,frequency,price,billing_day,payment_method,active").order("active", { ascending: false }).order("name"),
    supabase.from("annual_expenses").select("id,category_id,name,annual_amount,monthly_reserve,due_date,active").order("active", { ascending: false }).order("name"),
    supabase.from("categories").select("id,name,kind,active").eq("kind", "expense").order("name"),
    supabase.from("transactions").select("id,category_id,type,amount,cycle_start_date,related_entity_id").eq("cycle_start_date", cycleStartDate)
  ]);

  const budgets = (budgetsResult.data ?? []) as BudgetRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const annualExpenses = (annualResult.data ?? []) as AnnualExpenseRow[];
  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const loadError = budgetsResult.error ?? subscriptionsResult.error ?? annualResult.error ?? categoriesResult.error ?? transactionsResult.error;
  const expenseTransactions = transactions.filter((transaction) => transaction.type === "expense");
  const reserveTransactions = transactions.filter((transaction) => transaction.type === "sinking_fund_reserve");

  const budgetCards = budgets.map((budget) => {
    const used = expenseTransactions
      .filter((transaction) => transaction.category_id && transaction.category_id === budget.category_id)
      .reduce((total, transaction) => total + toNumber(transaction.amount), 0);
    const amount = toNumber(budget.amount);
    const remaining = amount - used;
    const percent = amount <= 0 ? 0 : Math.round((used / amount) * 100);
    const dailyAvailable = Math.max(0, remaining) / Math.max(1, cycle.daysRemaining);
    return { ...budget, used, amount, remaining, percent, dailyAvailable, categoryName: budget.category_id ? categoryNameById.get(budget.category_id) ?? "Expense category" : "No category" };
  });

  const monthlySubscriptions = subscriptions.filter((subscription) => subscription.frequency === "monthly");
  const yearlySubscriptions = subscriptions.filter((subscription) => subscription.frequency === "yearly");
  const monthlySubscriptionTotal = monthlySubscriptions.filter((subscription) => subscription.active).reduce((total, subscription) => total + toNumber(subscription.price), 0);
  const yearlyReserveTotal = yearlySubscriptions
    .filter((subscription) => subscription.active)
    .filter((subscription) => !reserveTransactions.some((transaction) => transaction.related_entity_id === subscription.id))
    .reduce((total, subscription) => total + toNumber(subscription.price) / 12, 0);
  const annualReserveTotal = annualExpenses
    .filter((expense) => expense.active)
    .filter((expense) => !reserveTransactions.some((transaction) => transaction.related_entity_id === expense.id))
    .reduce((total, expense) => total + (toNumber(expense.monthly_reserve) || toNumber(expense.annual_amount) / 12), 0);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-teal-50 to-blue-50 p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">Phase 6 planning</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">งบ, subscriptions, sinking funds</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">จัดการงบรายรอบ 25-24, ค่า subscription รายเดือน/รายปี และเงินกันสำหรับค่าใช้จ่ายรายปีที่ต้องหักจากเงินใช้ได้จริง</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-card"><WalletCards size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">โหลดข้อมูลไม่สำเร็จ: {loadError.message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-black uppercase tracking-normal text-muted">งบคงเหลือรวม</p>
          <p className="mt-3 text-3xl font-black text-ink">{formatMoney(budgetCards.reduce((total, budget) => total + Math.max(0, budget.remaining), 0))}</p>
        </div>
        <div className="rounded-panel border border-amber-100 bg-amber-50 p-4 text-amber-900 shadow-card">
          <p className="text-xs font-black uppercase tracking-normal opacity-70">Monthly subscriptions</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(monthlySubscriptionTotal)}</p>
        </div>
        <div className="rounded-panel border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 shadow-card">
          <p className="text-xs font-black uppercase tracking-normal opacity-70">Monthly sinking reserve</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(yearlyReserveTotal + annualReserveTotal)}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="text-primary" size={20} aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">เพิ่มงบรายเดือน</h2>
          </div>
          <BudgetForm cycleStartDate={cycleStartDate} />
          <p className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm font-bold text-muted">รอบงบนี้: {cycle.label}. ค่าใช้จ่ายจะนับเข้า budget เมื่อ transaction expense ใช้หมวดเดียวกับงบ</p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">Budget progress</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-card">{budgetCards.length} budgets</span>
          </div>
          {budgetCards.length === 0 ? <p className="rounded-panel border border-dashed border-slate-300 bg-white/80 p-5 text-sm font-bold text-muted">ยังไม่มีงบในรอบนี้ เพิ่มงบเช่น Daily living expenses, Transportation, Miscellaneous shopping หรือ Luxury / non-essential spending</p> : null}
          {budgetCards.map((budget) => (
            <article key={budget.id} className={"rounded-panel border p-4 shadow-card " + (budget.remaining < 0 ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-ink">{budget.label}</h3>
                    <StatusPill active={budget.active} />
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{budget.categoryName}</span>
                    {budget.remaining < 0 ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">เกินงบ</span> : null}
                  </div>
                  <div className="mt-4 grid gap-3">
                    <ProgressBar percent={budget.percent} warning={budget.remaining < 0} />
                    <div className="grid gap-2 text-sm font-bold text-muted sm:grid-cols-4">
                      <span>งบ {formatMoney(budget.amount)}</span>
                      <span>ใช้แล้ว {formatMoney(budget.used)}</span>
                      <span>เหลือ {formatMoney(budget.remaining)}</span>
                      <span>เฉลี่ย/วัน {formatMoney(budget.dailyAvailable)}</span>
                    </div>
                  </div>
                </div>
                <ToggleActiveForm id={budget.id} active={budget.active} action={setBudgetActive} />
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-black text-primary">แก้ไขงบ</summary>
                <div className="mt-3"><BudgetForm budget={{ ...budget, category_name: budget.categoryName }} cycleStartDate={cycleStartDate} compact /></div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Repeat className="text-primary" size={20} aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">เพิ่ม subscription</h2>
          </div>
          <SubscriptionForm />
        </div>

        <div className="grid gap-3">
          <h2 className="text-xl font-black text-ink">Subscriptions</h2>
          {subscriptions.length === 0 ? <p className="rounded-panel border border-dashed border-slate-300 bg-white/80 p-5 text-sm font-bold text-muted">ยังไม่มี subscription เพิ่ม AI รายเดือน หรือ football streaming รายปีเพื่อให้ dashboard คำนวณ obligation/reserve</p> : null}
          {subscriptions.map((subscription) => {
            const categoryName = subscription.category_id ? categoryNameById.get(subscription.category_id) ?? "Other" : "Other";
            const reserveMonthly = subscription.frequency === "yearly" ? toNumber(subscription.price) / 12 : 0;
            const paidOrReserved = reserveTransactions.some((transaction) => transaction.related_entity_id === subscription.id) || transactions.some((transaction) => transaction.related_entity_id === subscription.id && transaction.type === "expense");
            return (
              <article key={subscription.id} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-ink">{subscription.name}</h3>
                      <StatusPill active={subscription.active} />
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{categoryName}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-muted">{subscription.frequency === "monthly" ? "รายเดือน" : "รายปี"}</span>
                    </div>
                    <p className="mt-3 text-2xl font-black text-ink">{formatMoney(subscription.price)}</p>
                    <p className="mt-1 text-sm font-semibold text-muted">{subscription.frequency === "monthly" ? "นับเป็น monthly fixed obligation" : "นับเป็น sinking fund reserve " + formatMoney(reserveMonthly) + "/เดือน"} · Billing day {subscription.billing_day}</p>
                    {paidOrReserved ? <p className="mt-2 text-sm font-black text-emerald-700">จ่าย/กันเงินแล้วในรอบนี้</p> : null}
                  </div>
                  <ToggleActiveForm id={subscription.id} active={subscription.active} action={setSubscriptionActive} />
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-primary">แก้ไข subscription</summary>
                  <div className="mt-3"><SubscriptionForm subscription={{ ...subscription, category_name: categoryName }} compact /></div>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <PiggyBank className="text-primary" size={20} aria-hidden="true" />
            <h2 className="text-xl font-black text-ink">เพิ่ม sinking fund</h2>
          </div>
          <AnnualExpenseForm />
        </div>

        <div className="grid gap-3">
          <h2 className="text-xl font-black text-ink">Annual expenses / sinking funds</h2>
          {annualExpenses.length === 0 ? <p className="rounded-panel border border-dashed border-slate-300 bg-white/80 p-5 text-sm font-bold text-muted">ยังไม่มีค่าใช้จ่ายรายปี เพิ่ม Condo common fee, Condo insurance หรือ Annual football app subscription</p> : null}
          {annualExpenses.map((expense) => {
            const categoryName = expense.category_id ? categoryNameById.get(expense.category_id) ?? "Other" : "Other";
            const monthlyReserve = toNumber(expense.monthly_reserve) || toNumber(expense.annual_amount) / 12;
            const reserved = reserveTransactions.some((transaction) => transaction.related_entity_id === expense.id);
            return (
              <article key={expense.id} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-ink">{expense.name}</h3>
                      <StatusPill active={expense.active} />
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{categoryName}</span>
                      {reserved ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">กันเงินแล้ว</span> : null}
                    </div>
                    <div className="mt-4 grid gap-3">
                      <ProgressBar percent={reserved ? 100 : 0} />
                      <div className="grid gap-2 text-sm font-bold text-muted sm:grid-cols-3">
                        <span>รายปี {formatMoney(expense.annual_amount)}</span>
                        <span>กันต่อเดือน {formatMoney(monthlyReserve)}</span>
                        <span>{expense.due_date ? "ครบกำหนด " + expense.due_date : "ยังไม่ระบุวันครบกำหนด"}</span>
                      </div>
                    </div>
                  </div>
                  <ToggleActiveForm id={expense.id} active={expense.active} action={setAnnualExpenseActive} />
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-primary">แก้ไข sinking fund</summary>
                  <div className="mt-3"><AnnualExpenseForm annualExpense={{ ...expense, category_name: categoryName }} compact /></div>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-panel border border-slate-200 bg-white p-5 text-sm font-semibold text-muted shadow-card">
        <div className="mb-2 flex items-center gap-2 text-ink">
          <CalendarClock size={18} className="text-primary" aria-hidden="true" />
          <h2 className="text-lg font-black">Dashboard logic</h2>
        </div>
        <p>Monthly subscriptions reduce real available money until paid in the current cycle. Yearly subscriptions and annual expenses reduce real available money as monthly reserves until marked with a sinking fund reserve transaction. Budgets reduce only their unspent reserved amount, so paid expenses are not double counted.</p>
      </section>
    </div>
  );
}
