import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PetrolPrices } from '@/lib/petrol'

interface Props {
  data: PetrolPrices
}

const grades = [
  { key: 'ron95' as const, label: 'RON 95', color: 'text-green-600' },
  { key: 'ron97' as const, label: 'RON 97', color: 'text-blue-600' },
  { key: 'diesel' as const, label: 'Diesel', color: 'text-orange-600' },
]

export function PetrolWidget({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          JB Petrol Prices (MYR/L)
          <Badge variant="outline" className="text-xs">
            {new Date(data.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {grades.map(({ key, label, color }) => (
            <div key={key} className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-lg font-bold ${color}`}>RM {data[key].toFixed(2)}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground">
          Source: data.gov.my · Weekly update
        </p>
      </CardContent>
    </Card>
  )
}
