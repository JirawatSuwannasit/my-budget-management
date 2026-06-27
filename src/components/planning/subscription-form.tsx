"use client";

import { useActionState } from "react";
import { saveSubscription, type PlanningActionState } from "@/app/(private)/planning/actions";

export type SubscriptionFormValue = {
  id?: string;
  name?: string;
  category_name?: string;
  frequency?: "monthly" | "yearly";
  price?: number | string;
  billing_day?: number | string;
  payment_method?: string | null;
  active?: boolean;
};

const initialState: PlanningActionState = { status: "idle", message: "" };
const subscriptionCategories = ["AI", "Sports / football", "Entertainment", "Productivity", "Other"];
const subscriptionExamples = ["ChatGPT", "Claude", "Premier League football streaming app", "Netflix", "Notion"];

export function SubscriptionForm({ subscription, compact = false }: { subscription?: SubscriptionFormValue; compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(saveSubscription, initialState);
  const idPrefix = subscription?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {subscription?.id ? <input type="hidden" name="id" value={subscription.id} /> : null}

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-[1fr_0.8fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"subscription-name-" + idPrefix}>
          ชื่อ subscription
          <input id={"subscription-name-" + idPrefix} name="name" list="subscription-examples" defaultValue={subscription?.name ?? ""} placeholder="เช่น ChatGPT" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
          <datalist id="subscription-examples">
            {subscriptionExamples.map((example) => <option key={example} value={example} />)}
          </datalist>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink" htmlFor={"subscription-category-" + idPrefix}>
          หมวด
          <select id={"subscription-category-" + idPrefix} name="category_name" defaultValue={subscription?.category_name ?? "AI"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {subscriptionCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-3"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          รอบบิล
          <select name="frequency" defaultValue={subscription?.frequency ?? "monthly"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="monthly">รายเดือน - fixed obligation</option>
            <option value="yearly">รายปี - sinking fund</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          ราคา
          <input name="price" type="number" min="0" step="0.01" defaultValue={subscription?.price ?? ""} placeholder="0.00" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          วันที่ตัดบิล
          <input name="billing_day" type="number" min="1" max="31" step="1" defaultValue={subscription?.billing_day ?? 1} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink">
        วิธีจ่าย
        <input name="payment_method" defaultValue={subscription?.payment_method ?? ""} placeholder="เช่น credit card, KBank" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={subscription?.active ?? true} className="h-5 w-5 accent-primary" />
        ใช้งาน subscription นี้
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "กำลังบันทึก..." : subscription?.id ? "บันทึก subscription" : "เพิ่ม subscription"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}
