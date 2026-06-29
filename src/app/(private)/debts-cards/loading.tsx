export default function DebtsCardsLoading() {
  return (
    <div className="grid gap-5">
      <div className="h-48 animate-pulse rounded-[28px] bg-elevated" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-panel bg-elevated" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-panel bg-elevated" />
        <div className="h-96 animate-pulse rounded-panel bg-elevated" />
      </div>
    </div>
  );
}
