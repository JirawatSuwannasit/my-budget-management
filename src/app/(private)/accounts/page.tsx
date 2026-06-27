import { WalletCards } from "lucide-react";
import { AccountForm } from "@/components/accounts/account-form";
import { setAccountActive } from "./actions";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/finance/types";

type AccountRow = { id: string; name: string; type: AccountType; balance: number | string; active: boolean; is_cash_like: boolean };

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value));
}

const typeLabels: Record<AccountType, string> = {
  main_bank: "บัญชีหลัก",
  other_bank: "บัญชีธนาคารอื่น",
  cash: "เงินสด",
  wallet: "วอลเล็ต",
  investment: "บัญชีลงทุน"
};

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("id,name,type,balance,active,is_cash_like").order("active", { ascending: false }).order("name");
  const accounts = (data ?? []) as AccountRow[];
  const cashLikeTotal = accounts.filter((account) => account.active && account.is_cash_like).reduce((total, account) => total + Number(account.balance), 0);
  const investmentTotal = accounts.filter((account) => account.active && !account.is_cash_like).reduce((total, account) => total + Number(account.balance), 0);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-white via-teal-50 to-blue-50 p-5 shadow-soft md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-primary">Accounts</p>
            <h1 className="mt-4 text-3xl font-black text-ink md:text-5xl">บัญชีของฉัน</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">บัญชีเงินสด ธนาคาร และวอลเล็ตจะนับเป็นเงินใช้ได้จริง ส่วนบัญชีลงทุนจะแสดงแยกเพื่อไม่ปนกับเงินที่ใช้จ่ายประจำวัน</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-card"><WalletCards size={22} aria-hidden="true" /></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-panel border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 shadow-card">
          <p className="text-xs font-black uppercase tracking-normal opacity-70">เงินที่นับเป็นเงินใช้ได้จริง</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(cashLikeTotal)}</p>
        </div>
        <div className="rounded-panel border border-slate-200 bg-white p-4 text-ink shadow-card">
          <p className="text-xs font-black uppercase tracking-normal text-muted">บัญชีลงทุน แยกติดตาม</p>
          <p className="mt-3 text-3xl font-black">{formatMoney(investmentTotal)}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="mb-3 text-xl font-black text-ink">เพิ่มบัญชี</h2>
          <AccountForm />
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">รายการบัญชี</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-card">{accounts.length} accounts</span>
          </div>

          {error ? <p className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">โหลดบัญชีไม่สำเร็จ: {error.message}</p> : null}
          {!error && accounts.length === 0 ? <p className="rounded-panel border border-dashed border-slate-300 bg-white/80 p-5 text-sm font-bold text-muted">ยังไม่มีบัญชี เริ่มจากเพิ่มบัญชีหลักหรือเงินสดก่อน</p> : null}

          {accounts.map((account) => (
            <article key={account.id} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-ink">{account.name}</h3>
                    <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (account.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-muted")}>{account.active ? "Active" : "Inactive"}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{typeLabels[account.type]}</span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-ink">{formatMoney(account.balance)}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{account.is_cash_like ? "นับในเงินใช้ได้จริง" : "บัญชีลงทุน ไม่นับในเงินใช้ได้จริง"}</p>
                </div>
                <form action={setAccountActive}>
                  <input type="hidden" name="id" value={account.id} />
                  <input type="hidden" name="active" value={account.active ? "false" : "true"} />
                  <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary">{account.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
                </form>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-black text-primary">แก้ไขบัญชี</summary>
                <div className="mt-3"><AccountForm account={account} compact /></div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
