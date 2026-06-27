export default function DashboardLoading() {
  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-primary/15 bg-white/80 p-5 shadow-soft md:p-8">
        <div className="h-5 w-36 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-5 h-10 w-72 max-w-full animate-pulse rounded-2xl bg-slate-200" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-slate-100" />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-panel border border-slate-200 bg-white p-4 shadow-card">
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-6 h-8 w-32 animate-pulse rounded-xl bg-slate-200" />
          </div>
        ))}
      </section>
    </div>
  );
}
