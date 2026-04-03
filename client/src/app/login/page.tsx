'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
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
        setError('帳號或密碼錯誤')
      } else {
        setError(`登入失敗：${err.message}`)
      }
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dcfce7_0%,_#ecfeff_35%,_#ffffff_80%)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-200/70 bg-white/90 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-900">Nexus Finance</CardTitle>
          <CardDescription>登入你的分析工作台，直接存取 Supabase RPC 指標</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm text-slate-600">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm text-slate-600">密碼</label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>
            {error && <p className="text-rose-600 text-sm">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {loading ? '登入中...' : '登入'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
