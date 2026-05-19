'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Play, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TopBar } from '@/components/top-bar'
import { PriorityBadge, TaskTypeBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Batch, Task } from '@/lib/types'
import { isClientAdmin } from '@/lib/types'

const PAGE_SIZE = 50

interface BatchDetail extends Batch {
  instructions?: string
  tasks: Task[]
}

const statusBadge = (status: string) => {
  if (status === 'approved' || status === 'data-ready')
    return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Approved</Badge>
  if (status === 'submitted')
    return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-normal text-xs rounded-full px-2.5">Submitted</Badge>
  if (status === 'in-progress')
    return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 font-normal text-xs rounded-full px-2.5">In Progress</Badge>
  if (status === 'unclaimed')
    return <span className="text-xs text-muted-foreground">Unclaimed</span>
  return <span className="text-xs text-muted-foreground capitalize">{status.replace(/-/g, ' ')}</span>
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskPage, setTaskPage] = useState(1)

  useEffect(() => {
    api.batches.get(id)
      .then(setBatch)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return (
    <>
      <TopBar title="Loading..." />
      <main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></main>
    </>
  )
  if (error) return (
    <>
      <TopBar title="Batch" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-destructive text-sm">{error}</div>
      </main>
    </>
  )
  if (!batch) return (
    <>
      <TopBar title="Batch Not Found" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Batch not found</h2>
          <Button asChild><Link href="/dashboard/batches">Back to Batches</Link></Button>
        </div>
      </main>
    </>
  )

  const myTasks = user?.role === 'annotator'
    ? batch.tasks.filter(t => t.annotatorId === user.id)
    : batch.tasks

  const total = myTasks.length
  const from = total === 0 ? 0 : Math.min((taskPage - 1) * PAGE_SIZE + 1, total)
  const to = Math.min(taskPage * PAGE_SIZE, total)
  const pages = Math.ceil(total / PAGE_SIZE)
  const paged = myTasks.slice((taskPage - 1) * PAGE_SIZE, taskPage * PAGE_SIZE)

  return (
    <>
      <TopBar title={batch.title} subtitle={`Batch · ${batch.workflowName}`} />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href="/dashboard/batches" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />Back to Batches
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Batch Info */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <TaskTypeBadge type={batch.taskType} />
                </div>
                <CardTitle>{batch.title}</CardTitle>
                <CardDescription>{batch.description}</CardDescription>
              </CardHeader>
              {batch.instructions && (
                <CardContent>
                  <h4 className="text-sm font-medium mb-2">Instructions</h4>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 rounded-lg p-3">
                    {batch.instructions}
                  </pre>
                </CardContent>
              )}
            </Card>

            {/* Tasks Table */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Tasks ({total})</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[300px]">Task ID</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="w-[100px]">Est.</TableHead>
                      <TableHead>Status</TableHead>
                      {isClientAdmin(user?.role ?? 'annotator') && <TableHead>Annotator</TableHead>}
                      <TableHead>Quality</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No tasks available</TableCell>
                      </TableRow>
                    ) : (
                      paged.map(task => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Link href={`/dashboard/tasks/${task.id}`} className="text-primary hover:underline font-mono text-xs">
                              {task.id}
                            </Link>
                          </TableCell>
                          <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">~{task.estimatedDuration}m</TableCell>
                          <TableCell>{statusBadge(task.status)}</TableCell>
                          {isClientAdmin(user?.role ?? 'annotator') && (
                            <TableCell className="text-xs text-muted-foreground">{task.annotatorEmail || '—'}</TableCell>
                          )}
                          <TableCell className="text-sm font-medium text-green-600">
                            {task.qualityScore ? `${task.qualityScore}%` : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {task.externalUrl && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                                  <Link href={task.externalUrl} target="_blank"><ExternalLink className="h-3.5 w-3.5" /></Link>
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                                <Link href={`/dashboard/tasks/${task.id}`}>
                                  {task.status === 'in-progress' ? 'Continue' : task.status === 'unclaimed' ? <><Play className="h-3.5 w-3.5 mr-1" />Start</> : 'View'}
                                </Link>
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
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={taskPage === 1} onClick={() => setTaskPage(p => p - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={taskPage === pages || pages === 0} onClick={() => setTaskPage(p => p + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setTaskPage(1)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">Batch Stats</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Tasks</span>
                  <span className="font-medium">{batch.tasksTotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{batch.tasksCompleted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Priority</span>
                  <PriorityBadge priority={batch.priority} />
                </div>
                {batch.workloadEstimate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Workload</span>
                    <span className="font-medium">{batch.workloadEstimate}h</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
