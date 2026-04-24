'use client'

import { useCart } from '@/lib/cart-context'
import { ShoppingCart, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  productId: string
  productName: string
  brand: string
  className?: string
}

export function AddToCartButton({ productId, productName, brand, className = '' }: Props) {
  const { add, items } = useCart()
  const [added, setAdded] = useState(false)
  const inCart = items.some((i) => i.productId === productId)

  function handleAdd() {
    add({ productId, productName, brand })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button
      onClick={handleAdd}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        inCart || added
          ? 'bg-green-100 text-green-700'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
      } ${className}`}
    >
      {inCart || added ? (
        <>
          <Check className="h-3 w-3" />
          {added ? 'Added' : 'In cart'}
        </>
      ) : (
        <>
          <ShoppingCart className="h-3 w-3" />
          Add
        </>
      )}
    </button>
  )
}
