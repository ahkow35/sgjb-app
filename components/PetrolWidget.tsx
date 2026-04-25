import type { PetrolPrices } from '@/lib/petrol'

interface Props {
  data: PetrolPrices
}

const grades = [
  { key: 'ron95' as const, label: 'RON 95', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { key: 'ron97' as const, label: 'RON 97', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { key: 'diesel' as const, label: 'Diesel', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
]

export function PetrolWidget({ data }: Props) {
  const dateLabel = new Date(data.date).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="px-4 pt-5 pb-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          JB Petrol Prices
        </p>
        <p className="text-xs text-muted-foreground">{dateLabel} · data.gov.my</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {grades.map(({ key, label, bg, border, text }) => (
          <div
            key={key}
            className={`rounded-xl ${bg} border ${border} px-3 py-3 text-center`}
          >
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-extrabold ${text}`}>
              {data[key].toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">RM/L</p>
          </div>
        ))}
      </div>
    </div>
  )
}
