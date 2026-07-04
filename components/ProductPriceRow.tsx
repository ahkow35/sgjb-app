'use client'
import { Clock } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convert, format } from '@/lib/currency'

interface Props {
  bestSgd: number | null
  bestSgdStore: string | null
  bestSgdDate: string | null
  bestSgdBy: string | null
  bestMyr: number | null
  bestMyrStore: string | null
  bestMyrDate: string | null
  bestMyrBy: string | null
}

function fmtDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

export function ProductPriceRow({
  bestSgd, bestSgdStore, bestSgdDate, bestSgdBy,
  bestMyr, bestMyrStore, bestMyrDate, bestMyrBy,
}: Props) {
  const { currency, rate } = useCurrency()

  if (bestSgd == null && bestMyr == null) return null

  // Show both columns in the selected currency (converted) so they're directly
  // comparable; each side's native price is shown as a subline when it differs.
  const sgSel = bestSgd != null ? convert(bestSgd, 'SGD', currency, rate) : null
  const jbSel = bestMyr != null ? convert(bestMyr, 'MYR', currency, rate) : null

  // Cheaper side gets green; only when both prices are comparable
  let cheaperSide: 'sg' | 'jb' | null = null
  if (sgSel != null && jbSel != null) {
    cheaperSide = sgSel <= jbSel ? 'sg' : 'jb'
  }

  const sgPriceClass = cheaperSide === 'sg'
    ? 'text-emerald-600'
    : 'text-foreground'
  const jbPriceClass = cheaperSide === 'jb'
    ? 'text-emerald-600'
    : 'text-foreground'

  return (
    <div className="grid grid-cols-2 divide-x border-t border-border">
      {/* Singapore */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 truncate">
          Singapore{bestSgdStore ? ` (${bestSgdStore})` : ''}
        </p>
        {bestSgd != null ? (
          <>
            <p className={`text-base font-bold ${sgPriceClass}`}>{format(sgSel!, currency)}</p>
            {currency !== 'SGD' && (
              <p className="text-xs text-muted-foreground">{format(bestSgd, 'SGD')}</p>
            )}
            {(bestSgdDate || bestSgdBy) && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                {bestSgdDate && <Clock className="h-3 w-3 shrink-0" />}
                <span className="truncate">
                  {fmtDate(bestSgdDate)}
                  {bestSgdBy ? ` by ${bestSgdBy}` : ''}
                </span>
              </p>
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
            {jbSel != null && (
              <p className={`text-base font-bold ${jbPriceClass}`}>{format(jbSel, currency)}</p>
            )}
            {currency !== 'MYR' && (
              <p className="text-xs text-muted-foreground">{format(bestMyr, 'MYR')}</p>
            )}
            {(bestMyrDate || bestMyrBy) && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                {bestMyrDate && <Clock className="h-3 w-3 shrink-0" />}
                <span className="truncate">
                  {fmtDate(bestMyrDate)}
                  {bestMyrBy ? ` by ${bestMyrBy}` : ''}
                </span>
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">No price yet</p>
        )}
      </div>
    </div>
  )
}
