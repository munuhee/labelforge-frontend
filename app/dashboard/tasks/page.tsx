'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TopBar } from '@/components/top-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Task, TaskStatus } from '@/lib/types'

const PAGE_SIZE = 50

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    const params: Record<string, string> = { mine: 'true', page: String(page), limit: String(PAGE_SIZE) }
    if (statusFilter !== 'all') params.status = statusFilter
    api.tasks.list(params)
      .then(r => { setTasks((r.tasks ?? []) as Task[]); setTotal(r.total ?? 0) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [user, page, statusFilter])

  const sorted = [...tasks].sort((a, b) => {
    const da = new Date(a.createdAt ?? 0).getTime()
    const db = new Date(b.createdAt ?? 0).getTime()
    return sortDir === 'desc' ? db - da : da - db
  })

  const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
  const to = Math.min(page * PAGE_SIZE, total)
  const pages = Math.ceil(total / PAGE_SIZE)

  const payoutBadge = (status: string) => {
    if (status === 'approved' || status === 'data-ready') {
      return (
        <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">
          Payout Submitted
        </Badge>
      )
    }
    return <span className="text-xs text-muted-foreground">Pending</span>
  }

  return (
    <>
      <TopBar title="My Tasks" subtitle="Track and manage your assigned tasks" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Select
            value={statusFilter}
            onValueChange={v => { setStatusFilter(v as TaskStatus | 'all'); setPage(1); setTasks([]) }}
          >
            <SelectTrigger className="w-[160px] bg-card border-border h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="revision-requested">Revision Needed</SelectItem>
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
                  <TableHead className="w-[300px]">Task ID</TableHead>
                  <TableHead
                    className="w-[200px] cursor-pointer select-none"
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  >
                    <span className="flex items-center gap-1">
                      Created at
                      {sortDir === 'desc'
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronUp className="h-3.5 w-3.5" />}
                    </span>
                  </TableHead>
                  <TableHead className="w-[200px]">1st submitted</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Task payouts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/tasks/${task.id}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {task.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{task.batchTitle}</TableCell>
                      <TableCell className="text-sm">Submission</TableCell>
                      <TableCell>{payoutBadge(task.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
              <span className="text-xs text-muted-foreground">
                {from} - {to} of {total} rows
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="sm" className="h-7 w-7 p-0"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-7 w-7 p-0"
                  disabled={page === pages || pages === 0}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-7 w-7 p-0"
                  onClick={() => { setStatusFilter('all'); setPage(1); setTasks([]) }}
                >
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
