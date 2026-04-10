'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/context'

function NexusLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="currentColor" className="text-primary" />
      <path
        d="M8 20V8h2.4l5.6 8V8H18v12h-2.4L10 12v8H8Z"
        fill="white"
      />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError(t('login.invalidCredentials'))
      } else {
        setError(`${t('login.loginFailed')}：${err.message}`)
      }
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-6" style={{ '--primary': 'oklch(0.205 0 0)', '--primary-foreground': 'oklch(0.985 0 0)', '--ring': 'oklch(0.205 0 0)' } as React.CSSProperties}>
      <Card className="w-full max-w-sm shadow-lg rounded-2xl">
        <CardContent className="pt-8 pb-8 px-8 space-y-6">
          <div className="space-y-1">
            <NexusLogo />
            <h1 className="text-2xl font-bold pt-1">{t('login.signIn')}</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium">{t('login.emailLabel')}</label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium">{t('login.passwordLabel')}</label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
