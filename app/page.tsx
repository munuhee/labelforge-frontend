'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group'

export default function WorkspaceEntryPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = slug.trim().toLowerCase().replace(/\s+/g, '-')
    if (!clean) { setError('Please enter your workspace name.'); return }
    if (!/^[a-z0-9-]+$/.test(clean)) {
      setError('Workspace names can only contain letters, numbers, and hyphens.')
      return
    }
    router.push(`/${clean}/login`)
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
            <CardTitle className="text-xl">Welcome to LabelForge</CardTitle>
            <CardDescription>Enter your workspace slug to sign in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleContinue}>
              <FieldGroup className="gap-5">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="slug">Workspace Slug</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon><Building2 className="h-4 w-4" /></InputGroupAddon>
                    <InputGroupInput
                      id="slug"
                      type="text"
                      placeholder="Enter your workspace slug"
                      value={slug}
                      onChange={e => { setSlug(e.target.value); setError('') }}
                      autoFocus
                      required
                    />
                  </InputGroup>
                </Field>

                <Button type="submit" className="w-full gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </FieldGroup>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
            </div>

            {/* Quick workspace shortcuts */}
            <div className="w-full p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
              <p className="text-xs font-medium text-foreground">Test Workspaces</p>
              <div className="flex gap-2">
                {['acme-corp', 'techlab'].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => router.push(`/${w}/login`)}
                    className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border bg-background hover:bg-secondary hover:border-primary/40 transition-colors text-foreground font-mono"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                System Admin login →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
