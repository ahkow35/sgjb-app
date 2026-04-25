import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/BottomNav'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { CartProvider } from '@/lib/cart-context'
import { SessionProvider } from '@/components/SessionProvider'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'SGJB — SG & JB Price Comparison',
  description: 'Compare grocery, pharmacy and petrol prices between Singapore and Johor Bahru',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SGJB' },
}

export const viewport: Viewport = {
  themeColor: '#1B2A4A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <SessionProvider>
          <CurrencyProvider>
            <CartProvider>
              <main className="mx-auto max-w-md min-h-screen pb-20">
                {children}
              </main>
              <BottomNav />
            </CartProvider>
          </CurrencyProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
