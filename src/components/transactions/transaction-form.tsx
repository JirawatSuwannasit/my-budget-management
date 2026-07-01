"use client";

import { useActionState, useMemo, useState } from "react";
import { saveTransaction, type TransactionActionState } from "@/app/(private)/transactions/actions";
import type { AccountType, CategoryKind, TransactionType } from "@/lib/finance/types";
import { isCashLikeType } from "@/lib/finance/types";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type TransactionFormAccount = { id: string; name: string; type: AccountType; active: boolean };
export type TransactionFormCategory = { id: string; name: string; kind: CategoryKind; active: boolean };
export type TransactionFormDebt = { id: string; name: string; active: boolean };
export type TransactionFormCard = { id: string; name: string; active: boolean };
export type TransactionFormReserve = { id: string; label: string; kind: "annual" | "subscription" };
export type TransactionFormPayable = { id: string; label: string; kind: "monthly_subscription" | "yearly_subscription" | "annual_expense" };
export type TransactionFormValue = { id?: string; type?: TransactionType; amount?: number | string; transaction_date?: string; account_id?: string | null; destination_account_id?: string | null; category_id?: string | null; related_entity_id?: string | null; notes?: string | null };

type Props = {
  accounts: TransactionFormAccount[];
  categories: TransactionFormCategory[];
  debts: TransactionFormDebt[];
  cards: TransactionFormCard[];
  reserves: TransactionFormReserve[];
  payables: TransactionFormPayable[];
  transaction?: TransactionFormValue;
  defaultAccountId?: string | null;
  locale: Locale;
  compact?: boolean;
};

const initialState: TransactionActionState = { status: "idle", message: "" };
const transactionTypeOrder: TransactionType[] = [
  "expense",
  "income",
  "transfer",
  "credit_card_expense",
  "credit_card_payment",
  "debt_payment",
  "investment_transfer",
  "sinking_fund_reserve"
];

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}


export function TransactionForm({ accounts, categories, debts, cards, reserves, payables, transaction, defaultAccountId, locale, compact = false }: Props) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].transactions;
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const activeAccounts = accounts.filter((account) => account.active);
  const cashLikeAccounts = activeAccounts.filter((account) => isCashLikeType(account.type));
  const investmentAccounts = activeAccounts.filter((account) => account.type === "investment");
  const needsSourceAccount = ["income", "expense", "transfer", "investment_transfer", "credit_card_payment", "debt_payment"].includes(type);
  const needsDestination = type === "transfer" || type === "investment_transfer";
  const sourceAccounts = type === "investment_transfer" || type === "expense" || type === "credit_card_payment" || type === "debt_payment" ? cashLikeAccounts : activeAccounts;
  const destinationAccounts = type === "investment_transfer" ? investmentAccounts : activeAccounts;
  const categoryOptions = useMemo(() => categories.filter((category) => category.active && (type === "income" ? category.kind === "income" : category.kind === "expense")), [categories, type]);
  const selectedRelated = transaction?.related_entity_id ?? "";
  // For a new transaction, pre-select the user's default account when it is an available source account.
  const defaultSourceAccountId = transaction?.account_id ?? (defaultAccountId && sourceAccounts.some((account) => account.id === defaultAccountId) ? defaultAccountId : "");

  return (
    <form action={formAction} className="grid gap-4 rounded-panel border border-line bg-surface p-4 shadow-card">
      {transaction?.id ? <input type="hidden" name="id" value={transaction.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <div className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-[1.1fr_0.9fr]"}>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.type}
          <select name="type" value={type} onChange={(event) => setType(event.target.value as TransactionType)} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            {transactionTypeOrder.map((value) => <option key={value} value={value}>{t.types[value]} - {t.typeHelpers[value]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.date}
          <input name="transaction_date" type="date" defaultValue={transaction?.transaction_date ?? todayInput()} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-ink">
        {t.form.amount}
        <input name="amount" type="number" step="0.01" min="0.01" defaultValue={transaction?.amount ?? ""} placeholder="0.00" required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
      </label>

      {needsSourceAccount ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.sourceAccount}
          <select name="account_id" defaultValue={defaultSourceAccountId} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.chooseAccount}</option>
            {sourceAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      ) : null}

      {needsDestination ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.destinationAccount}
          <select name="destination_account_id" defaultValue={transaction?.destination_account_id ?? ""} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.chooseDestination}</option>
            {destinationAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      ) : null}

      {(type === "income" || type === "expense" || type === "credit_card_expense") && categoryOptions.length > 0 ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.category}
          <select name="category_id" defaultValue={transaction?.category_id ?? ""} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.none}</option>
            {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      ) : null}

      {type === "expense" && payables.length > 0 ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.linkPayable}
          <select name="expense_related_entity_id" defaultValue={selectedRelated} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.noLink}</option>
            {payables.map((item) => <option key={item.kind + item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      ) : null}

      {type === "credit_card_expense" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.creditCard}
          <select name="credit_card_id" defaultValue={selectedRelated} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.chooseCreditCard}</option>
            {cards.filter((card) => card.active).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
        </label>
      ) : null}

      {type === "credit_card_payment" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.creditCard}
          <select name="credit_card_id" defaultValue={selectedRelated} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.chooseCreditCard}</option>
            {cards.filter((card) => card.active).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
        </label>
      ) : null}

      {type === "debt_payment" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.debt}
          <select name="debt_id" defaultValue={selectedRelated} required className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.chooseDebt}</option>
            {debts.filter((debt) => debt.active).map((debt) => <option key={debt.id} value={debt.id}>{debt.name}</option>)}
          </select>
        </label>
      ) : null}

      {type === "sinking_fund_reserve" ? (
        <label className="grid gap-2 text-sm font-black text-ink">
          {t.form.reserveEntity}
          <select name="reserve_entity_id" defaultValue={selectedRelated} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface">
            <option value="">{t.form.generalReserve}</option>
            {reserves.map((reserve) => <option key={reserve.kind + reserve.id} value={reserve.id}>{reserve.label}</option>)}
          </select>
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-black text-ink">
        {t.form.notes}
        <textarea name="notes" defaultValue={transaction?.notes ?? ""} rows={2} placeholder={t.form.notesOptional} className="rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold outline-none transition focus:border-primary/60 focus:bg-surface" />
      </label>

      <button type="submit" disabled={isPending} className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-canvas shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? dictionaries[locale].common.saving : transaction?.id ? t.form.save : type === "expense" ? t.form.addExpense : t.form.add}
      </button>

      {state.message ? <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p> : null}
    </form>
  );
}
