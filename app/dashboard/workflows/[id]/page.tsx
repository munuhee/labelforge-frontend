'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, Plus, Upload, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TopBar } from '@/components/top-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Batch } from '@/lib/types'
import { isClientAdmin } from '@/lib/types'

interface WorkflowDetail {
  id: string
  name: string
  type: string
  description: string
  isActive: boolean
  batches: Batch[]
}

const TASK_TYPES = ['agentic-ai', 'llm-training', 'multimodal', 'evaluation', 'benchmarking', 'preference-ranking', 'red-teaming', 'data-collection']

const batchStatusBadge = (status: string) => {
  if (status === 'completed') return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Completed</Badge>
  if (status === 'in-progress') return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-normal text-xs rounded-full px-2.5">In Progress</Badge>
  return <span className="text-xs text-muted-foreground capitalize">{status}</span>
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showBatch, setShowBatch] = useState(false)
  const [newBatch, setNewBatch] = useState({ title: '', description: '', instructions: '', taskType: 'agentic-ai', priority: '0.8', workloadEstimate: '10', deadline: '' })
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)

  const [addTaskBatch, setAddTaskBatch] = useState<Batch | null>(null)
  const [newTask, setNewTask] = useState({ title: '', description: '', externalUrl: '', estimatedDuration: '30' })
  const [isCreatingTask, setIsCreatingTask] = useState(false)

  const [bulkBatch, setBulkBatch] = useState<Batch | null>(null)
  const [bulkText, setBulkText] = useState('')
  const [bulkFormat, setBulkFormat] = useState<'json' | 'csv'>('json')
  const [bulkMeta, setBulkMeta] = useState({ difficulty: '', languageTags: '', sla: '' })
  const [bulkError, setBulkError] = useState('')
  const [isBulkUploading, setIsBulkUploading] = useState(false)

  useEffect(() => {
    api.workflows.get(id)
      .then(setWorkflow)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id])

  const handleStartRandomTask = async (batchId: string) => {
    try {
      const tasks = await api.tasks.list({ batchId, status: 'unclaimed' })
      if (!tasks.length) { alert('No unclaimed tasks in this batch.'); return }
      const task = tasks[Math.floor(Math.random() * tasks.length)]
      await api.tasks.action(task.id, 'claim')
      window.location.href = `/dashboard/tasks/${task.id}`
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
  }

  const handleCreateBatch = async () => {
    if (!workflow) return
    setIsCreatingBatch(true)
    try {
      const created = await api.batches.create({
        workflowId: workflow.id,
        workflowName: workflow.name,
        title: newBatch.title,
        description: newBatch.description,
        instructions: newBatch.instructions,
        taskType: newBatch.taskType,
        priority: parseFloat(newBatch.priority),
        workloadEstimate: parseInt(newBatch.workloadEstimate),
        deadline: newBatch.deadline || undefined,
        status: 'available',
        tasksTotal: 0,
        tasksCompleted: 0,
      })
      setWorkflow(prev => prev ? { ...prev, batches: [...prev.batches, created] } : prev)
      setShowBatch(false)
      setNewBatch({ title: '', description: '', instructions: '', taskType: 'agentic-ai', priority: '0.8', workloadEstimate: '10', deadline: '' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsCreatingBatch(false) }
  }

  const handleAddTask = async () => {
    if (!addTaskBatch || !workflow) return
    setIsCreatingTask(true)
    try {
      await api.tasks.create({
        batchId: addTaskBatch.id,
        batchTitle: addTaskBatch.title,
        workflowId: workflow.id,
        workflowName: workflow.name,
        title: newTask.title,
        description: newTask.description,
        externalUrl: newTask.externalUrl || undefined,
        taskType: addTaskBatch.taskType,
        status: 'unclaimed',
        priority: addTaskBatch.priority,
        estimatedDuration: parseInt(newTask.estimatedDuration),
      })
      const updated = await api.workflows.get(id)
      setWorkflow(updated)
      setAddTaskBatch(null)
      setNewTask({ title: '', description: '', externalUrl: '', estimatedDuration: '30' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsCreatingTask(false) }
  }

  const parseCsv = (csv: string): Record<string, unknown>[] => {
    const lines = csv.trim().split('\n').filter(Boolean)
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
  }

  const handleBulkUpload = async () => {
    if (!bulkBatch || !workflow) return
    setBulkError('')
    let parsed: Record<string, unknown>[]
    try {
      parsed = bulkFormat === 'csv' ? parseCsv(bulkText) : JSON.parse(bulkText)
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array')
    } catch (e: unknown) {
      setBulkError(e instanceof Error ? e.message : 'Parse error')
      return
    }
    setIsBulkUploading(true)
    const meta: Record<string, unknown> = {}
    if (bulkMeta.difficulty) meta.difficulty = bulkMeta.difficulty
    if (bulkMeta.languageTags) meta.languageTags = bulkMeta.languageTags.split(',').map(t => t.trim()).filter(Boolean)
    if (bulkMeta.sla) meta.sla = new Date(bulkMeta.sla)
    try {
      for (const item of parsed) {
        await api.tasks.create({
          batchId: bulkBatch.id,
          batchTitle: bulkBatch.title,
          workflowId: workflow.id,
          workflowName: workflow.name,
          taskType: bulkBatch.taskType,
          status: 'unclaimed',
          priority: bulkBatch.priority,
          estimatedDuration: 30,
          ...meta,
          ...item,
        })
      }
      const updated = await api.workflows.get(id)
      setWorkflow(updated)
      setBulkBatch(null)
      setBulkText('')
      setBulkMeta({ difficulty: '', languageTags: '', sla: '' })
    } catch (e: unknown) { setBulkError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setIsBulkUploading(false) }
  }

  if (isLoading) return (
    <><TopBar title="Loading..." /><main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></main></>
  )
  if (error) return (
    <><TopBar title="Workflow" /><main className="flex-1 flex items-center justify-center"><div className="text-destructive text-sm">{error}</div></main></>
  )
  if (!workflow) return null

  const isAdmin = isClientAdmin(user?.role ?? 'annotator')
  const canWork = user?.role === 'annotator' || user?.role === 'reviewer'

  return (
    <>
      <TopBar title={workflow.name} subtitle={workflow.description || `${workflow.type} workflow`} />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/work" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />Back
            </Link>
          </Button>
          {isAdmin && (
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowBatch(true)}>
              <Plus className="h-3.5 w-3.5" />Add Batch
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[300px]">Batch ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflow.batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No batches yet
                    {isAdmin && (
                      <Button size="sm" className="ml-3" onClick={() => setShowBatch(true)}>
                        <Plus className="h-4 w-4 mr-1" />Create First Batch
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                workflow.batches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link href={`/dashboard/batches/${batch.id}`} className="text-primary hover:underline font-mono text-xs">
                        {batch.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{batch.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{batch.taskType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{batch.tasksTotal}</TableCell>
                    <TableCell>{batchStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddTaskBatch(batch)}>
                              <Plus className="h-3.5 w-3.5" />Task
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setBulkBatch(batch)}>
                              <Upload className="h-3.5 w-3.5" />Bulk
                            </Button>
                          </>
                        )}
                        {canWork && (
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleStartRandomTask(batch.id)}>
                            <Play className="h-3.5 w-3.5" />Start
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Create Batch Dialog */}
      <Dialog open={showBatch} onOpenChange={setShowBatch}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Batch</DialogTitle>
            <DialogDescription>Add a new batch to "{workflow.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label className="text-xs mb-1 block">Title *</Label>
              <Input value={newBatch.title} onChange={e => setNewBatch(p => ({ ...p, title: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Description</Label>
              <Textarea value={newBatch.description} onChange={e => setNewBatch(p => ({ ...p, description: e.target.value }))} className="min-h-[60px]" /></div>
            <div><Label className="text-xs mb-1 block">Instructions (shown to annotators)</Label>
              <Textarea value={newBatch.instructions} onChange={e => setNewBatch(p => ({ ...p, instructions: e.target.value }))} className="min-h-[80px]" placeholder="1. Open the URL&#10;2. Complete the task&#10;3. Submit with notes" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1 block">Task Type</Label>
                <Select value={newBatch.taskType} onValueChange={v => setNewBatch(p => ({ ...p, taskType: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs mb-1 block">Priority (0–1)</Label>
                <Input type="number" min="0" max="1" step="0.1" value={newBatch.priority} onChange={e => setNewBatch(p => ({ ...p, priority: e.target.value }))} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1 block">Est. Hours</Label>
                <Input type="number" value={newBatch.workloadEstimate} onChange={e => setNewBatch(p => ({ ...p, workloadEstimate: e.target.value }))} className="h-9" /></div>
              <div><Label className="text-xs mb-1 block">Deadline (optional)</Label>
                <Input type="date" value={newBatch.deadline} onChange={e => setNewBatch(p => ({ ...p, deadline: e.target.value }))} className="h-9" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatch(false)}>Cancel</Button>
            <Button onClick={handleCreateBatch} disabled={isCreatingBatch || !newBatch.title}>
              {isCreatingBatch ? 'Creating...' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Single Task Dialog */}
      <Dialog open={!!addTaskBatch} onOpenChange={open => { if (!open) setAddTaskBatch(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Add a single task to "{addTaskBatch?.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs mb-1 block">Title *</Label>
              <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Description / Instructions</Label>
              <Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} className="min-h-[80px]" /></div>
            <div><Label className="text-xs mb-1 block">Website URL *</Label>
              <Input type="url" placeholder="https://www.example.com" value={newTask.externalUrl} onChange={e => setNewTask(p => ({ ...p, externalUrl: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Est. Duration (minutes)</Label>
              <Input type="number" value={newTask.estimatedDuration} onChange={e => setNewTask(p => ({ ...p, estimatedDuration: e.target.value }))} className="h-9" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskBatch(null)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={isCreatingTask || !newTask.title || !newTask.externalUrl}>
              {isCreatingTask ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={!!bulkBatch} onOpenChange={open => { if (!open) { setBulkBatch(null); setBulkError(''); setBulkText(''); setBulkMeta({ difficulty: '', languageTags: '', sla: '' }) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Bulk Upload Tasks</DialogTitle>
            <DialogDescription>Upload tasks to "{bulkBatch?.title}" via JSON or CSV</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="flex gap-2">
              {(['json', 'csv'] as const).map(f => (
                <Button key={f} size="sm" variant={bulkFormat === f ? 'default' : 'outline'} className="h-7 text-xs uppercase"
                  onClick={() => { setBulkFormat(f); setBulkText(''); setBulkError('') }}>{f}</Button>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
              {bulkFormat === 'json' ? (
                <>
                  <p className="font-medium text-foreground mb-1">JSON array format:</p>
                  <code className="block whitespace-pre">{`[
  { "title": "Task title", "externalUrl": "https://...", "estimatedDuration": 30, "description": "..." },
  { "title": "Task 2", "externalUrl": "https://..." }
]`}</code>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground mb-1">CSV format (comma-separated, first row = headers):</p>
                  <code className="block">title,externalUrl,estimatedDuration,description</code>
                  <code className="block">Navigate Amazon,https://www.amazon.com,30,Search for headphones</code>
                </>
              )}
            </div>
            <Textarea
              value={bulkText}
              onChange={e => { setBulkText(e.target.value); setBulkError('') }}
              className="min-h-[160px] font-mono text-xs bg-secondary/30"
              placeholder={bulkFormat === 'json'
                ? '[{"title": "...", "externalUrl": "https://...", "estimatedDuration": 30}]'
                : 'title,externalUrl,estimatedDuration\nTask 1,https://example.com,30'}
            />
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Metadata (applied to all tasks in this upload)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Difficulty</Label>
                  <Select value={bulkMeta.difficulty || 'none'} onValueChange={v => setBulkMeta(p => ({ ...p, difficulty: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="h-9 bg-secondary/30"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Language Tags (comma-sep)</Label>
                  <Input placeholder="en, es, fr" value={bulkMeta.languageTags}
                    onChange={e => setBulkMeta(p => ({ ...p, languageTags: e.target.value }))} className="h-9 bg-secondary/30" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">SLA Deadline</Label>
                  <Input type="date" value={bulkMeta.sla}
                    onChange={e => setBulkMeta(p => ({ ...p, sla: e.target.value }))} className="h-9 bg-secondary/30" />
                </div>
              </div>
            </div>
            {bulkError && <p className="text-destructive text-xs">{bulkError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkBatch(null); setBulkError(''); setBulkText(''); setBulkMeta({ difficulty: '', languageTags: '', sla: '' }) }}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={isBulkUploading || !bulkText.trim()}>
              <Upload className="h-4 w-4 mr-2" />{isBulkUploading ? 'Uploading...' : 'Upload Tasks'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
