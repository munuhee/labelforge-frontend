'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, Wrench, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FieldPageHeader } from '@/components/top-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { Task } from '@/lib/types'

const PAGE_SIZE = 50

const statusBadge = (status: string) => {
  if (status === 'approved' || status === 'data-ready')
    return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Approved</Badge>
  if (status === 'submitted')
    return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-normal text-xs rounded-full px-2.5">Submitted</Badge>
  if (status === 'in-progress')
    return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 font-normal text-xs rounded-full px-2.5">In Progress</Badge>
  if (status === 'revision-requested')
    return <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100 font-normal text-xs rounded-full px-2.5">Needs Rework</Badge>
  return <span className="text-xs text-muted-foreground capitalize">{status.replace(/-/g, ' ')}</span>
}

const TablePager = ({ rows, page, setPage }: { rows: Task[]; page: number; setPage: (p: number) => void }) => {
  const total = rows.length
  const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
  const to = Math.min(page * PAGE_SIZE, total)
  const pages = Math.ceil(total / PAGE_SIZE)
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
      <span className="text-xs text-muted-foreground">{from} - {to} of {total} rows</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === pages || pages === 0} onClick={() => setPage(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function AnnotatorWork({ hideTitle }: { hideTitle?: boolean } = {}) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reworkTasks, setReworkTasks] = useState<Task[]>([]);       const [reworkTotal, setReworkTotal] = useState(0);       const [reworkPage, setReworkPage] = useState(1)
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]); const [inProgressTotal, setInProgressTotal] = useState(0); const [inProgressPage, setInProgressPage] = useState(1)
  const [submittedTasks, setSubmittedTasks] = useState<Task[]>([]);   const [submittedTotal, setSubmittedTotal] = useState(0);   const [submittedPage, setSubmittedPage] = useState(1)
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);   const [completedTotal, setCompletedTotal] = useState(0);   const [completedPage, setCompletedPage] = useState(1)

  const fetchTab = async (status: string, page: number, setter: (t: Task[]) => void, totalSetter: (n: number) => void) => {
    const r = await api.tasks.list({ mine: 'true', status, page: String(page), limit: String(PAGE_SIZE) })
    setter((r.tasks ?? []) as Task[]); totalSetter(r.total ?? 0)
  }

  useEffect(() => {
    Promise.all([
      fetchTab('revision-requested', reworkPage, setReworkTasks, setReworkTotal),
      fetchTab('in-progress,paused', inProgressPage, setInProgressTasks, setInProgressTotal),
      fetchTab('submitted', submittedPage, setSubmittedTasks, setSubmittedTotal),
      fetchTab('approved,data-ready', completedPage, setCompletedTasks, setCompletedTotal),
    ])
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const defaultTab = reworkTotal > 0 ? 'rework' : 'in-progress'

  const TaskTable = ({
    rows, page, setPage, isRework = false,
  }: { rows: Task[]; page: number; setPage: (p: number) => void; isRework?: boolean }) => {
    const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[300px]">Task ID</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="w-[160px]">Submitted</TableHead>
              <TableHead>Status</TableHead>
              {isRework && <TableHead>Error Tags</TableHead>}
              <TableHead>Quality</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isRework ? 7 : 6} className="text-center py-12 text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              paged.map(task => {
                const openTagCount = task.errorTags?.filter(t => t.status === 'open').length ?? 0
                return (
                  <TableRow key={task.id} className={isRework ? 'border-l-2 border-l-yellow-400' : ''}>
                    <TableCell>
                      <Link href={`/dashboard/tasks/${task.id}`} className="text-primary hover:underline font-mono text-xs">
                        {task.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{task.batchTitle}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>{statusBadge(task.status)}</TableCell>
                    {isRework && (
                      <TableCell>
                        {openTagCount > 0
                          ? <span className="text-xs text-yellow-600 font-medium">{openTagCount} open</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-sm font-medium text-green-600">
                      {task.qualityScore != null ? `${task.qualityScore}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {task.externalUrl && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => window.open(task.externalUrl, '_blank', 'noopener,noreferrer')}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isRework ? (
                          <Button size="sm" className="h-7 text-xs gap-1 bg-yellow-500 text-black hover:bg-yellow-400" asChild>
                            <Link href={`/dashboard/tasks/${task.id}`}>
                              <Wrench className="h-3.5 w-3.5" />Fix
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                            <Link href={`/dashboard/tasks/${task.id}`}>View</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <TablePager rows={rows} page={page} setPage={setPage} />
      </div>
    )
  }

  return (
    <>
      {!hideTitle && <FieldPageHeader title="Work" subtitle="Your tasks and progress" />}
      <main className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : (
          <>
            {reworkTotal > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/40">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                    {reworkTotal} task{reworkTotal !== 1 ? 's' : ''} require{reworkTotal === 1 ? 's' : ''} rework
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You cannot claim new tasks until all rework is completed.
                  </p>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs shrink-0">
                  {reworkTotal} pending
                </Badge>
              </div>
            )}

            <Tabs defaultValue={defaultTab} className="space-y-3">
              <TabsList className="bg-card border border-border h-10">
                {reworkTotal > 0 && (
                  <TabsTrigger value="rework" className="text-sm text-yellow-600 data-[state=active]:text-yellow-600">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Needs Rework ({reworkTotal})
                  </TabsTrigger>
                )}
                <TabsTrigger value="in-progress" className="text-sm">In Progress ({inProgressTotal})</TabsTrigger>
                <TabsTrigger value="submitted" className="text-sm">Submitted ({submittedTotal})</TabsTrigger>
                <TabsTrigger value="completed" className="text-sm">Completed ({completedTotal})</TabsTrigger>
                {reworkTotal === 0 && (
                  <TabsTrigger value="rework" className="text-sm">Needs Rework (0)</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="rework">
                <TaskTable rows={reworkTasks} page={reworkPage} setPage={p => { setReworkPage(p); fetchTab('revision-requested', p, setReworkTasks, setReworkTotal) }} isRework />
              </TabsContent>
              <TabsContent value="in-progress">
                <TaskTable rows={inProgressTasks} page={inProgressPage} setPage={p => { setInProgressPage(p); fetchTab('in-progress,paused', p, setInProgressTasks, setInProgressTotal) }} />
              </TabsContent>
              <TabsContent value="submitted">
                <TaskTable rows={submittedTasks} page={submittedPage} setPage={p => { setSubmittedPage(p); fetchTab('submitted', p, setSubmittedTasks, setSubmittedTotal) }} />
              </TabsContent>
              <TabsContent value="completed">
                <TaskTable rows={completedTasks} page={completedPage} setPage={p => { setCompletedPage(p); fetchTab('approved,data-ready', p, setCompletedTasks, setCompletedTotal) }} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </>
  )
}
