'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group'
import { api } from '@/lib/api'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const data = await api.auth.login(email, password)
      // Store pending auth info — no clientSlug for super admin
      sessionStorage.setItem('pendingAuthEmail', email)
      sessionStorage.setItem('pendingAuthIsSuperAdmin', 'true')
      if (data.testOtp) sessionStorage.setItem('testOtp', data.testOtp)
      router.push('/verify-otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">L</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground">LabelForge</span>
            <span className="text-sm text-muted-foreground">AI Training Platform</span>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">System Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <FieldGroup className="gap-5">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Email Address</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon><Mail className="h-4 w-4" /></InputGroupAddon>
                    <InputGroupInput
                      id="email" type="email" placeholder="admin@labelforge.ai"
                      value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                    />
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon><Lock className="h-4 w-4" /></InputGroupAddon>
                    <InputGroupInput
                      id="password" type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password} onChange={e => setPassword(e.target.value)} required
                    />
                    <InputGroupAddon className="cursor-pointer">
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </Button>

                {/* Quick sign-in — selecting auto-submits */}
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or sign in as a test user</span>
                  </div>
                </div>
                <select
                  value=""
                  disabled={isLoading}
                  className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50"
                  onChange={async e => {
                    if (e.target.value !== 'superadmin@labelforge.ai') return
                    setEmail('superadmin@labelforge.ai')
                    setPassword('superadmin123!')
                    setIsLoading(true)
                    setError('')
                    try {
                      const data = await api.auth.login('superadmin@labelforge.ai', 'superadmin123!')
                      sessionStorage.setItem('pendingAuthEmail', 'superadmin@labelforge.ai')
                      sessionStorage.setItem('pendingAuthIsSuperAdmin', 'true')
                      if (data.testOtp) sessionStorage.setItem('testOtp', data.testOtp)
                      router.push('/verify-otp')
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Login failed')
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                >
                  <option value="" disabled>Select a test account to sign in instantly…</option>
                  <option value="superadmin@labelforge.ai">Super Admin — superadmin@labelforge.ai</option>
                </select>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link href="/" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to workspace login
          </Link>
        </div>
      </div>
    </div>
  )
}
