'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ExternalLink, Search, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TopBar } from '@/components/top-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Task, Client } from '@/lib/types'

const PAGE_SIZE = 50

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

const statusBadge = (status: string) => {
  if (status === 'approved' || status === 'data-ready')
    return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Approved</Badge>
  if (status === 'submitted')
    return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-normal text-xs rounded-full px-2.5">Submitted</Badge>
  if (status === 'in-review')
    return <Badge className="bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-100 font-normal text-xs rounded-full px-2.5">In Review</Badge>
  if (status === 'in-progress')
    return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 font-normal text-xs rounded-full px-2.5">In Progress</Badge>
  if (status === 'rejected')
    return <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100 font-normal text-xs rounded-full px-2.5">Rejected</Badge>
  if (status === 'revision-requested')
    return <Badge className="bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-100 font-normal text-xs rounded-full px-2.5">Revision Needed</Badge>
  return <span className="text-xs text-muted-foreground capitalize">{status.replace(/-/g, ' ')}</span>
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

  const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
  const to = Math.min(page * PAGE_SIZE, total)
  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <TopBar title="Work" subtitle="Filter and browse tasks across all workflows" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">

        {/* Filter Form */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                <Input placeholder="e.g. agentic-ai" value={filters.workflow} onChange={e => set('workflow', e.target.value)} className="h-9 text-sm bg-secondary/30" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Status</Label>
                <Select value={filters.status || 'all'} onValueChange={v => set('status', v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm bg-secondary/30"><SelectValue placeholder="Any status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any status</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/-/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Annotator Email</Label>
                <Input placeholder="annotator@company.com" value={filters.annotatorEmail} onChange={e => set('annotatorEmail', e.target.value)} className="h-9 text-sm bg-secondary/30" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Reviewer Email</Label>
                <Input placeholder="reviewer@company.com" value={filters.reviewerEmail} onChange={e => set('reviewerEmail', e.target.value)} className="h-9 text-sm bg-secondary/30" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date From</Label>
                <Input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="h-9 text-sm bg-secondary/30" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date To</Label>
                <Input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className="h-9 text-sm bg-secondary/30" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => runSearch(filters, 1)} disabled={isSearching} className="gap-1.5">
                <Search className="h-4 w-4" />{isSearching ? 'Searching…' : 'Search'}
              </Button>
              {searched && (
                <Button variant="outline" onClick={() => lastSearch.current && runSearch(lastSearch.current.f, lastSearch.current.p)} disabled={isSearching} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" />Refresh
                </Button>
              )}
              {hasFilters && (
                <Button variant="outline" onClick={() => { setFilters(EMPTY); setTasks([]); setSearched(false); lastSearch.current = null }} className="gap-1.5">
                  <X className="h-4 w-4" />Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {error && <div className="text-destructive text-sm text-center py-4">{error}</div>}

        {searched && !isSearching && !error && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[300px]">Task ID</TableHead>
                  <TableHead>Workflow › Batch</TableHead>
                  <TableHead className="w-[160px]">Created at</TableHead>
                  <TableHead className="w-[160px]">Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Annotator</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No tasks match these filters
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Link href={`${basePath}/tasks/${task.id}`} className="text-primary hover:underline font-mono text-xs">
                          {task.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.workflowName} › {task.batchTitle}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>{statusBadge(task.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{task.annotatorEmail || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{task.reviewerEmail || '—'}</TableCell>
                      <TableCell className="text-sm font-medium text-green-600">
                        {task.qualityScore ? `${task.qualityScore}%` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {task.externalUrl && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => window.open(task.externalUrl, '_blank', 'noopener,noreferrer')}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                            <Link href={`${basePath}/tasks/${task.id}`}>View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
              <span className="text-xs text-muted-foreground">{from} - {to} of {total} rows</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => runSearch(filters, page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === pages || pages === 0} onClick={() => runSearch(filters, page + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setFilters(EMPTY); setTasks([]); setSearched(false); lastSearch.current = null }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
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
