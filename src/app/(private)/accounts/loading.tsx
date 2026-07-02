export default function AccountsLoading() {
  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-surface/80 p-5 shadow-soft md:p-8">
        <div className="h-5 w-28 animate-pulse rounded-full bg-elevated" />
        <div className="mt-5 h-10 w-64 max-w-full animate-pulse rounded-2xl bg-elevated" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-elevated" />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-panel border border-line bg-surface p-4 shadow-card">
            <div className="h-4 w-24 animate-pulse rounded-full bg-elevated" />
            <div className="mt-6 h-8 w-32 animate-pulse rounded-xl bg-elevated" />
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="h-72 animate-pulse rounded-panel border border-line bg-surface shadow-card" />
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-panel border border-line bg-surface p-4 shadow-card">
              <div className="h-4 w-40 animate-pulse rounded-full bg-elevated" />
              <div className="mt-3 h-7 w-28 animate-pulse rounded-xl bg-elevated" />
              <div className="mt-2 h-3 w-48 animate-pulse rounded-full bg-elevated" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
