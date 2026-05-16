'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ExternalLink, Search, X, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TopBar } from '@/components/top-bar'
import { StatusBadge } from '@/components/status-badge'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Task, Client } from '@/lib/types'

const PAGE_SIZE = 10

const STATUSES = [
  'unclaimed', 'in-progress', 'paused', 'submitted', 'in-review',
  'approved', 'rejected', 'revision-requested', 'escalated', 'data-ready',
]

type Filters = {
  workflow: string
  annotatorEmail: string
  reviewerEmail: string
  status: string
  dateFrom: string
  dateTo: string
  clientId: string
}

const EMPTY: Filters = {
  workflow: '', annotatorEmail: '', reviewerEmail: '',
  status: '', dateFrom: '', dateTo: '', clientId: '',
}

export default function AdminWork() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const basePath = user?.clientSlug ? `/${user.clientSlug}/dashboard` : '/dashboard'

  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [clients, setClients] = useState<Client[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const lastSearch = useRef<{ f: Filters; p: number } | null>(null)

  const buildParams = (f: Filters): Record<string, string> => {
    const p: Record<string, string> = {}
    if (f.workflow)       p.workflow       = f.workflow
    if (f.annotatorEmail) p.annotatorEmail = f.annotatorEmail
    if (f.reviewerEmail)  p.reviewerEmail  = f.reviewerEmail
    if (f.status)         p.status         = f.status
    if (f.dateFrom)       p.dateFrom       = f.dateFrom
    if (f.dateTo)         p.dateTo         = f.dateTo
    if (f.clientId)       p.clientId       = f.clientId
    return p
  }

  const runSearch = useCallback(async (f: Filters, p = 1) => {
    setIsSearching(true)
    setError(null)
    setSearched(true)
    lastSearch.current = { f, p }
    try {
      const params = { ...buildParams(f), page: String(p), limit: String(PAGE_SIZE) }
      const result = await api.tasks.list(params)
      setTasks((result.tasks ?? []) as Task[])
      setTotal(result.total ?? 0)
      setPage(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setTasks([])
      setTotal(0)
    } finally { setIsSearching(false) }
  }, [])

  const set = (k: keyof Filters, v: string) => setFilters(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (isSuperAdmin) {
      api.clients.list().then(setClients).catch(() => {})
    }
  }, [isSuperAdmin])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && lastSearch.current) {
        runSearch(lastSearch.current.f, lastSearch.current.p)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [runSearch])

  const hasFilters = Object.values(filters).some(v => v !== '')

  return (
    <>
      <TopBar title="Work" subtitle="Filter and browse tasks across all workflows" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">

        {/* Filter Form */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Workspace — super admin only */}
              {isSuperAdmin && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs mb-1 block">Workspace</Label>
                  <Select value={filters.clientId || 'all'} onValueChange={v => set('clientId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-sm bg-secondary/30"><SelectValue placeholder="All workspaces" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All workspaces</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} <span className="text-muted-foreground text-xs">({c.plan})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs mb-1 block">Workflow</Label>
                <Input
                  placeholder="e.g. agentic-ai"
                  value={filters.workflow}
                  onChange={e => set('workflow', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Status</Label>
                <Select value={filters.status || 'all'} onValueChange={v => set('status', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm bg-secondary/30"><SelectValue placeholder="Any status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any status</SelectItem>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.replace(/-/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Annotator Email</Label>
                <Input
                  placeholder="annotator@company.com"
                  value={filters.annotatorEmail}
                  onChange={e => set('annotatorEmail', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Reviewer Email</Label>
                <Input
                  placeholder="reviewer@company.com"
                  value={filters.reviewerEmail}
                  onChange={e => set('reviewerEmail', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => set('dateFrom', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => set('dateTo', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => runSearch(filters, 1)}
                disabled={isSearching}
                className="gap-1.5"
              >
                <Search className="h-4 w-4" />
                {isSearching ? 'Searching…' : 'Search'}
              </Button>
              {searched && (
                <Button
                  variant="outline"
                  onClick={() => lastSearch.current && runSearch(lastSearch.current.f, lastSearch.current.p)}
                  disabled={isSearching}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" />Refresh
                </Button>
              )}
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={() => { setFilters(EMPTY); setTasks([]); setSearched(false); lastSearch.current = null }}
                  className="gap-1.5"
                >
                  <X className="h-4 w-4" />Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {error && <div className="text-destructive text-sm text-center py-4">{error}</div>}

        {searched && !isSearching && !error && (
          <>
            <p className="text-sm text-muted-foreground">{total} result{total !== 1 ? 's' : ''}</p>
            {tasks.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-base text-muted-foreground">No tasks match these filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <Card key={task.id} className="border-border bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link href={`${basePath}/tasks/${task.id}`} className="font-medium text-base text-foreground hover:text-primary truncate">
                              {task.title}
                            </Link>
                            <StatusBadge status={task.status} />
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">{task.workflowName} › {task.batchTitle}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                            {task.annotatorEmail && <span>Annotator: {task.annotatorEmail}</span>}
                            {task.reviewerEmail && <span>Reviewer: {task.reviewerEmail}</span>}
                            {task.submittedAt && <span>Submitted: {new Date(task.submittedAt).toLocaleDateString()}</span>}
                            {task.qualityScore && <span className="text-success font-medium">Quality: {task.qualityScore}%</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.externalUrl && (
                            <Button size="icon" variant="ghost" className="h-9 w-9"
                              onClick={() => window.open(task.externalUrl, '_blank', 'noopener,noreferrer')}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" className="h-9 px-4 text-sm" asChild>
                            <Link href={`${basePath}/tasks/${task.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <PaginationBar page={page} total={total} pageSize={PAGE_SIZE} onPage={p => runSearch(filters, p)} />
              </div>
            )}
          </>
        )}

        {!searched && !isSearching && (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-muted-foreground text-base">Set filters above and press Search</p>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
