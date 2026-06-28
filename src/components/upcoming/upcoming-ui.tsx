import Link from "next/link";
import { AlarmClock, ArrowUpRight, BellRing, CheckCircle2, ShieldCheck } from "lucide-react";
import type { UpcomingItem, UpcomingSummary, UpcomingUrgency } from "@/lib/finance/upcoming";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, (month || 1) - 1, day || 1, 12));
}

const URGENCY_STYLES: Record<UpcomingUrgency, string> = {
  overdue: "bg-rose-50 text-rose-800 border-rose-200",
  "due-soon": "bg-amber-50 text-amber-800 border-amber-200",
  pending: "bg-slate-50 text-slate-700 border-slate-200"
};

const CHIP_STYLES: Record<UpcomingUrgency, string> = {
  overdue: "bg-rose-500 text-white",
  "due-soon": "bg-amber-500 text-white",
  pending: "bg-slate-200 text-slate-700"
};

function UrgencyChip({ urgency, locale }: { urgency: UpcomingUrgency; locale: Locale }) {
  const t = dictionaries[locale].upcoming;
  return <span className={"rounded-full px-2.5 py-1 text-xs font-black " + CHIP_STYLES[urgency]}>{t.urgency[urgency]}</span>;
}

function ItemRow({ item, locale }: { item: UpcomingItem; locale: Locale }) {
  const t = dictionaries[locale].upcoming;
  return (
    <Link
      href={item.href}
      className={"flex items-center justify-between gap-3 rounded-2xl border p-3 transition hover:border-primary/40 " + URGENCY_STYLES[item.urgency]}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-black text-ink">{item.title}</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-normal text-muted">{t.types[item.type]}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <UrgencyChip urgency={item.urgency} locale={locale} />
          <span className="text-xs font-bold text-muted">{item.dueDate ? t.due + " " + formatDate(item.dueDate) : t.noDueDate}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-black text-ink">{formatMoney(item.amount)}</span>
        <ArrowUpRight size={16} className="text-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}

export function UpcomingPanel({ summary, locale, maxItems = 4 }: { summary: UpcomingSummary; locale: Locale; maxItems?: number }) {
  const t = dictionaries[locale].upcoming;
  const visible = summary.items.slice(0, maxItems);
  const hiddenCount = summary.totalCount - visible.length;

  return (
    <section className="rounded-panel border border-slate-200 bg-white p-4 shadow-card md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="text-primary" size={20} aria-hidden="true" />
          <h2 className="text-xl font-black text-ink">{t.panelTitle}</h2>
          {summary.totalCount > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-rose-500 px-1.5 text-xs font-black text-white">{summary.totalCount}</span> : null}
        </div>
        <Link href="/upcoming" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-muted shadow-card transition hover:border-primary/40 hover:text-primary">{t.viewAll}</Link>
      </div>

      {summary.allCaughtUp ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="text-emerald-600" size={22} aria-hidden="true" />
          <div>
            <p className="text-sm font-black text-emerald-800">{t.allCaughtUp}</p>
            <p className="text-xs font-bold text-emerald-700/80">{t.allCaughtUpHint}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {visible.map((item) => <ItemRow key={item.id} item={item} locale={locale} />)}
          {hiddenCount > 0 ? (
            <Link href="/upcoming" className="rounded-2xl border border-dashed border-slate-300 p-2.5 text-center text-xs font-black text-muted transition hover:border-primary/40 hover:text-primary">
              + {hiddenCount} {t.itemsSuffix}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

function UrgencyGroup({ urgency, items, locale }: { urgency: UpcomingUrgency; items: UpcomingItem[]; locale: Locale }) {
  const t = dictionaries[locale].upcoming;
  if (items.length === 0) return null;
  const Icon = urgency === "overdue" ? AlarmClock : urgency === "due-soon" ? BellRing : ShieldCheck;
  return (
    <section className="grid gap-3">
      <div className="flex items-center gap-2">
        <Icon className={urgency === "overdue" ? "text-rose-600" : urgency === "due-soon" ? "text-amber-600" : "text-slate-500"} size={18} aria-hidden="true" />
        <h2 className="text-lg font-black text-ink">{t.urgency[urgency]}</h2>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-slate-100 px-1.5 text-xs font-black text-muted">{items.length}</span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => <ItemRow key={item.id} item={item} locale={locale} />)}
      </div>
    </section>
  );
}

export function UpcomingView({ summary, locale, loadError }: { summary: UpcomingSummary; locale: Locale; loadError: string | null }) {
  const t = dictionaries[locale].upcoming;
  const groups: UpcomingUrgency[] = ["overdue", "due-soon", "pending"];

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-teal-50 to-blue-50 p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">{t.phase}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-normal text-emerald-800"><ShieldCheck size={13} aria-hidden="true" />{t.readOnly}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">{t.subtitle}</p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-card"><BellRing size={22} aria-hidden="true" /></div>
        </div>
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-muted">{t.readOnlyNote}</p>
      </section>

      {loadError ? <p className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{t.loadError}: {loadError}</p> : null}

      {!loadError && summary.allCaughtUp ? (
        <section className="rounded-panel border border-emerald-200 bg-emerald-50 p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto text-emerald-600" size={36} aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black text-emerald-800">{t.allCaughtUp}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-emerald-700/80">{t.allCaughtUpHint}</p>
        </section>
      ) : null}

      {!loadError && !summary.allCaughtUp ? (
        <div className="grid gap-6">
          {groups.map((urgency) => (
            <UrgencyGroup key={urgency} urgency={urgency} items={summary.items.filter((item) => item.urgency === urgency)} locale={locale} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
