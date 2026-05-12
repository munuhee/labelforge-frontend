'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, ListTodo, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TopBar } from '@/components/top-bar'
import { PriorityBadge, TaskTypeBadge, StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Batch, BatchStatus } from '@/lib/types'

export default function BatchesPage() {
  const { user } = useAuth()
  const [batches, setBatches] = useState<Batch[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.batches.list()
      .then(setBatches)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = batches
    .filter(b => (typeFilter === 'all' || b.taskType === typeFilter) && (statusFilter === 'all' || b.status === statusFilter))
    .sort((a, b) => b.priority - a.priority)

  const completed = filtered.filter(b => b.status === 'completed')

  const handleStart = async (batchId: string) => {
    try {
      const tasks = await api.tasks.list({ batchId, status: 'unclaimed' })
      if (!tasks.length) return
      const task = tasks[Math.floor(Math.random() * tasks.length)]
      await api.tasks.action(task.id, 'claim')
      window.location.href = `/dashboard/tasks/${task.id}`
    } catch { /* noop */ }
  }

  return (
    <>
      <TopBar title="Batches" subtitle="Browse and manage work assignments" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as BatchStatus | 'all')}>
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
          <Tabs defaultValue="all" className="space-y-3">
            <TabsList className="bg-card border border-border h-9">
              <TabsTrigger value="all" className="text-xs">All ({filtered.length})</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Completed ({completed.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all"><BatchList batches={filtered} onStart={handleStart} role={user?.role} /></TabsContent>
            <TabsContent value="completed"><BatchList batches={completed} onStart={handleStart} role={user?.role} /></TabsContent>
          </Tabs>
        )}
      </main>
    </>
  )
}

function BatchList({ batches, onStart, role }: { batches: Batch[]; onStart: (id: string) => void; role?: string }) {
  if (!batches.length) return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-center py-8">
        <p className="text-muted-foreground text-sm">No batches found</p>
      </CardContent>
    </Card>
  )
  return (
    <div className="space-y-2">
      {batches.map(batch => (
        <Card key={batch.id} className="border-border bg-card hover:bg-card/80 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <PriorityBadge priority={batch.priority} className="w-8 justify-center mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/dashboard/batches/${batch.id}`} className="font-medium text-foreground hover:text-primary truncate text-[15px] leading-tight">
                    {batch.title}
                  </Link>
                  <TaskTypeBadge type={batch.taskType} className="text-[10px] px-1.5 py-0 shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground truncate">{batch.workflowName}</p>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <ListTodo className="h-3.5 w-3.5" />
                  <span>{batch.tasksTotal} tasks</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {batch.status === 'completed' && <StatusBadge status={batch.status} className="text-[10px]" />}
                {role === 'annotator' && batch.status !== 'completed' && (
                  <Button size="sm" onClick={() => onStart(batch.id)} className="gap-1.5 text-xs h-8">
                    <Play className="h-3.5 w-3.5" />Start
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
