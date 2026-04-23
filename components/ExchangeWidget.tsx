'use client'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          SGD / MYR Exchange Rate
          <Badge variant="outline" className="text-xs">
            {new Date(initialData.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">1 SGD =</p>
            <p className="text-xl font-bold">RM {sgdToMyr}</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">1 MYR =</p>
            <p className="text-xl font-bold">S$ {myrToSgd}</p>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground">
          Updated {new Date(initialData.updatedAt).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </CardContent>
    </Card>
  )
}
