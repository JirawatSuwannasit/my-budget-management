import { ArrowLeftRight, CreditCard, PiggyBank, ReceiptText, Repeat, Tag, TrendingUp, WalletCards } from "lucide-react";
import { CategoryForm } from "@/components/categories/category-form";
import { dictionaries, isLocale, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind } from "@/lib/finance/types";
import { setCategoryActive } from "./actions";

type CategoryRow = { id: string; name: string; kind: CategoryKind; color: string | null; icon_key: string | null; active: boolean };
type LinkedRow = { category_id: string | null };

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

function StatusPill({ active, locale }: { active: boolean; locale: Locale }) {
  const common = dictionaries[locale].common;
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (active ? "bg-income/10 text-income" : "bg-elevated text-muted")}>{active ? common.active : common.inactive}</span>;
}

function ToggleActiveForm({ id, active, locale }: { id: string; active: boolean; locale: Locale }) {
  const common = dictionaries[locale].common;
  return (
    <form action={setCategoryActive}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{active ? common.deactivate : common.activate}</button>
    </form>
  );
}

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const [profileResult, categoriesResult, transactionsResult, budgetsResult, subscriptionsResult, annualResult] = await Promise.all([
    user ? supabase.from("profiles").select("locale").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("categories").select("id,name,kind,color,icon_key,active").order("active", { ascending: false }).order("kind").order("name"),
    supabase.from("transactions").select("category_id"),
    supabase.from("budgets").select("category_id"),
    supabase.from("subscriptions").select("category_id"),
    supabase.from("annual_expenses").select("category_id")
  ]);

  const locale = isLocale(profileResult.data?.locale) ? profileResult.data.locale : "th";
  const t = dictionaries[locale].categories;
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
  const loadError = profileResult.error ?? categoriesResult.error ?? transactionsResult.error ?? budgetsResult.error ?? subscriptionsResult.error ?? annualResult.error;

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-elevated via-surface to-surface p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.phase}</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-canvas shadow-card"><Tag size={22} aria-hidden="true" /></div>
        </div>
      </section>

      {loadError ? <p className="rounded-panel border border-danger/30 bg-danger/10 p-4 text-sm font-bold text-danger">{t.loadError}: {loadError.message}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div>
          <h2 className="mb-3 text-xl font-black text-ink">{t.addCategory}</h2>
          <CategoryForm locale={locale} />
          <p className="mt-3 rounded-2xl border border-line bg-surface/80 p-4 text-sm font-bold text-muted">{t.help}</p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">{t.categoryList}</h2>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-black text-muted shadow-card">{categories.length} {t.countSuffix}</span>
          </div>
          {categories.length === 0 ? <p className="rounded-panel border border-dashed border-line bg-surface/80 p-5 text-sm font-bold text-muted">{t.empty}</p> : null}
          {categories.map((category) => {
            const Icon = iconMap[category.icon_key as keyof typeof iconMap] ?? Tag;
            const usageCount = usageByCategory.get(category.id) ?? 0;
            return (
              <article key={category.id} className="rounded-panel border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-card" style={{ backgroundColor: category.color ?? "#0f766e" }}><Icon size={18} aria-hidden="true" /></span>
                      <h3 className="text-lg font-black text-ink">{category.name}</h3>
                      <StatusPill active={category.active} locale={locale} />
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{t.kinds[category.kind]}</span>
                      <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-black text-muted">{usageCount} {t.linkedRecords}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-muted">{usageCount > 0 ? t.historyHelp : t.noLinksHelp}</p>
                  </div>
                  <ToggleActiveForm id={category.id} active={category.active} locale={locale} />
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-primary">{t.editCategory}</summary>
                  <div className="mt-3"><CategoryForm category={category} compact locale={locale} /></div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
