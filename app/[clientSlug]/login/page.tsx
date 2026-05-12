'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Building2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group'
import { api } from '@/lib/api'

// Test accounts match the seed data — all @labelforge.ai
const WORKSPACE_ACCOUNTS: Record<string, { label: string; email: string; password: string }[]> = {
  'acme-corp': [
    { label: 'Workspace Admin — Zawadi Ndungu',      email: 'zawadi.ndungu@labelforge.ai',  password: 'admin123!'     },
    { label: 'QA Lead — Mutua Kibet',                email: 'mutua.kibet@labelforge.ai',    password: 'reviewer123!'  },
    { label: 'Reviewer — Amina Hassan',              email: 'amina.hassan@labelforge.ai',   password: 'reviewer123!'  },
    { label: 'Annotator — Wanjiru Kamau',            email: 'wanjiru.kamau@labelforge.ai',  password: 'annotator123!' },
    { label: 'Annotator — Odhiambo Otieno',          email: 'odhiambo.otieno@labelforge.ai',password: 'annotator123!' },
    { label: 'Annotator — Njeri Mwangi',             email: 'njeri.mwangi@labelforge.ai',   password: 'annotator123!' },
    { label: 'Reviewer/Annotator — Kipchoge Ruto',   email: 'kipchoge.ruto@labelforge.ai',  password: 'annotator123!' },
  ],
  'techlab': [
    { label: 'Workspace Admin — Fatima Al-Rashid',   email: 'fatima.alrashid@labelforge.ai',password: 'admin123!'     },
    { label: 'Reviewer — Marcus Osei',               email: 'marcus.osei@labelforge.ai',    password: 'reviewer123!'  },
    { label: 'Annotator — Priya Sharma',             email: 'priya.sharma@labelforge.ai',   password: 'annotator123!' },
    { label: 'Annotator — James Okonkwo',            email: 'james.okonkwo@labelforge.ai',  password: 'annotator123!' },
  ],
}

export default function ClientLoginPage() {
  const router = useRouter()
  const params = useParams()
  const clientSlug = params.clientSlug as string

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const TEST_ACCOUNTS = WORKSPACE_ACCOUNTS[clientSlug] ?? []

  async function doLogin(loginEmail: string, loginPassword: string) {
    setIsLoading(true)
    setError('')
    try {
      const data = await api.auth.login(loginEmail, loginPassword)
      sessionStorage.setItem('pendingAuthEmail', loginEmail)
      sessionStorage.setItem('pendingAuthClientSlug', clientSlug)
      if (data.testOtp) sessionStorage.setItem('testOtp', data.testOtp)
      router.push('/verify-otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); doLogin(email, password) }

  // Selecting a test account fills the form AND auto-submits
  const handleTestSelect = (selectedEmail: string) => {
    const account = TEST_ACCOUNTS.find(a => a.email === selectedEmail)
    if (!account) return
    setEmail(account.email)
    setPassword(account.password)
    doLogin(account.email, account.password)
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
            <div className="mx-auto mb-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{clientSlug}</span>
            </div>
            <CardTitle className="text-xl">Sign in to your workspace</CardTitle>
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
                      id="email" type="email" placeholder="you@labelforge.ai"
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
                      Signing in…
                    </span>
                  ) : 'Sign In'}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or sign in as a test user</span>
              </div>
            </div>

            {/* Quick sign-in — selecting auto-submits */}
            <div className="w-full space-y-2">
              {TEST_ACCOUNTS.length > 0 ? (
                <select
                  value=""
                  disabled={isLoading}
                  className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onChange={e => handleTestSelect(e.target.value)}
                >
                  <option value="" disabled>Select a test account to sign in instantly…</option>
                  {TEST_ACCOUNTS.map(a => (
                    <option key={a.email} value={a.email}>{a.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground text-center italic">No test accounts for &quot;{clientSlug}&quot; — run Seed Database first.</p>
              )}
            </div>
          </CardFooter>
        </Card>

        <div className="mt-4 text-center">
          <Link href="/" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />Different workspace
          </Link>
        </div>
      </div>
    </div>
  )
}
