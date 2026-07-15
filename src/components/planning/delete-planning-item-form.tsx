"use client";

import { Trash2 } from "lucide-react";
import type { Locale } from "@/lib/i18n/dictionaries";

export function DeletePlanningItemForm({
  id,
  action,
  confirmText,
  label,
  locale
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  confirmText: string;
  label: string;
  locale: Locale;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-black text-danger transition hover:bg-danger/15">
        <Trash2 size={14} aria-hidden="true" /> {label}
      </button>
    </form>
  );
}
