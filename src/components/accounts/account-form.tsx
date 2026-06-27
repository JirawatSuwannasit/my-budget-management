"use client";

import { useActionState } from "react";
import { saveAccount, type AccountActionState } from "@/app/(private)/accounts/actions";
import type { AccountType } from "@/lib/finance/types";

type AccountFormValue = { id?: string; name?: string; type?: AccountType; balance?: number | string; active?: boolean };

const accountTypes: Array<{ value: AccountType; label: string; hint: string }> = [
  { value: "main_bank", label: "บัญชีหลัก", hint: "นับเป็นเงินใช้ได้จริง" },
  { value: "other_bank", label: "บัญชีธนาคารอื่น", hint: "นับเป็นเงินใช้ได้จริง" },
  { value: "cash", label: "เงินสด", hint: "นับเป็นเงินใช้ได้จริง" },
  { value: "wallet", label: "วอลเล็ต", hint: "นับเป็นเงินใช้ได้จริง" },
  { value: "investment", label: "บัญชีลงทุน", hint: "แยกติดตาม ไม่นับเป็นเงินใช้ได้จริง" }
];

const initialState: AccountActionState = { status: "idle", message: "" };

export function AccountForm({ account, compact = false }: { account?: AccountFormValue; compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(saveAccount, initialState);
  const nameId = account?.id ? "account-name-" + account.id : "account-name-new";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {account?.id ? <input type="hidden" name="id" value={account.id} /> : null}
      <div className="grid gap-2">
        <label className="text-sm font-black text-ink" htmlFor={nameId}>ชื่อบัญชี</label>
        <input id={nameId} name="name" defaultValue={account?.name ?? ""} placeholder="เช่น KBank เงินเดือน" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          ประเภทบัญชี
          <select name="type" defaultValue={account?.type ?? "main_bank"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {accountTypes.map((type) => <option key={type.value} value={type.value}>{type.label} - {type.hint}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          ยอดเงินปัจจุบัน
          <input name="balance" type="number" step="0.01" min="0" defaultValue={account?.balance ?? 0} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
        <input name="active" type="checkbox" defaultChecked={account?.active ?? true} className="h-5 w-5 accent-primary" />
        ใช้งานบัญชีนี้
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "กำลังบันทึก..." : account?.id ? "บันทึกบัญชี" : "เพิ่มบัญชี"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}
