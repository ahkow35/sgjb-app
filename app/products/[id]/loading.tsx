export default function ProductDetailLoading() {
  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto animate-pulse">
      <div className="h-4 w-20 rounded bg-muted mb-4" />
      <div className="mb-6 space-y-2">
        <div className="h-6 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="rounded-lg border overflow-hidden divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  )
}
