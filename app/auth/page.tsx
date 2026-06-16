'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

type Tab = 'signin' | 'signup'
type Country = 'SG' | 'MY'

const COUNTRIES: { value: Country; label: string }[] = [
  { value: 'SG', label: '🇸🇬 +65' },
  { value: 'MY', label: '🇲🇾 +60' },
]

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [tab, setTab] = useState<Tab>('signin')
  const [country, setCountry] = useState<Country>('SG')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function completeSignIn() {
    const result = await signIn('phone-pin', { country, phone, pin, redirect: false })
    if (result?.error) {
      setError('Incorrect mobile number or PIN — or too many attempts, try again later')
      return false
    }
    router.push(callbackUrl)
    router.refresh()
    return true
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    await completeSignIn()
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, phone, pin, display_name: displayName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Sign up failed')
        setLoading(false)
        return
      }
      // Auto sign in after successful registration.
      const ok = await completeSignIn()
      if (!ok) {
        setTab('signin')
        setError('Account created — please sign in')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navy top panel */}
      <div className="bg-gradient-to-br from-navy to-navy-light px-6 pt-14 pb-16 text-white text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">SGJB</h1>
        <p className="text-sm text-white/70 mt-1">SG & JB Price Comparison</p>
      </div>

      {/* White card overlapping the panel */}
      <div className="-mt-8 mx-4 bg-card rounded-2xl shadow-lg border border-border p-6 flex-1">
        {/* Tabs */}
        <div className="flex rounded-xl border border-border overflow-hidden mb-5">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'bg-navy text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Mobile number</label>
            <div className="flex gap-2">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as Country)}
                className="rounded-xl border bg-background px-2 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Country code"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={country === 'SG' ? '9123 4567' : '12 345 6789'}
              />
            </div>
          </div>

          {tab === 'signup' && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="What your household sees"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground block mb-1">6-digit PIN</label>
            <input
              type="password"
              required
              inputMode="numeric"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              maxLength={6}
              pattern="\d{6}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm tracking-[0.4em] outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="••••••"
            />
          </div>

          {tab === 'signup' && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Confirm PIN</label>
              <input
                type="password"
                required
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm tracking-[0.4em] outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-navy py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading
              ? tab === 'signin' ? 'Signing in…' : 'Creating account…'
              : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError('') }}
            className="text-navy font-semibold hover:underline"
          >
            {tab === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}
