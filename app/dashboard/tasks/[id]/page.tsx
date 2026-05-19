'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock, ExternalLink, Play, Send,
  MessageSquare, Code2, ChevronDown, ChevronUp,
  CheckCircle2, Lock, AlertTriangle, Plus, X, Check,
  RotateCcw, ShieldCheck, Tag,
  Image, Copy, ChevronLeft, ChevronRight, ZoomIn,
  Target, ListChecks, ClipboardList,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TopBar } from '@/components/top-bar'
import { StatusBadge, TaskTypeBadge } from '@/components/status-badge'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Task, ErrorTag, ErrorSeverity } from '@/lib/types'
import { isReviewerOrAbove } from '@/lib/types'
import { MAJOR_ERROR_CATEGORIES, MINOR_ERROR_CATEGORIES } from '@/lib/types'

// ─── Recursive JSON tree viewer ──────────────────────────────────────────────
function JsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)

  if (value === null) return <span className="text-muted-foreground italic text-xs">null</span>
  if (typeof value === 'boolean') return <span className={`text-xs font-mono ${value ? 'text-success' : 'text-destructive'}`}>{String(value)}</span>
  if (typeof value === 'number') return <span className="text-xs font-mono text-primary">{value}</span>
  if (typeof value === 'string') {
    const isUrl = value.startsWith('http')
    return isUrl
      ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-primary underline break-all">{value}</a>
      : <span className="text-xs font-mono text-warning break-all">"{value}"</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-muted-foreground">[]</span>
    return (
      <span>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground font-mono">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} [{value.length}]
        </button>
        {open && (
          <div className="pl-4 border-l border-border ml-1 mt-0.5 space-y-0.5">
            {value.map((item, i) => (
              <div key={i} className="flex gap-1.5 items-start text-xs">
                <span className="text-muted-foreground font-mono shrink-0">{i}</span>
                <JsonValue value={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    if (keys.length === 0) return <span className="text-xs text-muted-foreground">{'{}'}</span>
    return (
      <span>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground font-mono">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} {'{' + keys.length + '}'}
        </button>
        {open && (
          <div className="pl-4 border-l border-border ml-1 mt-0.5 space-y-0.5">
            {keys.map(k => (
              <div key={k} className="flex gap-1.5 items-start text-xs flex-wrap">
                <span className="text-primary font-mono shrink-0">{k}:</span>
                <JsonValue value={(value as Record<string, unknown>)[k]} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  return <span className="text-xs font-mono text-muted-foreground">{String(value)}</span>
}

function JsonTree({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-lg bg-secondary/30 p-3 space-y-1.5 max-h-[500px] overflow-y-auto">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex gap-2 items-start text-xs">
          <span className="text-primary font-mono font-medium shrink-0 min-w-[120px]">{key}</span>
          <JsonValue value={value} />
        </div>
      ))}
    </div>
  )
}

// ─── Extension step type ─────────────────────────────────────────────────────
interface ExtStep {
  index: number
  text: string
  instructions?: string
  status: 'done' | 'issue' | 'pending'
  issueNote?: string
  completedAt?: string
}

const TAG_COLORS: Record<string, string> = {
  minor: 'bg-warning/10 text-warning border-warning/30',
  major: 'bg-destructive/10 text-destructive border-destructive/30',
}

const TAG_DEFAULTS: Record<string, number> = { minor: 5, major: 20 }

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)

  // Dialogs
  const [showSkip, setShowSkip] = useState(false)
  const [skipReason, setSkipReason] = useState('')
  const [showRework, setShowRework] = useState(false)
  const [reworkComment, setReworkComment] = useState('')
  const [showSignOff, setShowSignOff] = useState(false)
  const [signOffScore, setSignOffScore] = useState(90)
  const [signOffComment, setSignOffComment] = useState('')

  // Left sidebar collapse
  const [feedbackOpen, setFeedbackOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [taskInfoOpen, setTaskInfoOpen] = useState(false)

  // Workflow step checkboxes
  const [stepChecks, setStepChecks] = useState([true, false, false])
  const toggleStep = (i: number) => setStepChecks(p => p.map((v, j) => j === i ? !v : v))

  // New error tag form
  const [newTag, setNewTag] = useState<{ severity: ErrorSeverity; category: string; stepReference: string }>({ severity: 'minor', category: '', stepReference: '' })
  const [showAddTag, setShowAddTag] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [screenshotPage, setScreenshotPage] = useState(0)

  const copyWithFeedback = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  useEffect(() => {
    api.tasks.get(id)
      .then(async t => {
        setTask(t); setNotes(t.notes || '')
        if (t.status === 'in-progress') {
          setIsRunning(true)
        } else if (t.annotatorId === user?.id && (t.status === 'paused' || t.status === 'revision-requested')) {
          const resumed = await api.tasks.action(t.id, 'resume')
          setTask(resumed); setIsRunning(true)
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id, user?.id])

  useEffect(() => {
    if (previewIndex === null) return
    const total = task?.screenshots?.length ?? 0
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewIndex(null)
      if (e.key === 'ArrowRight') setPreviewIndex(i => i !== null ? (i + 1) % total : null)
      if (e.key === 'ArrowLeft') setPreviewIndex(i => i !== null ? (i - 1 + total) % total : null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [previewIndex, task?.screenshots?.length])

  // ── Extension postMessage bridge: handle extension submit requests ──────────
  const refreshTaskData = useCallback(async () => {
    try {
      const updated = await api.tasks.get(id) as Task | null
      if (updated) setTask(updated)
    } catch { /* noop */ }
  }, [id])

  const handleExtensionMessage = useCallback(async (event: MessageEvent) => {
    const d = event.data as Record<string, unknown>
    if (d?._lf !== 'lf:ext→page') return

    // Primary path: content script saved data directly — refresh immediately
    if (d.type === 'data_saved' && d.taskId === id) {
      await refreshTaskData()
      return
    }

    // When extension session ends, reload task to pick up submitted data
    if (d.type === 'session_update' && !d.session) {
      await refreshTaskData()
      return
    }

    // Legacy fallback: page-relay submit (content script couldn't reach API)
    if (d.type === 'submit_request' && d.taskId === id) {
      try {
        const extData = d.extensionData as Record<string, unknown>
        const shots = d.screenshots as string[]
        await api.tasks.saveExtensionData(id, extData, shots)
        window.postMessage({ _lf: 'lf:ext→page', type: 'submit_result', success: true, marker: d.marker }, '*')
        await refreshTaskData()
      } catch (e: unknown) {
        window.postMessage({ _lf: 'lf:ext→page', type: 'submit_result', success: false, message: (e as Error).message, marker: d.marker }, '*')
      }
    }
  }, [id, refreshTaskData])

  useEffect(() => {
    window.addEventListener('message', handleExtensionMessage)
    return () => window.removeEventListener('message', handleExtensionMessage)
  }, [handleExtensionMessage])

  useEffect(() => {
    if (!isRunning || !task?.attemptStartedAt) return
    const base = (task.attemptDurations ?? []).reduce((s, d) => s + d, 0)
    const tick = () => setElapsed(base + Math.floor((Date.now() - new Date(task.attemptStartedAt!).getTime()) / 60000))
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [isRunning, task?.attemptStartedAt, task?.attemptDurations])

  const handleAction = async (action: string, extras?: Record<string, unknown>) => {
    if (!task) return
    setIsSubmitting(true)
    try {
      const updated = await api.tasks.action(id, action, extras)
      setTask(updated)
      if (action === 'claim') setIsRunning(true)
      if (action === 'pause' || action === 'park') setIsRunning(false)
      if (action === 'submit') setIsRunning(false)
      if (task.externalUrl && action === 'claim') {
        const extSteps = (task.subtasks ?? []).map(sub => ({
          text: sub.title,
          instructions: sub.description ?? '',
        }))
        window.postMessage({
          _lf: 'lf:page→ext',
          type: 'start_session',
          taskDescription: task.title,
          taskId: id,
          steps: extSteps,
          externalUrl: task.externalUrl,
        }, '*')
      }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Action failed') }
    finally { setIsSubmitting(false) }
  }

  const handleRework = async () => {
    if (!reworkComment.trim()) return
    setIsSubmitting(true)
    try {
      const updated = await api.tasks.requestRework(id, reworkComment)
      setTask(updated); setShowRework(false); setReworkComment('')
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsSubmitting(false) }
  }

  const handleSignOff = async () => {
    setIsSubmitting(true)
    try {
      const updated = await api.tasks.signOff(id, signOffScore, signOffComment)
      setTask(updated); setShowSignOff(false)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsSubmitting(false) }
  }

  const handleAddTag = async () => {
    if (!newTag.category) return
    setIsSubmitting(true)
    try {
      const allCategories = [...MAJOR_ERROR_CATEGORIES, ...MINOR_ERROR_CATEGORIES]
      const tag = {
        tagId: crypto.randomUUID(),
        severity: newTag.severity,
        category: newTag.category,
        message: allCategories.find(c => c.value === newTag.category)?.label ?? newTag.category,
        stepReference: newTag.stepReference || undefined,
        scoreDeduction: TAG_DEFAULTS[newTag.severity],
        status: 'open' as const,
        createdBy: user?.id ?? '',
        createdByEmail: user?.email ?? '',
      }
      const updated = await api.tasks.addErrorTag(id, tag)
      setTask(updated); setShowAddTag(false)
      setNewTag({ severity: 'minor', category: '', stepReference: '' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsSubmitting(false) }
  }

  const handleRemoveTag = async (tagId: string) => {
    try { setTask(await api.tasks.removeErrorTag(id, tagId)) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const handleResolveTag = async (tagId: string) => {
    try { setTask(await api.tasks.resolveErrorTag(id, tagId)) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const formatDuration = (m: number) => {
    const h = Math.floor(m / 60), mins = m % 60
    return h > 0 ? `${h}h ${mins}m` : `${mins}m`
  }


  if (isLoading) return (
    <><TopBar title="Loading..." /><main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></main></>
  )
  if (error) return (
    <><TopBar title="Task" /><main className="flex-1 flex items-center justify-center"><div className="text-destructive text-sm">{error}</div></main></>
  )
  if (!task) return null

  const isAnnotator = user?.role === 'annotator' || user?.role === 'reviewer_annotator'
  const isReviewer = isReviewerOrAbove(user?.role ?? 'annotator')
  const isMyTask = task.annotatorId === user?.id
  const isMyReview = task.reviewerId === user?.id
  const isLocked = task.isLocked === true
  const isDataReady = task.status === 'data-ready'
  const isInReview = task.status === 'in-review'
  const canAnnotate = isAnnotator && isMyTask && !isLocked && !isInReview && !['approved', 'rejected', 'data-ready', 'submitted'].includes(task.status)
  const canReview = isReviewer && isMyReview && isInReview && !isLocked
  const hasErrorTags = (task.errorTags?.length ?? 0) > 0
  const openTags = task.errorTags?.filter(t => t.status === 'open') ?? []
  const totalDeduction = openTags.reduce((s, t) => s + t.scoreDeduction, 0)
  const hasExtensionData = task.extensionData && Object.keys(task.extensionData).length > 0
  const hasScreenshots = task.screenshots && task.screenshots.length > 0

  return (
    <>
      <TopBar title={task.title} copyableId={task.id} />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">

        {/* Read-only / status banner */}
        {(() => {
          if (isDataReady) return (
            <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <Lock className="h-4 w-4 text-success shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-success uppercase tracking-wide">Data Ready — Locked</p>
                <p className="text-xs text-muted-foreground">Signed off and immutable. Cannot be edited or reverted.</p>
              </div>
              {task.signedOffAt && <span className="text-xs text-muted-foreground">{new Date(task.signedOffAt).toLocaleString()}</span>}
            </div>
          )
          if (task.status === 'approved') return (
            <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-warning uppercase tracking-wide">Read-Only View</p>
                <p className="text-xs text-muted-foreground">This task has been signed off and cannot be changed.</p>
              </div>
              {task.signedOffAt && <span className="text-xs text-muted-foreground">{new Date(task.signedOffAt).toLocaleString()}</span>}
            </div>
          )
          return null
        })()}

        {(canAnnotate && !isRunning) || canReview ? (
          <div className="flex items-center justify-end gap-2 mb-4">
            {canAnnotate && !isRunning && task.status === 'unclaimed' && (
              <Button size="sm" className="gap-1.5 h-8 text-xs" disabled={isSubmitting}
                onClick={() => handleAction('claim')}>
                <Play className="h-3.5 w-3.5" />Start Task
              </Button>
            )}
            {canReview && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs border-warning/30 text-warning hover:bg-warning/10"
                  onClick={() => setShowRework(true)}>
                  <RotateCcw className="h-3.5 w-3.5" />Send for Rework
                </Button>
                <Button size="sm" className="gap-1.5 h-8 text-xs bg-success hover:bg-success/90 text-white"
                  onClick={() => setShowSignOff(true)}>
                  <ShieldCheck className="h-3.5 w-3.5" />Sign Off
                </Button>
              </>
            )}
          </div>
        ) : <div className="mb-4" />}

        {/* Main layout: left sidebar + content */}
        <div className="grid lg:grid-cols-[220px_1fr] gap-5">

          {/* ── Left sidebar: reviewer feedback & notes ───────── */}
          <div className="space-y-3 order-last lg:order-first">
            {/* Reviewer Feedback */}
            {task.review?.comments && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <button className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                  onClick={() => setFeedbackOpen(o => !o)}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">Reviewer Feedback</span>
                  </div>
                  {feedbackOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {feedbackOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {task.review.reviewerName && (
                      <p className="text-[10px] text-muted-foreground">by {task.review.reviewerName}</p>
                    )}
                    <p className="text-xs text-foreground leading-relaxed bg-primary/5 border border-primary/10 rounded p-2">
                      {task.review.comments}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rejection / Rework Notes */}
            {task.status === 'revision-requested' && (
              <div className="rounded-lg border border-warning/30 bg-card overflow-hidden">
                <button className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                  onClick={() => setNotesOpen(o => !o)}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs font-semibold text-warning">Rejection Notes</span>
                  </div>
                  {notesOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {notesOpen && task.review?.comments && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-foreground leading-relaxed bg-warning/5 border border-warning/10 rounded p-2">
                      {task.review.comments}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(!task.review?.comments && task.status !== 'revision-requested') && (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">No reviewer notes yet</p>
              </div>
            )}

            {/* Review Tags */}
            <div className={`rounded-lg border bg-card overflow-hidden ${hasErrorTags ? 'border-l-2 border-l-warning border-border' : 'border-border'}`}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">Review Tags</span>
                  {openTags.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">{openTags.length} open</Badge>
                  )}
                </div>
                {canReview && !showAddTag && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={() => setShowAddTag(true)}>
                    <Plus className="h-3 w-3" />Add
                  </Button>
                )}
              </div>
              {totalDeduction > 0 && (
                <p className="text-[10px] text-warning px-3 pb-1.5">Total deduction: -{totalDeduction} pts</p>
              )}
              <div className="px-3 pb-3 space-y-2">
                {showAddTag && canReview && (
                  <div className="p-2.5 rounded-lg border border-border bg-secondary/30 space-y-2">
                    <div className="flex gap-1.5">
                      {(['major', 'minor'] as ErrorSeverity[]).map(sev => (
                        <button key={sev} type="button"
                          className={`flex-1 text-[10px] py-1 rounded border capitalize transition-colors ${
                            newTag.severity === sev
                              ? sev === 'major' ? 'bg-destructive/15 border-destructive/40 text-destructive' : 'bg-warning/15 border-warning/40 text-warning'
                              : 'border-border text-muted-foreground hover:border-muted-foreground'
                          }`}
                          onClick={() => setNewTag(p => ({ ...p, severity: sev, category: '' }))}>
                          {sev}
                        </button>
                      ))}
                    </div>
                    <Select value={newTag.category} onValueChange={v => setNewTag(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select category *" /></SelectTrigger>
                      <SelectContent>
                        {(newTag.severity === 'major' ? MAJOR_ERROR_CATEGORIES : MINOR_ERROR_CATEGORIES).map(c => (
                          <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Step ref (optional)" value={newTag.stepReference}
                      onChange={e => setNewTag(p => ({ ...p, stepReference: e.target.value }))} className="h-7 text-[10px] bg-secondary/30" />
                    <div className="flex gap-1">
                      <Button size="sm" className="flex-1 h-6 text-[10px]" onClick={handleAddTag} disabled={!newTag.category || isSubmitting}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                        onClick={() => { setShowAddTag(false); setNewTag({ severity: 'minor', category: '', stepReference: '' }) }}>Cancel</Button>
                    </div>
                  </div>
                )}
                {(task.errorTags?.length ?? 0) === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No tags yet</p>
                ) : (
                  task.errorTags!.map((tag: ErrorTag) => (
                    <div key={tag.tagId}
                      className={`p-2 rounded-lg border ${tag.status === 'resolved' ? 'opacity-50 bg-secondary/20 border-border' : TAG_COLORS[tag.severity]}`}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase">{tag.severity}</span>
                            {tag.scoreDeduction > 0 && <span className="text-[10px] font-mono">-{tag.scoreDeduction}pts</span>}
                            {tag.status === 'resolved' && <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">Resolved</Badge>}
                          </div>
                          <p className="text-[10px] font-medium leading-snug">{tag.message}</p>
                          {tag.stepReference && <p className="text-[10px] text-muted-foreground">{tag.stepReference}</p>}
                        </div>
                        {canReview && tag.status === 'open' && (
                          <div className="flex gap-0.5 shrink-0">
                            <button onClick={() => handleResolveTag(tag.tagId)} className="p-0.5 rounded hover:bg-success/20 text-success"><Check className="h-3 w-3" /></button>
                            <button onClick={() => handleRemoveTag(tag.tagId)} className="p-0.5 rounded hover:bg-destructive/20 text-destructive"><X className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Task Info — collapsible dropdown */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <button className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                onClick={() => setTaskInfoOpen(o => !o)}>
                <span className="text-xs font-semibold">Task Info</span>
                {taskInfoOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {taskInfoOpen && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-2.5">
                  {[
                    task.annotatorEmail              && { label: 'Annotator',      value: task.annotatorEmail },
                    task.reviewerEmail               && { label: 'Reviewer',       value: task.reviewerEmail },
                    task.startedAt                   && { label: 'Claimed',        value: new Date(task.startedAt).toLocaleString() },
                    task.submittedAt                 && { label: 'Submitted',      value: new Date(task.submittedAt).toLocaleString() },
                    task.review?.reviewStartedAt     && { label: 'Review Started', value: new Date(task.review.reviewStartedAt).toLocaleString(), color: 'text-primary' },
                    task.review?.reviewedAt          && { label: 'Review Decided', value: new Date(task.review.reviewedAt).toLocaleString() },
                    task.signedOffAt                 && { label: 'Signed Off',     value: new Date(task.signedOffAt).toLocaleString(), color: 'text-success' },
                    task.notes                       && { label: 'Notes',          value: task.notes },
                  ].filter((r): r is { label: string; value: string; color?: string } => !!r).map((row, i) => (
                    <div key={i}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{row.label}</p>
                      <p className={`text-xs font-medium break-all ${row.color ?? 'text-foreground'}`}>{row.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Center: Task content ─────────────────────────────── */}
          <div className="space-y-6">

            {/* Overview */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <TaskTypeBadge type={task.taskType} />
                    <StatusBadge status={task.status} />
                    {isLocked && <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20"><Lock className="h-2.5 w-2.5 mr-1" />Locked</Badge>}
                  </div>
                  {canAnnotate && (
                    <Button variant="outline" size="sm" className="h-8 text-xs text-muted-foreground shrink-0" onClick={() => setShowSkip(true)}>
                      Skip
                    </Button>
                  )}
                </div>
                <CardTitle className="text-xl">{task.title}</CardTitle>
                <CardDescription>
                  <Link href={`/dashboard/workflows/${task.workflowId}`} className="text-primary hover:underline text-sm">{task.workflowName}</Link>
                  <span className="text-muted-foreground/50 mx-2">›</span>
                  <Link href={`/dashboard/batches/${task.batchId}`} className="text-primary hover:underline text-sm">{task.batchTitle}</Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
                <Separator className="mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Est. Time</p>
                    <p className="text-sm font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(task.estimatedDuration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Annotator Time</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {task.actualDuration
                        ? formatDuration(task.actualDuration)
                        : isRunning
                        ? <span className="text-primary">{formatDuration(elapsed)}</span>
                        : (() => {
                            const durations = task.attemptDurations ?? []
                            if (durations.length > 0) return formatDuration(durations.reduce((s, d) => s + d, 0))
                            if (task.startedAt && task.submittedAt)
                              return formatDuration(Math.floor((new Date(task.submittedAt).getTime() - new Date(task.startedAt).getTime()) / 60000))
                            return '—'
                          })()}
                    </p>
                  </div>
                  {task.review?.reviewedAt && (task.review.reviewStartedAt ?? task.submittedAt) && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Review Time</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {formatDuration(Math.floor((new Date(task.review.reviewedAt).getTime() - new Date((task.review.reviewStartedAt ?? task.submittedAt)!).getTime()) / 60000))}
                      </p>
                    </div>
                  )}
                  {task.qualityScore != null && (
                    <div><p className="text-xs text-muted-foreground mb-1">Quality</p><p className="text-sm font-medium text-success">{task.qualityScore}%</p></div>
                  )}
                  {task.startedAt && (
                    <div><p className="text-xs text-muted-foreground mb-1">Started</p><p className="text-sm font-medium">{new Date(task.startedAt).toLocaleDateString()}</p></div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Objective & Success Criteria */}
            {(task.objective || (task.successCriteria && task.successCriteria.length > 0) || task.expectedOutput) && (
              <Card className="border-primary/30 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Objective & Success Criteria</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Read this before starting — it defines what a completed task looks like.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {task.objective && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Objective</p>
                      <p className="text-sm leading-relaxed">{task.objective}</p>
                    </div>
                  )}
                  {task.successCriteria && task.successCriteria.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ListChecks className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Success Criteria</p>
                      </div>
                      <ul className="space-y-1.5">
                        {task.successCriteria.map((criterion, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                            <span>{criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {task.expectedOutput && Object.keys(task.expectedOutput).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Expected Output</p>
                      <JsonTree data={task.expectedOutput} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* External URL — Task Details with workflow steps */}
            {task.externalUrl && (
              <Card className="border-primary/30 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />Task Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Structured details table */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    {([
                      { label: 'Website', value: task.externalUrl },
                      { label: 'Domain', value: (() => { try { return new URL(task.externalUrl!).hostname.replace(/^www\./, '') } catch { return '—' } })() },
                      { label: 'Task Name', value: task.id },
                      task.description ? { label: 'Instruction', value: task.description } : null,
                    ] as ({ label: string; value: string } | null)[])
                      .filter((r): r is { label: string; value: string } => r !== null)
                      .map((row, i) => (
                        <div key={i} className={`flex gap-3 px-3 py-2.5 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                          <span className="font-medium text-xs text-muted-foreground whitespace-nowrap w-[80px] shrink-0 pt-px">{row.label}</span>
                          <span className="text-xs break-all leading-relaxed">
                            {row.value}
                            {row.label === 'Website' && (
                              <button onClick={() => copyWithFeedback(row.value, 'url')}
                                className="inline-flex items-center ml-1.5 align-middle text-muted-foreground hover:text-foreground transition-colors">
                                {copiedKey === 'url' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                              </button>
                            )}
                          </span>
                        </div>
                      ))
                    }
                  </div>

                  {/* Numbered steps */}
                  <div className="space-y-3">
                    {([
                      {
                        num: 1,
                        text: 'You will be completing a web browsing task specified in the instruction above.',
                      },
                      {
                        num: 2,
                        text: 'If you have installed the LabelForge browser extension, proceed to the next step. Otherwise install and enable it first.',
                      },
                      {
                        num: 3,
                        text: 'Click the Start Session button below to open the website in a new window and begin recording.',
                      },
                    ] as { num: number; text: string }[]).map((step, i) => {
                      const checked = stepChecks[i]
                      return (
                        <div key={step.num} className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleStep(i)}
                            className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                              checked ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'
                            }`}>
                            {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </button>
                          <p className={`text-xs leading-relaxed ${checked ? 'text-muted-foreground' : 'text-foreground'}`}>
                            <span className="font-semibold">Step {step.num}:</span> {step.text}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Start Session CTA */}
                  {(canAnnotate || canReview) && !isLocked ? (
                    <Button
                      className="gap-2"
                      disabled={isSubmitting || (!stepChecks[0] || !stepChecks[1])}
                      title={(!stepChecks[0] || !stepChecks[1]) ? 'Complete steps 1 and 2 first' : undefined}
                      onClick={() => {
                        if (!stepChecks[2]) setStepChecks(p => [p[0], p[1], true])
                        if (isRunning) {
                          const extSteps = (task.subtasks ?? []).map(sub => ({
                            text: sub.title,
                            instructions: sub.description ?? '',
                          }))
                          window.postMessage({
                            _lf: 'lf:page→ext',
                            type: 'start_session',
                            taskDescription: task.title,
                            taskId: id,
                            steps: extSteps,
                            externalUrl: task.externalUrl,
                          }, '*')
                        } else {
                          handleAction('claim')
                        }
                      }}>
                      <ExternalLink className="h-4 w-4" />Start Session
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-2"
                      onClick={() => window.open(task.externalUrl!, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="h-4 w-4" />Open Website
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}


            {/* ── Recorded Activity Data + Screenshots (side by side) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

              {/* Extension JSON Data */}
              {(() => {
                const extEvents = (task.extensionData as Record<string, unknown> | undefined)?.events as Record<string, unknown>[] | undefined
                const hasExtEvents = extEvents && extEvents.length > 0
                return (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Recorded Activity Data</CardTitle>
                        {hasExtensionData && (
                          <Badge variant="outline" className="text-[10px]">
                            {Object.keys(task.extensionData!).length} keys
                          </Badge>
                        )}
                        {hasExtEvents && (
                          <Badge variant="outline" className="text-[10px]">{extEvents!.length} events</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                          onClick={refreshTaskData} title="Reload data from server">
                          <RotateCcw className="h-3.5 w-3.5" />Refresh
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-xs">Structured event data captured by the LabelForge browser extension</CardDescription>
                  </CardHeader>
                  <Tabs defaultValue={hasExtEvents ? 'events' : 'structured'} className="w-full">
                    <div className="flex items-center justify-between px-6 pt-3 pb-0">
                      <TabsList className="h-8">
                        <TabsTrigger value="events" className="text-xs h-7 gap-1">
                          <ListChecks className="h-3.5 w-3.5" />Captured Events
                        </TabsTrigger>
                        <TabsTrigger value="structured" className="text-xs h-7 gap-1">
                          <Code2 className="h-3.5 w-3.5" />Structured Data
                        </TabsTrigger>
                      </TabsList>
                      {hasExtEvents && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => copyWithFeedback(JSON.stringify(extEvents, null, 2), 'events')}>
                          {copiedKey === 'events' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === 'events' ? 'Copied!' : 'Copy events'}
                        </Button>
                      )}
                    </div>
                    <TabsContent value="events" className="mt-0">
                      <CardContent className="pt-4">
                        {!hasExtEvents ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                            <ListChecks className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No captured events yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {extEvents!.map((evt, i) => {
                              const eventType = evt.event_type as string | undefined
                              const prefix = eventType?.split('.')[0] ?? 'unknown'
                              const badgeColors: Record<string, string> = {
                                interaction: 'bg-blue-500',
                                action:      'bg-amber-500',
                                observation: 'bg-emerald-500',
                                state:       'bg-purple-500',
                                artifact:    'bg-pink-500',
                              }
                              const badgeColor = badgeColors[prefix] ?? 'bg-muted'
                              return (
                                <details key={i} className="group rounded-lg border border-border bg-secondary/30 overflow-hidden">
                                  <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none select-none hover:bg-secondary/60 transition-colors">
                                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-wide ${badgeColor}`}>
                                      {eventType?.split('.').pop()?.toUpperCase() ?? '?'}
                                    </span>
                                    <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{eventType}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">#{i + 1}</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
                                  </summary>
                                  <pre className="text-[11px] font-mono leading-relaxed bg-black/30 text-muted-foreground px-4 py-3 overflow-x-auto whitespace-pre-wrap break-words border-t border-border">
                                    {JSON.stringify(evt, null, 2)}
                                  </pre>
                                </details>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </TabsContent>
                    <TabsContent value="structured" className="mt-0">
                      <CardContent className="pt-4">
                        {hasExtensionData && (
                          <div className="flex items-center justify-end gap-1.5 mb-3">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => copyWithFeedback(JSON.stringify(task.extensionData, null, 2), 'ext')}>
                              {copiedKey === 'ext' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                              {copiedKey === 'ext' ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => setShowRawJson(!showRawJson)}>
                              {showRawJson ? 'Tree' : 'Raw JSON'}
                            </Button>
                          </div>
                        )}
                        {!hasExtensionData ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                            <Code2 className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                              {isRunning ? 'Recording in progress — data will appear here as the extension captures events.' : 'No activity data recorded yet.'}
                            </p>
                            {isRunning && <span className="inline-flex items-center gap-1.5 text-xs text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Live</span>}
                          </div>
                        ) : showRawJson ? (
                          <pre className="text-xs bg-secondary/50 rounded-lg p-4 overflow-x-auto max-h-[500px] overflow-y-auto font-mono leading-relaxed">
                            {JSON.stringify(task.extensionData, null, 2)}
                          </pre>
                        ) : (
                          <JsonTree data={task.extensionData as Record<string, unknown>} />
                        )}
                      </CardContent>
                    </TabsContent>
                  </Tabs>
                </Card>
                )
              })()}

              {/* Screenshots + Steps integrated */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Screenshots</CardTitle>
                    {hasScreenshots && (
                      <Badge variant="outline" className="text-[10px]">{task.screenshots!.length}</Badge>
                    )}
                    {(() => {
                      const extSteps = (task.extensionData as Record<string, unknown> | undefined)?.steps as ExtStep[] | undefined
                      if (!extSteps || extSteps.length === 0) return null
                      const done = extSteps.filter(s => s.status === 'done').length
                      const issues = extSteps.filter(s => s.status === 'issue').length
                      return <>
                        <Badge variant="outline" className="text-[10px]">{done}/{extSteps.length} steps</Badge>
                        {issues > 0 && <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">{issues} issue{issues !== 1 ? 's' : ''}</Badge>}
                      </>
                    })()}
                  </div>
                  <CardDescription className="text-xs">Step-by-step captures taken by the LabelForge browser extension</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const extSteps = (task.extensionData as Record<string, unknown> | undefined)?.steps as ExtStep[] | undefined
                    const shots = task.screenshots ?? []
                    const hasSteps = extSteps && extSteps.length > 0

                    // ── Step-grouped view ──
                    if (hasSteps) {
                      const extData = task.extensionData as Record<string, unknown>
                      // screenshot_timestamps: [{idx, timestamp}] — index maps to task.screenshots[]
                      const stt = extData?.screenshot_timestamps as { idx: number; timestamp: string }[] | undefined
                      const sessionStart = (extData?.started_at as string) ?? new Date(0).toISOString()

                      // Build per-step screenshot arrays using timestamps
                      const getStepShots = (stepIndex: number): { src: string; globalIdx: number }[] => {
                        const prevCompletedAt = stepIndex === 0 ? sessionStart : (extSteps![stepIndex - 1].completedAt ?? sessionStart)
                        const thisCompletedAt = extSteps![stepIndex].completedAt
                        const prevTs = new Date(prevCompletedAt).getTime()
                        const thisTs = thisCompletedAt ? new Date(thisCompletedAt).getTime() : Infinity

                        if (stt && stt.length > 0) {
                          return stt
                            .filter(s => { const t = new Date(s.timestamp).getTime(); return t >= prevTs && t < thisTs })
                            .map(s => ({ src: shots[s.idx] ?? '', globalIdx: s.idx }))
                            .filter(s => s.src)
                        }
                        // Fallback: evenly distribute if no timestamp data
                        const perStep = Math.max(1, Math.ceil(shots.length / extSteps!.length))
                        return shots.slice(stepIndex * perStep, (stepIndex + 1) * perStep)
                          .map((src, si) => ({ src, globalIdx: stepIndex * perStep + si }))
                      }


                      return (
                        <div className="space-y-3">
                          {extSteps!.map((step, i) => {
                            const stepShots = getStepShots(i)
                            return (
                              <div key={i} className={`rounded-lg border overflow-hidden ${
                                step.status === 'done' ? 'border-success/30 bg-success/5'
                                : step.status === 'issue' ? 'border-warning/30 bg-warning/5'
                                : 'border-border'
                              }`}>
                                {/* Step header */}
                                <div className="flex items-start gap-2 px-3 py-2">
                                  <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    step.status === 'done' ? 'bg-success text-white'
                                    : step.status === 'issue' ? 'bg-warning text-black'
                                    : 'bg-secondary text-muted-foreground'
                                  }`}>{i + 1}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold">{step.text}</span>
                                      {step.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                                      {step.status === 'issue' && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                                    </div>
                                    {step.completedAt && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(step.completedAt).toLocaleString()}</p>}
                                  </div>
                                </div>
                                {/* Issue note */}
                                {step.status === 'issue' && step.issueNote && (
                                  <div className="mx-3 mb-2 rounded bg-warning/10 border border-warning/20 px-2.5 py-1.5">
                                    <p className="text-[10px] font-semibold text-warning uppercase tracking-wide mb-0.5">Note</p>
                                    <p className="text-xs leading-relaxed">{step.issueNote}</p>
                                  </div>
                                )}
                                {/* Screenshots for this step */}
                                {stepShots.length > 0 && (
                                  <div className={`grid gap-2 px-3 pb-3 ${stepShots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {stepShots.map(({ src, globalIdx }, si) => (
                                        <button key={si} onClick={() => setPreviewIndex(globalIdx)}
                                          className="group block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors relative w-full">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={src} alt={`Step ${i + 1} screenshot ${si + 1}`} className="w-full h-28 object-cover" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </button>
                                      ))}
                                  </div>
                                )}
                                {stepShots.length === 0 && (
                                  <p className="px-3 pb-2.5 text-[10px] text-muted-foreground italic">No screenshot for this step</p>
                                )}
                              </div>
                            )
                          })}
                          {(task.extensionData as Record<string, unknown> | undefined)?.final_notes && (
                            <div className="rounded-lg border border-border p-3 bg-secondary/20">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Final Notes</p>
                              <p className="text-xs leading-relaxed">{String((task.extensionData as Record<string, unknown>).final_notes)}</p>
                            </div>
                          )}
                        </div>
                      )
                    }

                    // ── Flat grid view (no step data) ──
                    if (!hasScreenshots) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                          <Image className="h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">
                            {isRunning ? 'Screenshots will appear here as the extension captures them.' : 'No screenshots recorded yet.'}
                          </p>
                          {isRunning && <span className="inline-flex items-center gap-1.5 text-xs text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Live</span>}
                        </div>
                      )
                    }

                    const PAGE_SIZE = 10
                    const totalPages = Math.ceil(shots.length / PAGE_SIZE)
                    const pageShots = shots.slice(screenshotPage * PAGE_SIZE, (screenshotPage + 1) * PAGE_SIZE)
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {pageShots.map((src, pi) => {
                            const i = screenshotPage * PAGE_SIZE + pi
                            return (
                              <button key={i} onClick={() => setPreviewIndex(i)}
                                className="group block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors relative text-left w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-32 object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                </div>
                                <div className="px-2 py-1.5 flex items-center justify-between">
                                  <p className="text-[10px] text-muted-foreground">Shot {i + 1}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{i + 1}/{shots.length}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-1">
                            <button onClick={() => setScreenshotPage(p => Math.max(0, p - 1))} disabled={screenshotPage === 0}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                              <ChevronLeft className="h-3.5 w-3.5" />Prev
                            </button>
                            <span className="text-[10px] text-muted-foreground font-mono">{screenshotPage + 1} / {totalPages}</span>
                            <button onClick={() => setScreenshotPage(p => Math.min(totalPages - 1, p + 1))} disabled={screenshotPage === totalPages - 1}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                              Next<ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

            </div>


            {/* Notes & Submit (annotator) */}
            {canAnnotate && (
              <Card className="border-border bg-card">
                <CardHeader>
                  {task.externalUrl ? (
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${
                        ['submitted', 'in-review', 'approved', 'data-ready'].includes(task.status)
                          ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {['submitted', 'in-review', 'approved', 'data-ready'].includes(task.status) && (
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">Step 4</p>
                        <CardTitle className="text-base">Send a final answer to finish the task</CardTitle>
                      </div>
                    </div>
                  ) : (
                    <CardTitle className="text-base">Notes & Submit</CardTitle>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea placeholder="Add notes about your work..." value={notes}
                    onChange={e => setNotes(e.target.value)} className="min-h-[100px] bg-secondary/30" />
                  <div className="flex justify-end">
                    <Button className="gap-2" onClick={() => handleAction('submit', { notes })}
                      disabled={isSubmitting || task.status === 'submitted'}>
                      <Send className="h-4 w-4" />
                      {task.status === 'submitted' ? 'Already Submitted' : 'Submit for Review'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </main>

      {/* Screenshot Preview Modal */}
      {previewIndex !== null && task?.screenshots && task.screenshots.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="relative flex flex-col items-center gap-3 max-w-5xl w-full px-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute -top-10 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Image */}
            <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.screenshots[previewIndex]}
                alt={`Screenshot ${previewIndex + 1}`}
                className="w-full max-h-[75vh] object-contain"
              />
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPreviewIndex(i => i !== null && i > 0 ? i - 1 : task.screenshots!.length - 1)}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Page dots / counter */}
              <div className="flex items-center gap-1.5">
                {task.screenshots.length <= 10 ? (
                  task.screenshots.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewIndex(i)}
                      className={`rounded-full transition-all ${i === previewIndex ? 'h-2.5 w-2.5 bg-white' : 'h-2 w-2 bg-white/30 hover:bg-white/50'}`}
                    />
                  ))
                ) : (
                  <span className="text-sm text-white/80 font-mono tabular-nums">
                    {previewIndex + 1} / {task.screenshots.length}
                  </span>
                )}
              </div>

              <button
                onClick={() => setPreviewIndex(i => i !== null && i < task.screenshots!.length - 1 ? i + 1 : 0)}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Caption + open-in-tab link */}
            <div className="flex items-center gap-3 text-white/60 text-xs">
              <span>Step {previewIndex + 1}</span>
              <a
                href={task.screenshots[previewIndex]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-white transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Open full size
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Skip Task Dialog */}
      <Dialog open={showSkip} onOpenChange={open => { if (!open) { setShowSkip(false); setSkipReason('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Skip Task</DialogTitle>
            <DialogDescription>Let us know why you&apos;re skipping this task. You can go back to the dashboard or jump straight to the next available task.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for skipping (e.g. unclear instructions, technical issue, wrong language)..."
            value={skipReason}
            onChange={e => setSkipReason(e.target.value)}
            className="min-h-[100px] bg-secondary/30"
            autoFocus
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" disabled={!skipReason.trim() || isSubmitting}
              onClick={async () => {
                setIsSubmitting(true)
                try { await api.tasks.action(id, 'unenroll', { comment: skipReason }) } catch { /* noop */ }
                window.location.href = '/dashboard'
              }}>
              Back to Dashboard
            </Button>
            <Button className="flex-1" disabled={!skipReason.trim() || isSubmitting}
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  await api.tasks.action(id, 'unenroll', { comment: skipReason })
                  const { tasks } = await api.tasks.list({ batchId: task!.batchId, status: 'unclaimed' })
                  if (tasks.length) {
                    const next = tasks[Math.floor(Math.random() * tasks.length)] as { id: string }
                    await api.tasks.action(next.id, 'claim')
                    window.location.href = `/dashboard/tasks/${next.id}`
                    return
                  }
                } catch { /* noop */ }
                window.location.href = '/dashboard/work'
              }}>
              Start Next Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send for Rework Dialog */}
      <Dialog open={showRework} onOpenChange={setShowRework}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-warning" />Send for Rework</DialogTitle>
            <DialogDescription>
              This will push the task back to the annotator. They cannot claim new tasks until this is resolved.
              {openTags.length > 0 && <span className="block mt-1 text-warning">{openTags.length} open error tag(s) will be visible to the annotator.</span>}
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Describe what needs to be fixed (required)..." value={reworkComment}
            onChange={e => setReworkComment(e.target.value)} className="min-h-[120px] bg-secondary/30" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRework(false)}>Cancel</Button>
            <Button onClick={handleRework} disabled={!reworkComment.trim() || isSubmitting}
              className="bg-warning text-black hover:bg-warning/90">
              <RotateCcw className="h-4 w-4 mr-2" />{isSubmitting ? 'Sending...' : 'Send for Rework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Off Dialog */}
      <Dialog open={showSignOff} onOpenChange={setShowSignOff}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" />Sign Off Task</DialogTitle>
            <DialogDescription>
              This marks the task as Data Ready and permanently locks it. It will be added to the training dataset and cannot be reverted.
              {openTags.length > 0 && <span className="block mt-1 text-warning">{openTags.length} open error tag(s) will be auto-resolved.</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-2 block">Quality Score ({signOffScore}%)</Label>
              <input type="range" min={0} max={100} value={signOffScore}
                onChange={e => setSignOffScore(Number(e.target.value))} className="w-full accent-success" />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Final Comments (optional)</Label>
              <Textarea placeholder="Any final notes..." value={signOffComment}
                onChange={e => setSignOffComment(e.target.value)} className="min-h-[80px] bg-secondary/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOff(false)}>Cancel</Button>
            <Button onClick={handleSignOff} disabled={isSubmitting} className="bg-success hover:bg-success/90 text-white">
              <ShieldCheck className="h-4 w-4 mr-2" />{isSubmitting ? 'Signing Off...' : 'Sign Off — Data Ready'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
