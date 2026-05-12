'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, Wrench, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TopBar } from '@/components/top-bar'
import { StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import type { Task } from '@/lib/types'

export default function AnnotatorWork({ hideTitle }: { hideTitle?: boolean } = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.tasks.list({ mine: 'true' })
      .then(setTasks)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const inProgress = tasks.filter(t => ['in-progress', 'paused'].includes(t.status))
  const submitted  = tasks.filter(t => t.status === 'submitted')
  const completed  = tasks.filter(t => ['approved', 'data-ready'].includes(t.status))
  const needsRework = tasks.filter(t => t.status === 'revision-requested')

  // Auto-focus Needs Rework tab when there are outstanding rework items
  const defaultTab = needsRework.length > 0 ? 'rework' : 'in-progress'

  const TaskRow = ({ task, isRework = false }: { task: Task; isRework?: boolean }) => {
    const openTagCount = task.errorTags?.filter(t => t.status === 'open').length ?? 0
    return (
      <Card className={`border-border bg-card ${isRework ? 'border-l-2 border-l-warning' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <Link href={`/dashboard/tasks/${task.id}`}
                className="font-medium text-base text-foreground hover:text-primary truncate block">
                {task.title}
              </Link>
              <p className="text-sm text-muted-foreground truncate mt-1">{task.batchTitle}</p>
              {task.submittedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Submitted {new Date(task.submittedAt).toLocaleDateString()}
                </p>
              )}
              {/* Error tag summary */}
              {isRework && openTagCount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Tag className="h-4 w-4 text-warning" />
                  <span className="text-sm text-warning font-medium">
                    {openTagCount} open error tag{openTagCount !== 1 ? 's' : ''} from reviewer
                  </span>
                </div>
              )}
            </div>
            {task.qualityScore != null && (
              <span className="text-lg font-medium text-success shrink-0">{task.qualityScore}%</span>
            )}
            <StatusBadge status={task.status} />
            <div className="flex items-center gap-2 shrink-0">
              {task.externalUrl && (
                <Button size="icon" variant="ghost" className="h-9 w-9"
                  onClick={() => window.open(task.externalUrl, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              {isRework ? (
                <Button className="h-9 px-4 text-sm gap-2 bg-warning text-black hover:bg-warning/90" asChild>
                  <Link href={`/dashboard/tasks/${task.id}`}>
                    <Wrench className="h-4 w-4" />Fix
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="h-9 px-4 text-sm" asChild>
                  <Link href={`/dashboard/tasks/${task.id}`}>View</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const Empty = ({ label }: { label: string }) => (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-center py-12">
        <p className="text-base text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )

  return (
    <>
      {!hideTitle && <TopBar title="Work" subtitle="Your tasks and progress" />}
      <main className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : (
          <>
            {/* Rework warning banner */}
            {needsRework.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-warning">
                    {needsRework.length} task{needsRework.length !== 1 ? 's' : ''} require{needsRework.length === 1 ? 's' : ''} rework
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You cannot claim new tasks until all rework is completed.
                    {inProgress.length > 0 && ' You may finish your current in-progress task first.'}
                  </p>
                </div>
                <Badge variant="outline" className="text-warning border-warning/30 text-xs shrink-0">
                  {needsRework.length} pending
                </Badge>
              </div>
            )}

            <Tabs defaultValue={defaultTab} className="space-y-3">
              <TabsList className="bg-card border border-border h-10">
                {needsRework.length > 0 && (
                  <TabsTrigger value="rework" className="text-sm text-warning data-[state=active]:text-warning">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Needs Rework ({needsRework.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="in-progress" className="text-sm">In Progress ({inProgress.length})</TabsTrigger>
                <TabsTrigger value="submitted" className="text-sm">Submitted ({submitted.length})</TabsTrigger>
                <TabsTrigger value="completed" className="text-sm">Completed ({completed.length})</TabsTrigger>
                {needsRework.length === 0 && (
                  <TabsTrigger value="rework" className="text-sm">Needs Rework (0)</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="rework">
                <div className="space-y-3">
                  {needsRework.length
                    ? needsRework.map(t => <TaskRow key={t.id} task={t} isRework />)
                    : <Empty label="No tasks needing rework" />}
                </div>
              </TabsContent>

              <TabsContent value="in-progress">
                <div className="space-y-3">
                  {inProgress.length
                    ? inProgress.map(t => <TaskRow key={t.id} task={t} />)
                    : <Empty label="No tasks in progress" />}
                </div>
              </TabsContent>

              <TabsContent value="submitted">
                <div className="space-y-3">
                  {submitted.length
                    ? submitted.map(t => <TaskRow key={t.id} task={t} />)
                    : <Empty label="No submitted tasks" />}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-3">
                  {completed.length
                    ? completed.map(t => <TaskRow key={t.id} task={t} />)
                    : <Empty label="No completed tasks" />}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </>
  )
}
