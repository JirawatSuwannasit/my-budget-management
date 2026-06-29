"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { resetAllData, type SettingsActionState } from "@/app/(private)/settings/actions";
import { Input } from "@/components/ui";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { RESET_CONFIRM_WORD } from "@/lib/reset";

const initialState: SettingsActionState = { status: "idle", message: "" };

export function DangerZone({ locale }: { locale: Locale }) {
  const [state, formAction, isPending] = useActionState(resetAllData, initialState);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();
  const t = dictionaries[locale].settings;
  const confirmed = confirmText.trim() === RESET_CONFIRM_WORD;

  useEffect(() => {
    // After a successful wipe, refresh so the empty/demo state shows everywhere.
    if (state.status === "success") {
      setConfirmText("");
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <article className="rounded-panel border border-danger/40 bg-danger/[0.06] p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="text-danger" size={20} aria-hidden="true" />
        <h2 className="text-xl font-black text-danger">{t.dangerZone}</h2>
      </div>

      <h3 className="text-sm font-black text-ink">{t.resetTitle}</h3>
      <p className="mt-2 text-sm font-semibold text-muted">{t.resetDescription}</p>
      <p className="mt-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{t.resetIrreversible}</p>

      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-2 text-sm font-black text-ink" htmlFor="reset-confirm">
          {t.resetConfirmLabel}
          <Input
            id="reset-confirm"
            name="confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={t.resetConfirmPlaceholder}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="reset-help"
          />
        </label>

        <button
          type="submit"
          disabled={!confirmed || isPending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-danger px-5 py-3 text-sm font-black text-canvas transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={18} aria-hidden="true" />
          {isPending ? t.resetting : t.resetButton}
        </button>

        {state.message ? (
          <p
            id="reset-help"
            aria-live="polite"
            className={"rounded-2xl px-4 py-3 text-sm font-bold " + (state.status === "success" ? "bg-income/10 text-income" : "bg-danger/10 text-danger")}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </article>
  );
}
