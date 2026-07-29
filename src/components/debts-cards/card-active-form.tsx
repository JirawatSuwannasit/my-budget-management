"use client";

import { useActionState } from "react";
import { setCreditCardActive, type DebtCardActionState } from "@/app/(private)/debts-cards/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

const initialState: DebtCardActionState = { status: "idle", message: "" };

export function CreditCardActiveForm({ id, active, locale }: { id: string; active: boolean; locale: Locale }) {
  const [state, formAction, isPending] = useActionState(setCreditCardActive, initialState);
  const common = dictionaries[locale].common;

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button disabled={isPending} className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-black text-ink shadow-card transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60">
        {active ? common.deactivate : common.activate}
      </button>
      {state.status === "error" ? <p className="max-w-md rounded-2xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{state.message}</p> : null}
    </form>
  );
}
