'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

type Tab = 'signin' | 'signup'

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Incorrect email or password')
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Sign up failed')
        setLoading(false)
        return
      }
      // Auto sign in after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      setLoading(false)
      if (result?.error) {
        setTab('signin')
        setError('Account created — please sign in')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Something went wrong')
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
            <label className="text-xs text-muted-foreground block mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={tab === 'signup' ? 'At least 8 characters' : '••••••••'}
            />
          </div>

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
