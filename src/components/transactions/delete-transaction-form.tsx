"use client";

import { Trash2 } from "lucide-react";
import { deleteTransaction } from "@/app/(private)/transactions/actions";

export function DeleteTransactionForm({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this transaction? Linked balance effects will be reversed when safe.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100">
        <Trash2 size={14} aria-hidden="true" /> {label}
      </button>
    </form>
  );
}
