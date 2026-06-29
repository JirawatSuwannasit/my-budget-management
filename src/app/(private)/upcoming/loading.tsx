export default function UpcomingLoading() {
  return (
    <div className="grid gap-5">
      <div className="h-48 animate-pulse rounded-[28px] bg-elevated" />
      <div className="grid gap-3">
        <div className="h-20 animate-pulse rounded-panel bg-elevated" />
        <div className="h-20 animate-pulse rounded-panel bg-elevated" />
        <div className="h-20 animate-pulse rounded-panel bg-elevated" />
      </div>
    </div>
  );
}
