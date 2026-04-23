import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PriceHistoryDropdown } from './PriceHistoryDropdown'

interface Product {
  id: string
  name: string
  brand: string
  category: string
  unit_type: string
  image_url: string
}

interface Props {
  product: Product
}

export function ProductCard({ product }: Props) {
  return (
    <Card>
      <CardContent className="pt-3 pb-2 px-3">
        <div className="flex items-start gap-2">
          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-12 w-12 rounded object-contain"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{product.name}</p>
            {product.brand && (
              <p className="text-xs text-muted-foreground">{product.brand}</p>
            )}
            <div className="mt-1 flex gap-1">
              {product.category && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{product.category}</Badge>
              )}
              <Badge variant="outline" className="text-xs px-1.5 py-0">{product.unit_type}</Badge>
            </div>
          </div>
        </div>
        <PriceHistoryDropdown productId={product.id} />
      </CardContent>
    </Card>
  )
}
