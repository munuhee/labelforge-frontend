'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Clock, ExternalLink, Play, Pause, Send,
  MessageSquare, Code2, ChevronDown, ParkingSquare,
  CheckCircle2, Lock, AlertTriangle, Plus, X, Check,
  RotateCcw, ShieldCheck, Tag, History, UserX,
  ArrowUpCircle, CornerUpLeft, Globe, Timer, Image, Copy,
  Target, ListChecks,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
        <button onClick={() => setOpen(!open)} className="text-xs text-muted-foreground hover:text-foreground font-mono">
          {open ? '▼' : '▶'} [{value.length}]
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
        <button onClick={() => setOpen(!open)} className="text-xs text-muted-foreground hover:text-foreground font-mono">
          {open ? '▼' : '▶'} {'{' + keys.length + '}'}
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
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)

  // Dialogs
  const [showPark, setShowPark] = useState(false)
  const [parkComment, setParkComment] = useState('')
  const [showRework, setShowRework] = useState(false)
  const [reworkComment, setReworkComment] = useState('')
  const [showSignOff, setShowSignOff] = useState(false)
  const [signOffScore, setSignOffScore] = useState(90)
  const [signOffComment, setSignOffComment] = useState('')

  // Annotator release / escalate
  const [showRelease, setShowRelease] = useState(false)
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateComment, setEscalateComment] = useState('')

  // New error tag form
  const [newTag, setNewTag] = useState<{ severity: ErrorSeverity; category: string; stepReference: string }>({ severity: 'minor', category: '', stepReference: '' })
  const [showAddTag, setShowAddTag] = useState(false)

  useEffect(() => {
    api.tasks.get(id)
      .then(t => { setTask(t); setIsRunning(t.status === 'in-progress'); setNotes(t.notes || '') })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [id])

  const handleAction = async (action: string, extras?: Record<string, unknown>) => {
    if (!task) return
    setIsSubmitting(true)
    try {
      const updated = await api.tasks.action(id, action, extras)
      setTask(updated)
      if (action === 'resume') setIsRunning(true)
      if (action === 'pause' || action === 'park') setIsRunning(false)
      if (action === 'submit') setIsRunning(false)
      if (task.externalUrl && action === 'claim') {
        window.dispatchEvent(new CustomEvent('labelforge:taskStarted', { detail: { taskId: id } }))
        window.open(task.externalUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Action failed') }
    finally { setIsSubmitting(false) }
  }

  const handlePark = async () => {
    if (!parkComment.trim()) return
    await handleAction('park', { parkComment })
    setShowPark(false); setParkComment('')
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

  const formatRelative = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const ACTION_META: Record<string, { label: string; Icon: React.ElementType; dot: string; bg: string }> = {
    'claimed':                   { label: 'Task Claimed',               Icon: Play,           dot: 'bg-success',     bg: 'bg-success/20 text-success' },
    'paused':                    { label: 'Task Paused',                Icon: Pause,          dot: 'bg-muted-foreground', bg: 'bg-muted text-muted-foreground' },
    'resumed':                   { label: 'Task Resumed',               Icon: Play,           dot: 'bg-primary',     bg: 'bg-primary/20 text-primary' },
    'parked':                    { label: 'Task Parked',                Icon: ParkingSquare,  dot: 'bg-warning',     bg: 'bg-warning/20 text-warning' },
    'submitted':                 { label: 'Submitted for Review',       Icon: Send,           dot: 'bg-primary',     bg: 'bg-primary/20 text-primary' },
    'resubmitted-after-rework':  { label: 'Resubmitted After Rework',  Icon: RotateCcw,      dot: 'bg-warning',     bg: 'bg-warning/20 text-warning' },
    'recalled':                  { label: 'Recalled for Edits',         Icon: CornerUpLeft,   dot: 'bg-warning',     bg: 'bg-warning/20 text-warning' },
    'escalated':                 { label: 'Escalated',                  Icon: ArrowUpCircle,  dot: 'bg-destructive', bg: 'bg-destructive/20 text-destructive' },
    'unenrolled':                { label: 'Unenrolled',                 Icon: UserX,          dot: 'bg-destructive', bg: 'bg-destructive/20 text-destructive' },
    'signed-off':                { label: 'Signed Off — Data Ready',   Icon: ShieldCheck,    dot: 'bg-success',     bg: 'bg-success/20 text-success' },
    'requested-rework':          { label: 'Rework Requested',           Icon: AlertTriangle,  dot: 'bg-warning',     bg: 'bg-warning/20 text-warning' },
    'added-error-tag':           { label: 'Error Tag Added',            Icon: Tag,            dot: 'bg-warning',     bg: 'bg-warning/20 text-warning' },
    'removed-error-tag':         { label: 'Error Tag Removed',          Icon: X,              dot: 'bg-muted-foreground', bg: 'bg-muted text-muted-foreground' },
    'resolved-error-tag':        { label: 'Error Tag Resolved',         Icon: Check,          dot: 'bg-success',     bg: 'bg-success/20 text-success' },
    'completed':                 { label: 'Completed',                  Icon: CheckCircle2,   dot: 'bg-success',     bg: 'bg-success/20 text-success' },
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
  const canAnnotate = isAnnotator && isMyTask && !isLocked && !isInReview && !['approved', 'rejected', 'data-ready'].includes(task.status)
  const canReview = isReviewer && isMyReview && isInReview && !isLocked
  const hasErrorTags = (task.errorTags?.length ?? 0) > 0
  const openTags = task.errorTags?.filter(t => t.status === 'open') ?? []
  const totalDeduction = openTags.reduce((s, t) => s + t.scoreDeduction, 0)
  const hasExtensionData = task.extensionData && Object.keys(task.extensionData).length > 0
  const hasScreenshots = task.screenshots && task.screenshots.length > 0

  return (
    <>
      <TopBar title={task.title} subtitle={task.batchTitle} />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">

        {/* Data-Ready Banner */}
        {isDataReady && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
            <Lock className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-success">Data Ready — Training Dataset</p>
              <p className="text-xs text-muted-foreground">This task has been signed off and is immutable. It cannot be edited or reverted.</p>
            </div>
            {task.signedOffAt && <span className="text-xs text-muted-foreground">Signed off {new Date(task.signedOffAt).toLocaleDateString()}</span>}
          </div>
        )}

        {/* In-Review notice for annotator */}
        {isAnnotator && isMyTask && isInReview && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-primary">This task is currently being reviewed. Edits are not allowed while in review.</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/work" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />Back
            </Link>
          </Button>

          {/* Quick Actions — annotator only */}
          {canAnnotate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                  Quick Actions <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isRunning ? (
                  <DropdownMenuItem onClick={() => handleAction(task.status === 'unclaimed' ? 'claim' : 'resume')} disabled={isSubmitting}>
                    <Play className="h-3.5 w-3.5 mr-2" />{task.status === 'unclaimed' ? 'Start Task' : 'Resume Task'}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleAction('pause')} disabled={isSubmitting}>
                    <Pause className="h-3.5 w-3.5 mr-2" />Pause Task
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowPark(true)}>
                  <ParkingSquare className="h-3.5 w-3.5 mr-2" />Park Task
                </DropdownMenuItem>
                {task.externalUrl && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.open(task.externalUrl!, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />Open Website
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => setShowEscalate(true)}>
                  <ArrowUpCircle className="h-3.5 w-3.5 mr-2" />Escalate Task
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => setShowRelease(true)}>
                  <UserX className="h-3.5 w-3.5 mr-2" />Release Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Reviewer controls */}
          {canReview && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs border-warning/30 text-warning hover:bg-warning/10"
                onClick={() => setShowRework(true)}>
                <RotateCcw className="h-3.5 w-3.5" />Send for Rework
              </Button>
              <Button size="sm" className="gap-1.5 h-8 text-xs bg-success hover:bg-success/90 text-white"
                onClick={() => setShowSignOff(true)}>
                <ShieldCheck className="h-3.5 w-3.5" />Sign Off
              </Button>
            </div>
          )}
        </div>

        {/* Main 3-column grid: content (2) + right panel (1) */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left: Task content ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Overview */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <TaskTypeBadge type={task.taskType} />
                  <StatusBadge status={task.status} />
                  {isLocked && <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20"><Lock className="h-2.5 w-2.5 mr-1" />Locked</Badge>}
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
                  {task.actualDuration && (
                    <div><p className="text-xs text-muted-foreground mb-1">Actual</p><p className="text-sm font-medium">{formatDuration(task.actualDuration)}</p></div>
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
            {(task.objective || (task.successCriteria && task.successCriteria.length > 0) || (task.subtasks && task.subtasks.length > 0) || task.expectedOutput) && (
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
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Subtasks</p>
                      <ul className="space-y-2">
                        {task.subtasks.map((sub) => (
                          <li key={sub.id} className="flex items-start gap-2">
                            <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border ${sub.completed ? 'bg-success border-success' : 'border-border'} flex items-center justify-center`}>
                              {sub.completed && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${sub.completed ? 'line-through text-muted-foreground' : ''}`}>{sub.title}</p>
                              {sub.description && <p className="text-xs text-muted-foreground mt-0.5">{sub.description}</p>}
                            </div>
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

            {/* External URL */}
            {task.externalUrl && (
              <Card className="border-primary/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />Task Website
                  </CardTitle>
                  <CardDescription className="text-xs font-mono truncate">{task.externalUrl}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full gap-2" onClick={() => window.open(task.externalUrl!, '_blank', 'noopener,noreferrer')}
                    disabled={isLocked && !canReview}>
                    <ExternalLink className="h-4 w-4" />Open in New Tab
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Status indicator */}
            {isRunning && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                <p className="text-sm font-medium text-primary">Task Active — Activity Being Recorded</p>
              </div>
            )}

            {/* Review Feedback */}
            {task.review && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Review Feedback</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.review.status as Parameters<typeof StatusBadge>[0]['status']} />
                    {task.review.reviewerName && <span className="text-sm text-muted-foreground">by {task.review.reviewerName}</span>}
                  </div>
                  {task.review?.criteriaScores && (
                    <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-secondary/30">
                      {(['accuracy', 'completeness', 'adherence'] as const).map(k => (
                        <div key={k} className="text-center">
                          <p className="text-2xl font-bold">{task.review?.criteriaScores?.[k]}%</p>
                          <p className="text-xs text-muted-foreground capitalize">{k}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.review.comments && (
                    <p className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">{task.review.comments}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Extension JSON Data ──────────────────────────────── */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Recorded Activity Data</CardTitle>
                    {hasExtensionData && (
                      <Badge variant="outline" className="text-[10px]">
                        {Object.keys(task.extensionData!).length} keys
                      </Badge>
                    )}
                  </div>
                  {hasExtensionData && (
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => { navigator.clipboard.writeText(JSON.stringify(task.extensionData, null, 2)) }}>
                        <Copy className="h-3.5 w-3.5" />Copy
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => setShowRawJson(!showRawJson)}>
                        {showRawJson ? 'Tree' : 'Raw JSON'}
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription className="text-xs">Structured event data captured by the LabelForge browser extension</CardDescription>
              </CardHeader>
              <CardContent>
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
            </Card>

            {/* ── Screenshots ─────────────────────────────────────── */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Screenshots</CardTitle>
                  {hasScreenshots && (
                    <Badge variant="outline" className="text-[10px]">{task.screenshots!.length}</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">Step-by-step captures taken by the LabelForge browser extension</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasScreenshots ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <Image className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {isRunning ? 'Screenshots will appear here as the extension captures them.' : 'No screenshots recorded yet.'}
                    </p>
                    {isRunning && <span className="inline-flex items-center gap-1.5 text-xs text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Live</span>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {task.screenshots!.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                        className="group block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-36 object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground">Step {i + 1}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{i + 1}/{task.screenshots!.length}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes & Submit (annotator) */}
            {canAnnotate && (
              <Card className="border-border bg-card">
                <CardHeader><CardTitle className="text-base">Notes & Submit</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea placeholder="Add notes about your work — obstacles encountered, unexpected flows, OTP screens, CAPTCHAs, or anything not captured by the extension..." value={notes}
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

            {/* ── Activity Log (full-width in main column) ───────── */}
            {(() => {
              const log = task.activityLog ?? []
              const now = new Date()
              const slaDate = task.sla ? new Date(task.sla) : null
              const startedDate = task.startedAt ? new Date(task.startedAt) : null
              const elapsedMin = startedDate ? Math.round((now.getTime() - startedDate.getTime()) / 60000) : null

              let slaStatus: 'met' | 'on-track' | 'at-risk' | 'overdue' | null = null
              if (slaDate) {
                if (isDataReady) {
                  slaStatus = task.signedOffAt && new Date(task.signedOffAt) <= slaDate ? 'met' : 'overdue'
                } else if (slaDate < now) {
                  slaStatus = 'overdue'
                } else {
                  const remaining = slaDate.getTime() - now.getTime()
                  const total = slaDate.getTime() - (startedDate?.getTime() ?? now.getTime())
                  slaStatus = remaining / total < 0.2 ? 'at-risk' : 'on-track'
                }
              }

              const slaColors: Record<string, string> = {
                'met':      'bg-success/10 border-success/30 text-success',
                'on-track': 'bg-primary/10 border-primary/30 text-primary',
                'at-risk':  'bg-warning/10 border-warning/30 text-warning',
                'overdue':  'bg-destructive/10 border-destructive/30 text-destructive',
              }
              const slaLabels: Record<string, string> = {
                'met': 'SLA Met', 'on-track': 'On Track', 'at-risk': 'At Risk', 'overdue': 'Overdue',
              }

              return (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />Activity Log
                        <span className="text-xs text-muted-foreground font-normal">({log.length} events)</span>
                      </CardTitle>
                    </div>

                    {/* SLA + Language tags summary strip */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {slaDate && slaStatus && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${slaColors[slaStatus]}`}>
                          <Timer className="h-3.5 w-3.5" />
                          <span>{slaLabels[slaStatus]}</span>
                          <span className="font-normal opacity-80">· SLA {slaDate.toLocaleDateString()}</span>
                          {elapsedMin != null && !isDataReady && (
                            <span className="font-normal opacity-70">· {formatDuration(elapsedMin)} elapsed</span>
                          )}
                        </div>
                      )}
                      {task.languageTags?.map(lt => (
                        <div key={lt} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs">
                          <Globe className="h-3 w-3" />{lt}
                        </div>
                      ))}
                      {task.difficulty && (
                        <div className="px-2 py-1 rounded-lg border border-border bg-secondary/50 text-xs text-muted-foreground capitalize">
                          {task.difficulty}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {log.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
                    ) : (
                      <div className="relative">
                        {/* Vertical timeline spine */}
                        <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

                        <div className="space-y-0">
                          {[...log].reverse().map((entry, i) => {
                            const meta = ACTION_META[entry.action] ?? {
                              label: entry.action.replace(/-/g, ' '),
                              Icon: Clock,
                              dot: 'bg-muted-foreground',
                              bg: 'bg-muted text-muted-foreground',
                            }
                            const { Icon, bg, dot, label } = meta
                            return (
                              <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
                                {/* Dot + icon */}
                                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} border-2 border-background shadow-sm`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-foreground">{label}</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0" title={new Date(entry.timestamp).toLocaleString()}>
                                      {formatRelative(entry.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    by <span className="font-medium">{entry.userEmail}</span>
                                    <span className="ml-2 opacity-60">{new Date(entry.timestamp).toLocaleString()}</span>
                                  </p>
                                  {entry.comment && (
                                    <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 py-1 text-xs text-muted-foreground italic bg-secondary/30 rounded-r-lg">
                                      {entry.comment}
                                    </blockquote>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}
          </div>

          {/* ── Right panel ─────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Error Tags Panel */}
            <Card className={`border-border bg-card ${hasErrorTags ? 'border-l-2 border-l-warning' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" />Review Tags
                    {openTags.length > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">{openTags.length} open</Badge>
                    )}
                  </CardTitle>
                  {canReview && !showAddTag && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddTag(true)}>
                      <Plus className="h-3.5 w-3.5" />Add
                    </Button>
                  )}
                </div>
                {totalDeduction > 0 && (
                  <p className="text-[10px] text-warning mt-1">Total deduction: -{totalDeduction} points</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Add tag form */}
                {showAddTag && canReview && (
                  <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-2 mb-3">
                    <div className="flex gap-2">
                      {(['major', 'minor'] as ErrorSeverity[]).map(sev => (
                        <button key={sev} type="button"
                          className={`flex-1 text-xs py-1.5 rounded border capitalize transition-colors ${
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
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category *" /></SelectTrigger>
                      <SelectContent>
                        {(newTag.severity === 'major' ? MAJOR_ERROR_CATEGORIES : MINOR_ERROR_CATEGORIES).map(c => (
                          <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Step reference (optional, e.g. Screenshot 3, Navigation step 5)" value={newTag.stepReference}
                      onChange={e => setNewTag(p => ({ ...p, stepReference: e.target.value }))} className="h-8 text-xs bg-secondary/30" />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddTag} disabled={!newTag.category || isSubmitting}>Add Tag</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => { setShowAddTag(false); setNewTag({ severity: 'minor', category: '', stepReference: '' }) }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Tag list */}
                {(task.errorTags?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No review tags yet</p>
                ) : (
                  task.errorTags!.map((tag: ErrorTag) => (
                    <div key={tag.tagId}
                      className={`p-2.5 rounded-lg border ${tag.status === 'resolved' ? 'opacity-50 bg-secondary/20 border-border' : TAG_COLORS[tag.severity]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase">{tag.severity}</span>
                            {tag.scoreDeduction > 0 && (
                              <span className="text-[10px] font-mono">-{tag.scoreDeduction}pts</span>
                            )}
                            {tag.stepReference && (
                              <span className="text-[10px] text-muted-foreground">{tag.stepReference}</span>
                            )}
                            {tag.status === 'resolved' && (
                              <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">Resolved</Badge>
                            )}
                          </div>
                          <p className="text-xs font-medium">{tag.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">by {tag.createdByEmail}</p>
                        </div>
                        {canReview && tag.status === 'open' && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleResolveTag(tag.tagId)} title="Mark resolved"
                              className="p-1 rounded hover:bg-success/20 text-success transition-colors">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleRemoveTag(tag.tagId)} title="Remove tag"
                              className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Task Info (compact, metadata only) */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Task Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  task.annotatorEmail && { label: 'Annotator',   value: task.annotatorEmail },
                  task.reviewerEmail  && { label: 'Reviewer',    value: task.reviewerEmail },
                  task.startedAt      && { label: 'Claimed',     value: new Date(task.startedAt).toLocaleString() },
                  task.submittedAt    && { label: 'Submitted',   value: new Date(task.submittedAt).toLocaleString() },
                  task.signedOffAt    && { label: 'Signed Off',  value: new Date(task.signedOffAt).toLocaleString(), color: 'text-success' },
                  task.notes          && { label: 'Notes',       value: task.notes },
                ].filter((r): r is { label: string; value: string; color?: string } => !!r).map((row, i) => (
                  <div key={i}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{row.label}</p>
                    <p className={`text-xs font-medium ${row.color ?? 'text-foreground'}`}>{row.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Park Task Dialog */}
      <Dialog open={showPark} onOpenChange={setShowPark}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ParkingSquare className="h-5 w-5 text-warning" />Park Task</DialogTitle>
            <DialogDescription>Pause this task with a reason comment (required).</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Why are you parking this task?" value={parkComment}
            onChange={e => setParkComment(e.target.value)} className="min-h-[100px] bg-secondary/30" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPark(false)}>Cancel</Button>
            <Button onClick={handlePark} disabled={!parkComment.trim() || isSubmitting}>Park Task</Button>
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

      {/* Escalate Task Dialog */}
      <Dialog open={showEscalate} onOpenChange={open => { if (!open) { setShowEscalate(false); setEscalateComment('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-destructive" />Escalate Task
            </DialogTitle>
            <DialogDescription>
              Flag this task for admin or reviewer attention — use this if you&apos;re blocked, the instructions are unclear, or an issue is preventing completion.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe what you're stuck on or what issue you encountered..."
            value={escalateComment}
            onChange={e => setEscalateComment(e.target.value)}
            className="min-h-[110px] bg-secondary/30"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEscalate(false); setEscalateComment('') }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isSubmitting || !escalateComment.trim()}
              onClick={async () => {
                await handleAction('escalate', { comment: escalateComment })
                setShowEscalate(false)
                setEscalateComment('')
              }}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Escalating...' : 'Escalate Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Task Dialog */}
      <Dialog open={showRelease} onOpenChange={setShowRelease}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />Release Task
            </DialogTitle>
            <DialogDescription>
              This returns the task to the unclaimed pool so another annotator can pick it up. Any progress you have made will be discarded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelease(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={isSubmitting}
              onClick={async () => {
                await handleAction('unenroll')
                setShowRelease(false)
                window.location.href = '/dashboard'
              }}>
              <UserX className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Releasing...' : 'Release Task'}
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
