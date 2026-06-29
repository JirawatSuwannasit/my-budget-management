/**
 * Theme tokens for the dark-first design system.
 *
 * Dark is the default. The chosen theme is persisted in a cookie so the server
 * can render the correct surface on first paint (no flash). No DB column is used.
 */
export const THEME_COOKIE = "theme";

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

export function resolveTheme(value: string | undefined | null): Theme {
  return value === "light" ? "light" : "dark";
}
