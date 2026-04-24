'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart, Search, PlusCircle, User } from 'lucide-react'
import { useSession } from 'next-auth/react'

const BASE_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Products', icon: Search },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/submit', label: 'Submit', icon: PlusCircle },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const items = [
    ...BASE_ITEMS,
    {
      href: session ? '/profile' : '/auth',
      label: session ? 'Profile' : 'Sign in',
      icon: User,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16 items-center justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === '/cart' && pathname === '/trip-roi')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
