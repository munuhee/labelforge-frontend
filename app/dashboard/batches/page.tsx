'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { TopBar } from '@/components/top-bar'
import { PriorityBadge, TaskTypeBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Batch, BatchStatus } from '@/lib/types'

const PAGE_SIZE = 50

const statusBadge = (status: string) => {
  if (status === 'completed') return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Completed</Badge>
  if (status === 'in-progress') return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-normal text-xs rounded-full px-2.5">In Progress</Badge>
  return <span className="text-xs text-muted-foreground capitalize">{status}</span>
}

export default function BatchesPage() {
  const { user } = useAuth()
  const [batches, setBatches] = useState<Batch[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.batches.list()
      .then(setBatches)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const handleStart = async (batchId: string) => {
    try {
      const tasks = await api.tasks.list({ batchId, status: 'unclaimed' })
      if (!tasks.length) return
      const task = tasks[Math.floor(Math.random() * tasks.length)]
      await api.tasks.action(task.id, 'claim')
      window.location.href = `/dashboard/tasks/${task.id}`
    } catch { /* noop */ }
  }

  const filtered = batches
    .filter(b => (typeFilter === 'all' || b.taskType === typeFilter) && (statusFilter === 'all' || b.status === statusFilter))
    .sort((a, b) => {
      const da = new Date(a.createdAt ?? 0).getTime()
      const db = new Date(b.createdAt ?? 0).getTime()
      return sortDir === 'desc' ? db - da : da - db
    })

  const completed = filtered.filter(b => b.status === 'completed')

  const TableView = ({ rows }: { rows: Batch[] }) => {
    const total = rows.length
    const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
    const to = Math.min(page * PAGE_SIZE, total)
    const pages = Math.ceil(total / PAGE_SIZE)
    const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[300px]">Batch ID</TableHead>
              <TableHead
                className="w-[200px] cursor-pointer select-none"
                onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              >
                <span className="flex items-center gap-1">
                  Created at
                  {sortDir === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </span>
              </TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              {user?.role === 'annotator' && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No batches found
                </TableCell>
              </TableRow>
            ) : (
              paged.map(batch => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <Link href={`/dashboard/batches/${batch.id}`} className="text-primary hover:underline font-mono text-xs">
                      {batch.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{batch.workflowName}</TableCell>
                  <TableCell><TaskTypeBadge type={batch.taskType} className="text-[10px]" /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{batch.tasksTotal}</TableCell>
                  <TableCell><PriorityBadge priority={batch.priority} /></TableCell>
                  <TableCell>{statusBadge(batch.status)}</TableCell>
                  {user?.role === 'annotator' && (
                    <TableCell>
                      {batch.status !== 'completed' && (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleStart(batch.id)}>
                          <Play className="h-3.5 w-3.5" />Start
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
          <span className="text-xs text-muted-foreground">{from} - {to} of {total} rows</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === pages || pages === 0} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setPage(1) }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Batches" subtitle="Browse and manage work assignments" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] bg-card border-border h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Task Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="agentic-ai">Agentic AI</SelectItem>
              <SelectItem value="llm-training">LLM Training</SelectItem>
              <SelectItem value="multimodal">Multimodal</SelectItem>
              <SelectItem value="evaluation">Evaluation</SelectItem>
              <SelectItem value="benchmarking">Benchmarking</SelectItem>
              <SelectItem value="preference-ranking">Preference</SelectItem>
              <SelectItem value="red-teaming">Red Teaming</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as BatchStatus | 'all'); setPage(1) }}>
            <SelectTrigger className="w-[140px] bg-card border-border h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : (
          <Tabs defaultValue="all" className="space-y-3" onValueChange={() => setPage(1)}>
            <TabsList className="bg-card border border-border h-9">
              <TabsTrigger value="all" className="text-xs">All ({filtered.length})</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Completed ({completed.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all"><TableView rows={filtered} /></TabsContent>
            <TabsContent value="completed"><TableView rows={completed} /></TabsContent>
          </Tabs>
        )}
      </main>
    </>
  )
}
