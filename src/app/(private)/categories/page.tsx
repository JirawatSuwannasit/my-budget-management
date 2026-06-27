import { ArrowLeftRight, CreditCard, PiggyBank, ReceiptText, Repeat, Tag, TrendingUp, WalletCards } from "lucide-react";
import { CategoryForm } from "@/components/categories/category-form";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind } from "@/lib/finance/types";
import { setCategoryActive } from "./actions";

type CategoryRow = { id: string; name: string; kind: CategoryKind; color: string | null; icon_key: string | null; active: boolean };
type LinkedRow = { category_id: string | null };

const kindLabels: Record<CategoryKind, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  debt: "Debt",
  subscription: "Subscription",
  sinking_fund: "Sinking fund",
  investment: "Investment",
  other: "Other"
};

const iconMap = {
  tag: Tag,
  wallet: WalletCards,
  receipt: ReceiptText,
  repeat: Repeat,
  "piggy-bank": PiggyBank,
  "credit-card": CreditCard,
  "trending-up": TrendingUp,
  "arrow-left-right": ArrowLeftRight
};

function StatusPill({ active }: { active: boolean }) {
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-muted")}>{active ? "Active" : "Inactive"}</span>;
}

function ToggleActiveForm({ id, active }: { id: string; active: boolean }) {
  return (
    <form action={setCategoryActive}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{active ? "Deactivate" : "Activate"}</button>
    </form>
  );
}

export default async function CategoriesPage() {
  const supabase = await createClient();
  const [categoriesResult, transactionsResult, budgetsResult, subscriptionsResult, annualResult] = await Promise.all([
    supabase.from("categories").select("id,name,kind,color,icon_key,active").order("active", { ascending: false }).order("kind").order("name"),
    supabase.from("transactions").select("category_id"),
    supabase.from("budgets").select("category_id"),
    supabase.from("subscriptions").select("category_id"),
    supabase.from("annual_expenses").select("category_id")
  ]);

  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const linkedRows = [
    ...((transactionsResult.data ?? []) as LinkedRow[]),
    ...((budgetsResult.data ?? []) as LinkedRow[]),
    ...((subscriptionsResult.data ?? []) as LinkedRow[]),
    ...((annualResult.data ?? []) as LinkedRow[])
  ];
  const usageByCategory = linkedRows.reduce((map, row) => {
    if (!row.category_id) return map;
    map.set(row.category_id, (map.get(row.category_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const loadError = categoriesResult.error ?? transactionsResult.error ?? budgetsResult.error ?? subscriptionsResult.error ?? annualResult.error;

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-emerald-50 to-blue-50 p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">Phase 8 categories</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">Categories</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">Manage finance categories used by transactions, budgets, subscriptions, sinking funds, debts, and investment tracking.</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-card"><Tag size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">Could not load categories: {loadError.message}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div>
          <h2 className="mb-3 text-xl font-black text-ink">Add category</h2>
          <CategoryForm />
          <p className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm font-bold text-muted">Categories with history are kept for reporting. Deactivate a category when you no longer want to use it for new records.</p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">Category list</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-card">{categories.length} categories</span>
          </div>
          {categories.length === 0 ? <p className="rounded-panel border border-dashed border-slate-300 bg-white/80 p-5 text-sm font-bold text-muted">No categories yet. Add an expense category such as Daily food, Transport, AI subscriptions, or Condo fees.</p> : null}
          {categories.map((category) => {
            const Icon = iconMap[category.icon_key as keyof typeof iconMap] ?? Tag;
            const usageCount = usageByCategory.get(category.id) ?? 0;
            return (
              <article key={category.id} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-card" style={{ backgroundColor: category.color ?? "#0f766e" }}><Icon size={18} aria-hidden="true" /></span>
                      <h3 className="text-lg font-black text-ink">{category.name}</h3>
                      <StatusPill active={category.active} />
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{kindLabels[category.kind]}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-muted">{usageCount} linked records</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-muted">{usageCount > 0 ? "This category has history, so deactivate it instead of deleting it." : "No linked records yet. You can still deactivate it if you do not want it in new forms."}</p>
                  </div>
                  <ToggleActiveForm id={category.id} active={category.active} />
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-primary">Edit category</summary>
                  <div className="mt-3"><CategoryForm category={category} compact /></div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
