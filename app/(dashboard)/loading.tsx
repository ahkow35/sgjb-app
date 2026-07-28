export default function DashboardLoading() {
  return (
    <div className="pb-4 animate-pulse">
      <div className="bg-navy/10 px-5 pt-10 pb-8">
        <div className="h-8 w-32 rounded bg-navy/20 mb-2" />
        <div className="h-4 w-48 rounded bg-navy/10 mb-6" />
        <div className="h-28 rounded-2xl bg-navy/10" />
      </div>
      <div className="px-4 pt-5">
        <div className="h-3 w-40 rounded bg-muted mb-3" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  )
}
