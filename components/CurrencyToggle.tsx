'use client'
import { Button } from '@/components/ui/button'
import { useCurrency } from '@/contexts/CurrencyContext'

export function CurrencyToggle() {
  const { currency, toggle } = useCurrency()
  return (
    <Button variant="outline" size="sm" onClick={toggle} className="h-7 px-2 text-xs">
      View in {currency === 'SGD' ? 'MYR' : 'SGD'}
    </Button>
  )
}
