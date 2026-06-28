export default function ReportsLoading() {
  return (
    <div className="grid gap-5">
      <div className="h-48 animate-pulse rounded-[28px] bg-slate-100" />
      <div className="h-56 animate-pulse rounded-panel bg-slate-100" />
      <div className="grid gap-3">
        <div className="h-28 animate-pulse rounded-panel bg-slate-100" />
        <div className="h-28 animate-pulse rounded-panel bg-slate-100" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-panel bg-slate-100" />
        <div className="h-72 animate-pulse rounded-panel bg-slate-100" />
      </div>
    </div>
  );
}
