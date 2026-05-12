'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, ExternalLink, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TopBar } from '@/components/top-bar'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Task, TaskStatus } from '@/lib/types'

const PAGE_SIZE = 15

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    api.tasks.list({ mine: 'true' })
      .then(setTasks)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [user])

  const filtered = tasks.filter(t => statusFilter === 'all' || t.status === statusFilter)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <TopBar title="My Tasks" subtitle="Track and manage your assigned tasks" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as TaskStatus | 'all'); setPage(1) }}>
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
          <span className="text-sm text-muted-foreground">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No tasks found</p>
              <Button asChild><Link href="/dashboard/workflows">Browse Workflows</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {paginated.map(task => (
              <Card key={task.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <PriorityBadge priority={task.priority} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link href={`/dashboard/tasks/${task.id}`} className="font-medium text-sm text-foreground hover:text-primary truncate">
                          {task.title}
                        </Link>
                        <StatusBadge status={task.status} className="text-[10px] shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{task.batchTitle}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.estimatedDuration}m est.
                        </span>
                        {task.qualityScore && <span className="text-success">Score: {task.qualityScore}%</span>}
                        {task.submittedAt && <span>Submitted {new Date(task.submittedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.externalUrl && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <Link href={task.externalUrl} target="_blank"><ExternalLink className="h-3.5 w-3.5 mr-1" />Open</Link>
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/dashboard/tasks/${task.id}`}>
                          {task.status === 'in-progress' ? 'Continue' : task.status === 'revision-requested' ? 'Revise' : 'View'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <PaginationBar page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        )}
      </main>
    </>
  )
}
