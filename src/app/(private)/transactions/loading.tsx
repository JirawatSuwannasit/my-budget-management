export default function TransactionsLoading() {
  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-surface/80 p-5 shadow-soft md:p-8">
        <div className="h-5 w-28 animate-pulse rounded-full bg-elevated" />
        <div className="mt-5 h-10 w-72 max-w-full animate-pulse rounded-2xl bg-elevated" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-elevated" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="h-96 animate-pulse rounded-panel border border-line bg-surface shadow-card" />
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-panel border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 animate-pulse rounded-full bg-elevated" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-elevated" />
              </div>
              <div className="mt-3 h-7 w-32 animate-pulse rounded-xl bg-elevated" />
              <div className="mt-2 h-3 w-40 animate-pulse rounded-full bg-elevated" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
