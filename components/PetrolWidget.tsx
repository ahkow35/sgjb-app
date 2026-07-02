import type { PetrolPrices } from '@/lib/petrol'
import type { SgFuelPrices } from '@/lib/sg-fuel'

interface Props {
  data: PetrolPrices
  sgData: SgFuelPrices | null
  // MYR per 1 SGD (from the exchange widget). Used to show each MY price in SGD.
  rate: number
}

const grades = [
  { key: 'ron95' as const, sgKey: 'grade95' as const, label: 'RON 95', sgLabel: 'SG 95', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { key: 'ron97' as const, sgKey: 'grade98' as const, label: 'RON 97', sgLabel: 'SG 98', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { key: 'diesel' as const, sgKey: 'diesel' as const, label: 'Diesel', sgLabel: 'SG Diesel', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
]

export function PetrolWidget({ data, sgData, rate }: Props) {
  const dateLabel = new Date(data.date).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
  })
  const canConvert = rate > 0

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
            {canConvert && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ≈ S${(data[key] / rate).toFixed(2)}
              </p>
            )}
          </div>
        ))}
      </div>

      {sgData && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              SG Petrol Prices
            </p>
            <p className="text-xs text-muted-foreground">cheapest · motorist.sg</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {grades.map(({ key, sgKey, sgLabel, bg, border, text }) => {
              const sg = sgData[sgKey]
              return (
                <div
                  key={key}
                  className={`rounded-xl ${bg} border ${border} px-3 py-3 text-center`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{sgLabel}</p>
                  <p className={`text-xl font-extrabold ${text}`}>
                    {sg.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">S$/L · {sg.retailer}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
