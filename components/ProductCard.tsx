import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
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
  bestSgd?: number | null
  bestMyr?: number | null
}

export function ProductCard({ product, bestSgd, bestMyr }: Props) {
  const hasPrices = bestSgd != null || bestMyr != null

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-14 w-14 rounded-xl object-contain flex-shrink-0 bg-muted p-1"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/products/${product.id}`} className="min-w-0 hover:underline">
                <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                  {product.name}
                </p>
              </Link>
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                brand={product.brand}
                unitType={product.unit_type}
                className="shrink-0"
              />
            </div>
            {product.brand && (
              <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
            )}
            <div className="mt-1.5 flex gap-1.5 flex-wrap">
              {product.category && (
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  {product.category}
                </span>
              )}
              {product.unit_type && (
                <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                  {product.unit_type}
                </span>
              )}
            </div>

            {/* Best prices — immediately visible */}
            {hasPrices && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {bestSgd != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-xs font-semibold">
                    🇸🇬 S${bestSgd.toFixed(2)}
                  </span>
                )}
                {bestMyr != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-semibold">
                    🇲🇾 RM{bestMyr.toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <PriceHistoryDropdown productId={product.id} />
    </div>
  )
}
