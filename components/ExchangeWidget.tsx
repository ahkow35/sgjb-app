'use client'
import { useEffect } from 'react'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { CachedRate } from '@/lib/exchange'

interface Props {
  initialData: CachedRate
}

export function ExchangeWidget({ initialData }: Props) {
  const { setRate } = useCurrency()

  useEffect(() => {
    setRate(initialData.rate)
  }, [initialData.rate, setRate])

  const sgdToMyr = initialData.rate.toFixed(4)
  const myrToSgd = (1 / initialData.rate).toFixed(4)
  const updatedTime = new Date(initialData.updatedAt).toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-gradient-to-br from-navy to-navy-light px-5 pt-10 pb-8 text-white">
      {/* App header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">SGJB</h1>
        <p className="text-sm text-white/70 mt-0.5">SG & JB Price Comparison</p>
      </div>

      {/* Rate card */}
      <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/60 font-medium uppercase tracking-widest">
            SGD / MYR Rate
          </p>
          <span className="flex items-center gap-1.5 bg-gold/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" />
            Live · {updatedTime}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-white/50 text-xs">1 SGD =</p>
            <p className="text-3xl font-extrabold tracking-tight">RM {sgdToMyr}</p>
          </div>
          <div>
            <p className="text-white/50 text-xs">1 MYR =</p>
            <p className="text-3xl font-extrabold tracking-tight">S$ {myrToSgd}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
