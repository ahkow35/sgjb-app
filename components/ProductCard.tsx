import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
import { PriceHistoryDropdown } from './PriceHistoryDropdown'
import { ProductPriceRow } from './ProductPriceRow'

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
  bestSgdStore?: string | null
  bestSgdDate?: string | null
  bestMyr?: number | null
  bestMyrStore?: string | null
  bestMyrDate?: string | null
  pkgQty?: string | null
  pkgUnit?: string | null
}

export function ProductCard({
  product,
  bestSgd, bestSgdStore, bestSgdDate,
  bestMyr, bestMyrStore, bestMyrDate,
  pkgQty, pkgUnit,
}: Props) {
  // "425g · Groceries" — skip trivial "1 each"
  const hasSize = pkgQty && pkgUnit && !(Number(pkgQty) === 1 && pkgUnit === 'each')
  const subtitle = [
    hasSize ? `${Number(pkgQty)}${pkgUnit}` : null,
    product.category || null,
  ].filter(Boolean).join(' · ')

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
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-side SG vs JB prices — immediately visible */}
      <ProductPriceRow
        bestSgd={bestSgd ?? null}
        bestSgdStore={bestSgdStore ?? null}
        bestSgdDate={bestSgdDate ?? null}
        bestMyr={bestMyr ?? null}
        bestMyrStore={bestMyrStore ?? null}
        bestMyrDate={bestMyrDate ?? null}
      />

      {/* Full price history */}
      <PriceHistoryDropdown productId={product.id} />
    </div>
  )
}
