import { db, products, priceEntries, stores } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

async function getProduct(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  return product ?? null
}

async function getPrices(productId: string) {
  return db
    .select({
      id: priceEntries.id,
      price: priceEntries.price,
      currency: priceEntries.currency,
      quantity: priceEntries.quantity,
      unit: priceEntries.unit,
      price_per_unit: priceEntries.pricePerUnit,
      date_observed: priceEntries.dateObserved,
      created_at: priceEntries.createdAt,
      stores: {
        id: stores.id,
        name: stores.name,
        country: stores.country,
        city: stores.city,
        type: stores.type,
      },
    })
    .from(priceEntries)
    .innerJoin(stores, eq(priceEntries.storeId, stores.id))
    .where(eq(priceEntries.productId, productId))
    .orderBy(desc(priceEntries.dateObserved))
    .limit(50)
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, prices] = await Promise.all([getProduct(params.id), getPrices(params.id)])

  if (!product) notFound()

  const sgPrices = prices.filter((p) => p.currency === 'SGD')
  const myPrices = prices.filter((p) => p.currency === 'MYR')

  return (
    <div className="pb-24 px-4 pt-4 max-w-lg mx-auto">
      <Link
        href="/products"
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Products
      </Link>

      <div className="mb-6">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-24 h-24 object-contain rounded-lg border mb-3"
          />
        )}
        <h1 className="text-xl font-semibold">{product.name}</h1>
        {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
        <div className="flex gap-2 mt-2">
          {product.category && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
              {product.category.replace(/-/g, ' ')}
            </span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
            {product.unitType}
          </span>
        </div>
      </div>

      {prices.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No prices yet.</p>
          <Link href="/submit" className="text-primary hover:underline mt-2 inline-block">
            Submit the first price →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sgPrices.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Singapore (SGD)
              </h2>
              <PriceTable prices={sgPrices} />
            </section>
          )}
          {myPrices.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Johor Bahru (MYR)
              </h2>
              <PriceTable prices={myPrices} />
            </section>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link
          href={`/submit?product_id=${product.id}&product_name=${encodeURIComponent(product.name)}`}
          className="block w-full rounded-lg border border-primary py-3 text-sm font-medium text-primary text-center hover:bg-primary/5"
        >
          Submit a price for this product
        </Link>
      </div>
    </div>
  )
}

function PriceTable({
  prices,
}: {
  prices: Awaited<ReturnType<typeof getPrices>>
}) {
  return (
    <div className="rounded-lg border overflow-hidden divide-y">
      {prices.map((p) => (
        <div key={p.id} className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{p.stores.name}</p>
            <p className="text-xs text-muted-foreground">{p.date_observed}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">
              {p.currency === 'MYR' ? 'RM' : 'S$'} {Number(p.price).toFixed(2)}
            </p>
            {p.price_per_unit && (
              <p className="text-xs text-muted-foreground">
                {p.currency === 'MYR' ? 'RM' : 'S$'}{' '}
                {Number(p.price_per_unit).toFixed(3)}/{p.unit}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
