'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, ExternalLink, CheckCircle, Play, Pause } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TopBar } from '@/components/top-bar'
import { StatusBadge, PriorityBadge, TaskTypeBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Batch, Task } from '@/lib/types'
import { isClientAdmin } from '@/lib/types'

interface BatchDetail extends Batch {
  instructions?: string
  tasks: Task[]
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
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
                  <StatusBadge status={batch.status} />
                </div>
                <CardTitle>{batch.title}</CardTitle>
                <CardDescription>{batch.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {batch.instructions && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Instructions</h4>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 rounded-lg p-3">
                      {batch.instructions}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tasks */}
            {myTasks.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No tasks available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Tasks ({myTasks.length})</h3>
                {myTasks.map(task => (
                  <Card key={task.id} className="border-border bg-card hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <PriorityBadge priority={task.priority} />
                            <h4 className="font-medium text-foreground truncate">{task.title}</h4>
                            <StatusBadge status={task.status} />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />~{task.estimatedDuration}m</span>
                            {task.qualityScore && <span className="text-success">Score: {task.qualityScore}%</span>}
                            {isClientAdmin(user?.role ?? 'annotator') && task.annotatorEmail && <span>Annotator: {task.annotatorEmail}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.externalUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={task.externalUrl} target="_blank"><ExternalLink className="h-4 w-4 mr-1" />Open</Link>
                            </Button>
                          )}
                          <Button size="sm" asChild>
                            <Link href={`/dashboard/tasks/${task.id}`}>
                              {task.status === 'in-progress' ? (
                                <><Pause className="h-4 w-4 mr-1" />Continue</>
                              ) : task.status === 'unclaimed' ? (
                                <><Play className="h-4 w-4 mr-1" />Start</>
                              ) : (
                                <><CheckCircle className="h-4 w-4 mr-1" />View</>
                              )}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
