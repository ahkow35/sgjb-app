'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export interface CartItem {
  productId: string
  productName: string
  brand: string
  quantity: number
  unitQty?: number   // package size amount (e.g. 500 for 500ml)
  unit?: string      // unit label (e.g. 'ml', 'g', 'each')
}

interface CartContextValue {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>) => void
  remove: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  updateItem: (productId: string, updates: Partial<Pick<CartItem, 'unitQty' | 'unit'>>) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue>({
  items: [],
  add: () => {},
  remove: () => {},
  updateQty: () => {},
  updateItem: () => {},
  clear: () => {},
})

const STORAGE_KEY = 'sgjb_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {}
  }, [items])

  function add(item: Omit<CartItem, 'quantity'>) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function remove(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function updateQty(productId: string, quantity: number) {
    if (quantity <= 0) {
      remove(productId)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    )
  }

  function updateItem(productId: string, updates: Partial<Pick<CartItem, 'unitQty' | 'unit'>>) {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, ...updates } : i)),
    )
  }

  function clear() {
    setItems([])
  }

  return (
    <CartContext.Provider value={{ items, add, remove, updateQty, updateItem, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
