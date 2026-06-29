"use client";

import { useActionState, useState } from "react";
import { saveTransaction, type TransactionActionState } from "@/app/(private)/transactions/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type PlanningAccountOption = { id: string; name: string; type: string; active: boolean };
export type PlanningCardOption = { id: string; name: string };

const initialState: TransactionActionState = { status: "idle", message: "" };

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function ResultMessage({ state }: { state: TransactionActionState }) {
  if (!state.message) return null;
  return <p className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}>{state.message}</p>;
}

function AccountSelect({ accounts, defaultAccountId, locale }: { accounts: PlanningAccountOption[]; defaultAccountId?: string | null; locale: Locale }) {
  const t = dictionaries[locale].planning.payment;
  // Pre-select the user's default account when it is one of the available (active cash-like) accounts.
  const preferredAccountId = defaultAccountId && accounts.some((account) => account.id === defaultAccountId) ? defaultAccountId : accounts[0]?.id ?? "";
  return (
    <label className="grid gap-2 text-xs font-black text-ink">
      {t.payFrom}
      <select name="account_id" required defaultValue={preferredAccountId} className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60">
        <option value="" disabled>{t.chooseAccount}</option>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
    </label>
  );
}

export function PaySubscriptionForm({
  subscriptionId,
  categoryId,
  amount,
  accounts,
  creditCards,
  defaultAccountId,
  frequency,
  locale
}: {
  subscriptionId: string;
  categoryId: string | null;
  amount: number;
  accounts: PlanningAccountOption[];
  creditCards: PlanningCardOption[];
  defaultAccountId?: string | null;
  frequency: "monthly" | "yearly";
  locale: Locale;
}) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].planning.payment;
  const common = dictionaries[locale].common;

  // The payment source can be a cash-like account ("account:<id>") or a credit
  // card ("card:<id>"). Picking an account records an `expense` (deducts the
  // account); picking a card records a `credit_card_expense` (adds to the card's
  // statement, no cash deducted).
  const preferredAccountId = defaultAccountId && accounts.some((account) => account.id === defaultAccountId) ? defaultAccountId : accounts[0]?.id;
  const defaultSource = preferredAccountId ? "account:" + preferredAccountId : creditCards[0] ? "card:" + creditCards[0].id : "";
  const [source, setSource] = useState(defaultSource);
  const [kind, sourceId] = source ? (source.split(":") as ["account" | "card", string]) : ["", ""];
  const isCard = kind === "card";
  const noSources = accounts.length === 0 && creditCards.length === 0;

  // KNOWN v1 LIMITATION: paying with a card creates a credit_card_expense whose
  // related_entity_id is the card id (not the subscription), so the subscription's
  // "paid this cycle" badge will NOT light up for card payments. Intentionally not
  // hacked this round.
  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-line bg-elevated p-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value={isCard ? "credit_card_expense" : "expense"} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="expense_related_entity_id" value={subscriptionId} />
      {isCard ? <input type="hidden" name="credit_card_id" value={sourceId} /> : <input type="hidden" name="account_id" value={sourceId} />}
      <input type="hidden" name="notes" value={frequency === "yearly" ? "Annual subscription paid from planning page" : "Monthly subscription paid from planning page"} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-xs font-black text-ink">
          {t.paymentSource}
          <select value={source} onChange={(event) => setSource(event.target.value)} required disabled={noSources} className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60">
            {noSources ? <option value="" disabled>{t.chooseAccount}</option> : null}
            {accounts.length > 0 ? (
              <optgroup label={t.accountGroup}>
                {accounts.map((account) => <option key={account.id} value={"account:" + account.id}>{account.name}</option>)}
              </optgroup>
            ) : null}
            {creditCards.length > 0 ? (
              <optgroup label={t.cardGroup}>
                {creditCards.map((card) => <option key={card.id} value={"card:" + card.id}>{card.name}</option>)}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label className="grid gap-2 text-xs font-black text-ink">
          {t.paymentDate}
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      {isCard ? <p className="text-xs font-bold text-warning">{t.payWithCard}</p> : null}
      <button disabled={isPending || noSources || !source} className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-black text-canvas shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : frequency === "yearly" ? t.payAnnualSubscription : t.paySubscription}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function ReserveSubscriptionForm({ subscriptionId, amount, locale }: { subscriptionId: string; amount: number; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].planning.payment;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-income/20 bg-income/10 p-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="sinking_fund_reserve" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="reserve_entity_id" value={subscriptionId} />
      <input type="hidden" name="notes" value="Monthly reserve for annual subscription from planning page" />
      <label className="grid gap-2 text-xs font-black text-ink">
        {t.reserveDate}
        <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-income/20 bg-surface px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
      </label>
      <button disabled={isPending} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : t.reserveMonthlyAmount}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function ReserveAnnualExpenseForm({ annualExpenseId, amount, reserveAccountId, locale }: { annualExpenseId: string; amount: number; reserveAccountId?: string | null; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].planning.payment;
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-income/20 bg-income/10 p-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="sinking_fund_reserve" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="reserve_entity_id" value={annualExpenseId} />
      {reserveAccountId ? <input type="hidden" name="account_id" value={reserveAccountId} /> : null}
      <input type="hidden" name="notes" value="Monthly reserve for annual expense from planning page" />
      <label className="grid gap-2 text-xs font-black text-ink">
        {t.reserveDate}
        <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-income/20 bg-surface px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
      </label>
      <button disabled={isPending} className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-card transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : t.reserveThisMonth}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}

export function PayAnnualBillForm({
  annualExpenseId,
  categoryId,
  amount,
  accounts,
  defaultAccountId,
  reserveAccountId,
  reserveAccountName,
  locale
}: {
  annualExpenseId: string;
  categoryId: string | null;
  amount: number;
  accounts: PlanningAccountOption[];
  defaultAccountId?: string | null;
  reserveAccountId?: string | null;
  reserveAccountName?: string | null;
  locale: Locale;
}) {
  const [state, formAction, isPending] = useActionState(saveTransaction, initialState);
  const t = dictionaries[locale].planning.payment;
  const common = dictionaries[locale].common;
  // Bound rows pay from their fixed account (no picker); legacy rows (no
  // reserve_account_id yet) keep the account dropdown so they still work.
  const hasFixedAccount = Boolean(reserveAccountId);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="expense" />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="expense_related_entity_id" value={annualExpenseId} />
      <input type="hidden" name="notes" value="Annual bill paid from planning page" />
      {hasFixedAccount ? <input type="hidden" name="account_id" value={reserveAccountId as string} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {hasFixedAccount ? (
          <div className="grid gap-2 text-xs font-black text-ink">
            {t.reserveAccountFixed}
            <span className="rounded-2xl border border-warning/30 bg-surface px-3 py-2.5 text-sm font-bold text-ink">{reserveAccountName ?? ""}</span>
          </div>
        ) : (
          <AccountSelect accounts={accounts} defaultAccountId={defaultAccountId} locale={locale} />
        )}
        <label className="grid gap-2 text-xs font-black text-ink">
          {t.paymentDate}
          <input name="transaction_date" type="date" defaultValue={todayInput()} required className="rounded-2xl border border-warning/30 bg-surface px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary/60" />
        </label>
      </div>
      <button disabled={isPending || (!hasFixedAccount && accounts.length === 0)} className="rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-card transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isPending ? common.saving : t.payAnnualBill}
      </button>
      <ResultMessage state={state} />
    </form>
  );
}
