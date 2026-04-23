'use client'

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="p-4 text-center">
      <h2 className="text-lg font-semibold">Failed to load dashboard data</h2>
      <p className="mt-1 text-sm text-muted-foreground">External data sources may be temporarily unavailable.</p>
      <button onClick={reset} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Retry
      </button>
    </div>
  )
}
