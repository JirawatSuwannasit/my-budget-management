export default function PlanningLoading() {
  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-surface p-5 shadow-soft md:p-8">
        <div className="h-6 w-36 animate-pulse rounded-full bg-elevated" />
        <div className="mt-5 h-10 w-3/4 animate-pulse rounded-2xl bg-elevated" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-elevated" />
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-panel border border-line bg-surface p-4 shadow-card">
            <div className="h-4 w-28 animate-pulse rounded-full bg-elevated" />
            <div className="mt-4 h-8 w-32 animate-pulse rounded-xl bg-elevated" />
          </div>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="h-96 animate-pulse rounded-panel border border-line bg-surface shadow-card" />
        <div className="h-96 animate-pulse rounded-panel border border-line bg-surface shadow-card" />
      </section>
    </div>
  );
}
