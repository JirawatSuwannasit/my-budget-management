"use client";

import { useActionState, useMemo, useState } from "react";
import { saveTransaction, type TransactionActionState } from "@/app/(private)/transactions/actions";
import type { AccountType, CategoryKind, TransactionType } from "@/lib/finance/types";

export type TransactionFormAccount = { id: string; name: string; type: AccountType; active: boolean };
export type TransactionFormCategory = { id: string; name: string; kind: CategoryKind; active: boolean };
export type TransactionFormDebt = { id: string; name: string; active: boolean };
export type TransactionFormCard = { id: string; name: string; active: boolean };
export type TransactionFormStatement = { id: string; card_id: string; due_date: string; statement_amount_due: number | string; paid_amount: number | string; remaining_payable: number | string; status: "unpaid" | "partial" | "paid" };
export type TransactionFormReserve = { id: string; label: string; kind: "annual" | "subscription" };
export type TransactionFormPayable = { id: string; label: string; kind: "monthly_subscription" | "yearly_subscription" | "annual_expense" };
export type TransactionFormValue = { id?: string; type?: TransactionType; amount?: number | string; transaction_date?: string; account_id?: string | null; destination_account_id?: string | null; category_id?: string | null; related_entity_id?: string | null; notes?: string | null };

type Props = {
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
  debts: TransactionFormDebt[];
  cards: TransactionFormCard[];
  statements: TransactionFormStatement[];
  reserves: TransactionFormReserve[];
  payables: TransactionFormPayable[];
  transaction?: TransactionFormValue;
  compact?: boolean;
};

const initialState: TransactionActionState = { status: "idle", message: "" };
const transactionTypes: Array<{ value: TransactionType; label: string; helper: string }> = [
  { value: "expense", label: "รายจ่าย", helper: "ลดเงินสด/บัญชีทันที" },
  { value: "income", label: "รายรับ", helper: "เพิ่มเงินเข้าบัญชี" },
  { value: "transfer", label: "โอนระหว่างบัญชี", helper: "ไม่ถือเป็นรายจ่าย" },
  { value: "credit_card_expense", label: "ใช้บัตรเครดิต", helper: "เพิ่มหนี้บัตร ไม่ลดเงินสดทันที" },
  { value: "credit_card_payment", label: "จ่ายบัตรเครดิต", helper: "ลดเงินสดและยอดค้างบัตร" },
  { value: "debt_payment", label: "จ่ายหนี้", helper: "ลดเงินสดและยอดหนี้" },
  { value: "investment_transfer", label: "โอนไปลงทุน", helper: "แยกจากรายจ่ายปกติ" },
  { value: "sinking_fund_reserve", label: "กันเงินรายปี", helper: "กันเงินแบบ virtual ใน v1" }
];

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value));
}

export function TransactionForm({ accounts, categories, debts, cards, statements, reserves, payables, transaction, compact = false }: Props) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const activeAccounts = accounts.filter((account) => account.active);
  const cashLikeAccounts = activeAccounts.filter((account) => account.type !== "investment");
  const investmentAccounts = activeAccounts.filter((account) => account.type === "investment");
  const needsSourceAccount = ["income", "expense", "transfer", "investment_transfer", "credit_card_payment", "debt_payment"].includes(type);
  const needsDestination = type === "transfer" || type === "investment_transfer";
  const sourceAccounts = type === "investment_transfer" || type === "expense" || type === "credit_card_payment" || type === "debt_payment" ? cashLikeAccounts : activeAccounts;
  const destinationAccounts = type === "investment_transfer" ? investmentAccounts : activeAccounts;
  const categoryOptions = useMemo(() => categories.filter((category) => category.active && (type === "income" ? category.kind === "income" : category.kind === "expense")), [categories, type]);
  const selectedRelated = transaction?.related_entity_id ?? "";

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-slate-200 bg-white p-4 shadow-card">
      {transaction?.id ? <input type="hidden" name="id" value={transaction.id} /> : null}
      <div className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-[1.1fr_0.9fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          ประเภทรายการ
          <select name="type" value={type} onChange={(event) => setType(event.target.value as TransactionType)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            {transactionTypes.map((item) => <option key={item.value} value={item.value}>{item.label} - {item.helper}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          วันที่
          <input name="transaction_date" type="date" defaultValue={transaction?.transaction_date ?? todayInput()} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink">
        จำนวนเงิน
        <input name="amount" type="number" step="0.01" min="0.01" defaultValue={transaction?.amount ?? ""} placeholder="0.00" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </label>

      {needsSourceAccount ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          บัญชีต้นทาง / บัญชีรับเงิน
          <select name="account_id" defaultValue={transaction?.account_id ?? ""} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">เลือกบัญชี</option>
            {sourceAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      ) : null}

      {needsDestination ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          บัญชีปลายทาง
          <select name="destination_account_id" defaultValue={transaction?.destination_account_id ?? ""} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">เลือกบัญชีปลายทาง</option>
            {destinationAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      ) : null}

      {(type === "income" || type === "expense") && categoryOptions.length > 0 ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          หมวดหมู่
          <select name="category_id" defaultValue={transaction?.category_id ?? ""} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">ไม่ระบุ</option>
            {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      ) : null}

      {type === "expense" && payables.length > 0 ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          ผูกกับ subscription / ค่าใช้จ่ายรายปี
          <select name="expense_related_entity_id" defaultValue={selectedRelated} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">ไม่ผูก ใช้เป็นรายจ่ายทั่วไป</option>
            {payables.map((item) => <option key={item.kind + item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      ) : null}

      {type === "credit_card_expense" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          บัตรเครดิต
          <select name="credit_card_id" defaultValue={selectedRelated} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">เลือกบัตรเครดิต</option>
            {cards.filter((card) => card.active).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
        </label>
      ) : null}

      {type === "credit_card_payment" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          Statement ที่จ่าย
          <select name="statement_id" defaultValue={selectedRelated} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">เลือก statement</option>
            {statements.filter((statement) => statement.status !== "paid" || Number(statement.remaining_payable) > 0).map((statement) => {
              const card = cards.find((item) => item.id === statement.card_id);
              return <option key={statement.id} value={statement.id}>{card?.name ?? "Credit card"} due {statement.due_date} - ค้าง {formatMoney(statement.remaining_payable)}</option>;
            })}
          </select>
        </label>
      ) : null}

      {type === "debt_payment" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          หนี้ที่จ่าย
          <select name="debt_id" defaultValue={selectedRelated} required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">เลือกหนี้</option>
            {debts.filter((debt) => debt.active).map((debt) => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
          </select>
        </label>
      ) : null}

      {type === "sinking_fund_reserve" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          กองเงิน / ค่าใช้จ่ายรายปี
          <select name="reserve_entity_id" defaultValue={selectedRelated} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white">
            <option value="">กันเงินทั่วไป</option>
            {reserves.map((reserve) => <option key={reserve.kind + reserve.id} value={reserve.id}>{reserve.label}</option>)}
          </select>
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-black text-ink">
        หมายเหตุ
        <textarea name="notes" defaultValue={transaction?.notes ?? ""} rows={2} placeholder="ไม่บังคับ" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-white" />
      </label>

      <button type="submit" disabled={isPending} className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? "กำลังบันทึก..." : transaction?.id ? "บันทึกรายการ" : type === "expense" ? "เพิ่มรายจ่าย" : "เพิ่มรายการ"}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{state.message}</p> : null}
    </form>
  );
}
