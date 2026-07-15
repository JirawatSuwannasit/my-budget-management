import type { ComponentType, ReactNode } from "react";
import clsx from "clsx";

/**
 * Phase 9.5 design-system primitives (single source of truth for surfaces,
 * stats, controls, and status). All presentational and server-safe (no hooks),
 * so they can be used from both server and client components.
 *
 * Shared field className — used by the form primitives below and exported so the
 * existing client forms can opt in without duplicating the dark token classes.
 */
export const fieldClass =
  "rounded-2xl border border-line bg-elevated px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-faint focus:border-primary/60 focus:bg-surface";

export type Tone = "neutral" | "income" | "expense" | "debt" | "warning" | "investment" | "primary";
export type StatBlockTone = Tone;

const TONE_SURFACE: Record<Tone, string> = {
  neutral: "border-line bg-surface text-ink",
  income: "border-income/20 bg-income/10 text-income",
  expense: "border-danger/30 bg-danger/10 text-danger",
  debt: "border-debt/30 bg-debt/10 text-debt",
  warning: "border-warning/30 bg-warning/10 text-warning",
  investment: "border-investment/30 bg-investment/10 text-investment",
  primary: "border-primary/20 bg-primary/10 text-primary"
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-ink",
  income: "text-income",
  expense: "text-danger",
  debt: "text-debt",
  warning: "text-warning",
  investment: "text-investment",
  primary: "text-primary"
};

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-panel border border-line bg-surface p-4 shadow-card md:p-5", className)}>{children}</div>;
}

/** Lower-elevation inset container (e.g. nested groups). */
export function Surface({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-2xl border border-line bg-elevated p-3", className)}>{children}</div>;
}

export function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  action
}: {
  icon?: ComponentType<{ size?: number; className?: string }>;
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={20} className="text-primary" aria-hidden="true" /> : null}
        <div>
          {eyebrow ? <p className="text-caption font-black uppercase text-muted">{eyebrow}</p> : null}
          <h2 className="text-xl font-black text-ink">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

/** Label + big tabular number + optional delta. The dashboard hero uses a larger variant. */
export function StatBlock({
  label,
  value,
  tone = "neutral",
  icon: Icon,
  delta
}: {
  label: string;
  value: string;
  tone?: Tone;
  icon?: ComponentType<{ size?: number; className?: string }>;
  delta?: { value: string; tone?: Tone };
}) {
  return (
    <div className={clsx("rounded-panel border p-4 shadow-card", TONE_SURFACE[tone])}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-caption font-black uppercase opacity-80">{label}</p>
        {Icon ? <Icon size={18} className="opacity-75" aria-hidden="true" /> : null}
      </div>
      <p className="break-words text-stat font-black leading-none tabular-nums">{value}</p>
      {delta ? <p className={clsx("mt-2 text-xs font-bold tabular-nums", TONE_TEXT[delta.tone ?? "neutral"])}>{delta.value}</p> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-canvas shadow-glow hover:bg-primary/90",
  ghost: "border border-line bg-surface text-ink shadow-card hover:border-primary/40 hover:text-primary",
  danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20"
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return clsx(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
    BUTTON_VARIANT[variant],
    className
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: { variant?: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass(variant, className)} {...props}>
      {children}
    </button>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(fieldClass, className)} {...props}>
      {children}
    </select>
  );
}

export function Badge({ tone = "primary", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-black", TONE_SURFACE[tone])}>{children}</span>;
}

/** Status pill mapping the app's finance states to the semantic palette. */
export type StatusKind = "paid" | "partial" | "unpaid" | "reserved" | "active" | "inactive" | "overdue" | "due-soon" | "pending";

const STATUS_CLASS: Record<StatusKind, string> = {
  paid: TONE_SURFACE.income,
  active: TONE_SURFACE.income,
  reserved: TONE_SURFACE.income,
  partial: TONE_SURFACE.warning,
  "due-soon": TONE_SURFACE.warning,
  unpaid: TONE_SURFACE.expense,
  overdue: TONE_SURFACE.expense,
  pending: "border-line bg-elevated text-muted",
  inactive: "border-line bg-elevated text-muted"
};

export function StatusPill({ kind, children }: { kind: StatusKind; children: ReactNode }) {
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-black", STATUS_CLASS[kind])}>{children}</span>;
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("rounded-panel border border-dashed border-line bg-surface/60 p-5 text-sm font-bold text-muted", className)}>{children}</p>;
}
