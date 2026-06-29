import { Moon, Sun } from "lucide-react";
import { setTheme } from "@/app/(private)/settings/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import type { Theme } from "@/lib/theme";

/**
 * Dark/Light theme switcher. A plain server-action form (no client JS): each
 * button submits its theme value, the action sets the cookie and revalidates the
 * layout, so SSR re-renders the correct palette with no flash.
 */
export function ThemeToggle({ theme, locale }: { theme: Theme; locale: Locale }) {
  const t = dictionaries[locale].settings;
  const options: Array<{ value: Theme; label: string; icon: typeof Moon }> = [
    { value: "dark", label: t.themeDark, icon: Moon },
    { value: "light", label: t.themeLight, icon: Sun }
  ];

  return (
    <form action={setTheme} className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-elevated p-1.5">
        {options.map((option) => {
          const Icon = option.icon;
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="submit"
              name="theme"
              value={option.value}
              aria-pressed={active}
              className={
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition " +
                (active ? "bg-primary text-canvas shadow-glow" : "text-muted hover:text-ink")
              }
            >
              <Icon size={16} aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs font-bold text-muted">{t.themeHint}</p>
    </form>
  );
}
