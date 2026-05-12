'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, Layers, ListTodo, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TopBar } from '@/components/top-bar'
import { TaskTypeBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import type { Workflow, WorkflowType, Batch } from '@/lib/types'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [typeFilter, setTypeFilter] = useState<WorkflowType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }).sort((a, b) => a.name.localeCompare(b.name))

  const getBatches = (wfId: string) => batches.filter(b => b.workflowId === wfId)

  return (
    <>
      <TopBar title="Work" subtitle="Browse available workflows and their batches" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as WorkflowType | 'all')}>
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
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
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
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No workflows found</p>
                </CardContent>
              </Card>
            ) : filtered.map(workflow => {
              const wfBatches = getBatches(workflow.id)
              const activeBatches = wfBatches.filter(b => b.status === 'in-progress')
              const totalTasks = wfBatches.reduce((s, b) => s + b.tasksTotal, 0)
              return (
                <Card key={workflow.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TaskTypeBadge type={workflow.type} className="text-[10px]" />
                          {!workflow.isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inactive</span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <CardDescription className="mt-1">{workflow.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{wfBatches.length}</span>
                            <span className="text-muted-foreground">batches</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <ListTodo className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{totalTasks}</span>
                            <span className="text-muted-foreground">tasks</span>
                          </div>
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/workflows/${workflow.id}`}>
                            View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {activeBatches.length > 0 && (
                    <CardContent>
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Active Batches:</p>
                        <div className="flex flex-wrap gap-2">
                          {activeBatches.slice(0, 3).map(b => (
                            <Link key={b.id} href={`/dashboard/workflows/${workflow.id}`}
                              className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              {b.title}
                            </Link>
                          ))}
                          {activeBatches.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{activeBatches.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
