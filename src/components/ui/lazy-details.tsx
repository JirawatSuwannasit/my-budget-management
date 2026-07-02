"use client";

import { useState, type ReactNode, type SyntheticEvent } from "react";

/**
 * A <details> that defers mounting its children until it has been opened at
 * least once, so collapsed rows (e.g. a per-row edit form island) never pay
 * the hydration cost. Once opened, children stay mounted across re-collapse
 * so in-progress edits are not lost.
 */
export function LazyDetails({
  summary,
  children,
  className,
  summaryClassName,
  defaultOpen = false
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
  defaultOpen?: boolean;
}) {
  const [everOpened, setEverOpened] = useState(defaultOpen);

  return (
    <details
      className={className}
      open={defaultOpen || undefined}
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
        if (event.currentTarget.open) setEverOpened(true);
      }}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {everOpened ? children : null}
    </details>
  );
}
