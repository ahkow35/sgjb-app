'use client'
import { useCurrency } from '@/contexts/CurrencyContext'

interface Props {
  bestSgd: number | null
  bestSgdStore: string | null
  bestSgdDate: string | null
  bestMyr: number | null
  bestMyrStore: string | null
  bestMyrDate: string | null
}

function fmtDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

export function ProductPriceRow({
  bestSgd, bestSgdStore, bestSgdDate,
  bestMyr, bestMyrStore, bestMyrDate,
}: Props) {
  const { rate } = useCurrency()
  const myrInSgd = bestMyr != null && rate ? bestMyr / rate : null

  if (bestSgd == null && bestMyr == null) return null

  return (
    <div className="grid grid-cols-2 divide-x border-t border-border">
      {/* Singapore */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 truncate">
          Singapore{bestSgdStore ? ` (${bestSgdStore})` : ''}
        </p>
        {bestSgd != null ? (
          <>
            <p className="text-base font-bold text-foreground">S${bestSgd.toFixed(2)}</p>
            {bestSgdDate && (
              <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(bestSgdDate)}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">No price yet</p>
        )}
      </div>

      {/* JB */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 truncate">
          JB{bestMyrStore ? ` (${bestMyrStore})` : ''}
        </p>
        {bestMyr != null ? (
          <>
            {myrInSgd != null && (
              <p className="text-base font-bold text-emerald-600">S${myrInSgd.toFixed(2)}</p>
            )}
            <p className="text-xs text-muted-foreground">RM {bestMyr.toFixed(2)}</p>
            {bestMyrDate && (
              <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(bestMyrDate)}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">No price yet</p>
        )}
      </div>
    </div>
  )
}
