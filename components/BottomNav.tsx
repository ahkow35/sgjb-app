'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart, Search, PlusCircle, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCart } from '@/lib/cart-context'

const BASE_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: Search },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/submit', label: 'Submit', icon: PlusCircle },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { items } = useCart()
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const navItems = [
    ...BASE_ITEMS,
    {
      href: session ? '/profile' : '/auth',
      label: session ? 'Profile' : 'Sign in',
      icon: User,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex h-16 items-center justify-around max-w-md mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === '/cart' && pathname === '/trip-roi')

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${
                active ? 'text-navy font-semibold' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {href === '/cart' && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              {active && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />
              )}
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
