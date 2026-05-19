'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TopBar } from '@/components/top-bar'
import { TaskTypeBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Workflow, WorkflowType, Batch } from '@/lib/types'

const PAGE_SIZE = 50

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [typeFilter, setTypeFilter] = useState<WorkflowType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    Promise.all([api.workflows.list(), api.batches.list()])
      .then(([wfs, bts]) => { setWorkflows(wfs); setBatches(bts) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = workflows.filter(w => {
    const matchType = typeFilter === 'all' || w.type === typeFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? w.isActive : !w.isActive)
    return matchType && matchStatus
  }).sort((a, b) => {
    const da = new Date(a.createdAt ?? 0).getTime()
    const db = new Date(b.createdAt ?? 0).getTime()
    return sortDir === 'desc' ? db - da : da - db
  })

  const getBatches = (wfId: string) => batches.filter(b => b.workflowId === wfId)

  const total = filtered.length
  const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
  const to = Math.min(page * PAGE_SIZE, total)
  const pages = Math.ceil(total / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <TopBar title="Work" subtitle="Browse available workflows and their batches" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v as WorkflowType | 'all'); setPage(1) }}>
            <SelectTrigger className="w-[160px] bg-card border-border h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Type" />
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
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as 'all' | 'active' | 'inactive'); setPage(1) }}>
            <SelectTrigger className="w-[140px] bg-card border-border h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[300px]">Workflow ID</TableHead>
                  <TableHead
                    className="w-[200px] cursor-pointer select-none"
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  >
                    <span className="flex items-center gap-1">
                      Created at
                      {sortDir === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Batches</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No workflows found
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map(workflow => {
                    const wfBatches = getBatches(workflow.id)
                    const totalTasks = wfBatches.reduce((s, b) => s + b.tasksTotal, 0)
                    return (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <Link href={`/dashboard/workflows/${workflow.id}`} className="text-primary hover:underline font-mono text-xs">
                            {workflow.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {workflow.createdAt ? new Date(workflow.createdAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{workflow.name}</TableCell>
                        <TableCell><TaskTypeBadge type={workflow.type as WorkflowType} className="text-[10px]" /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{wfBatches.length}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{totalTasks}</TableCell>
                        <TableCell>
                          {workflow.isActive
                            ? <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Active</Badge>
                            : <span className="text-xs text-muted-foreground">Inactive</span>}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" asChild>
                            <Link href={`/dashboard/workflows/${workflow.id}`}>
                              View <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
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
        )}
      </main>
    </>
  )
}
