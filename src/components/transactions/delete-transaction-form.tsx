"use client";

import { Trash2 } from "lucide-react";
import { deleteTransaction } from "@/app/(private)/transactions/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export function DeleteTransactionForm({ id, locale }: { id: string; locale: Locale }) {
  const t = dictionaries[locale].transactions;
  return (
    <form
      action={deleteTransaction}
      onSubmit={(event) => {
        if (!window.confirm(t.deleteConfirm)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100">
        <Trash2 size={14} aria-hidden="true" /> {t.deleteLabel}
      </button>
    </form>
  );
}
