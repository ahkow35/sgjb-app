export default function ProductsLoading() {
  return (
    <div className="animate-pulse">
      <div className="sticky top-0 z-10 bg-background/95 pt-4 pb-3 px-4 border-b border-border">
        <div className="h-10 rounded-xl bg-muted" />
      </div>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-6 w-14 rounded-full bg-muted" />
      </div>
      <div className="px-4 space-y-3 pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-muted/50" />
        ))}
      </div>
    </div>
  )
}
