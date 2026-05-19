'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertCircle, ArrowUpCircle, Pencil, Plus, Tag, ChevronLeft, ChevronRight, X, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { TopBar } from '@/components/top-bar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Review, ErrorSeverity, Task, TaskSubtask } from '@/lib/types'
import { MAJOR_ERROR_CATEGORIES, MINOR_ERROR_CATEGORIES, isReviewerOrAbove } from '@/lib/types'

type ReviewStatus = 'pending' | 'in-review' | 'approved' | 'rejected' | 'revision-requested' | 'escalated' | 'on-hold' | 'flagged'
type ReviewDecision = 'approve' | 'reject' | 'request-rework' | 'escalate' | 'hold' | 'flag'

const PAGE_SIZE = 50

const statusBadge = (status: string) => {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 font-normal text-xs rounded-full px-2.5">Approved</Badge>
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100 font-normal text-xs rounded-full px-2.5">Rejected</Badge>
  if (status === 'revision-requested') return <Badge className="bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-100 font-normal text-xs rounded-full px-2.5">Revision Needed</Badge>
  if (status === 'in-review') return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100 font-normal text-xs rounded-full px-2.5">In Review</Badge>
  if (status === 'escalated') return <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100 font-normal text-xs rounded-full px-2.5">Escalated</Badge>
  if (status === 'on-hold') return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-100 font-normal text-xs rounded-full px-2.5">On Hold</Badge>
  if (status === 'flagged') return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 font-normal text-xs rounded-full px-2.5">Flagged</Badge>
  return <span className="text-xs text-muted-foreground">Pending</span>
}

export default function ReviewsPage() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [decideReview, setDecideReview] = useState<Review | null>(null)
  const [decision, setDecision] = useState<ReviewDecision>('approve')
  const [comments, setComments] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [qualityScore, setQualityScore] = useState<number>(85)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [atTaskLimit, setAtTaskLimit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorTags, setErrorTags] = useState<Array<{ severity: ErrorSeverity; category: string; stepReference?: string }>>([])
  const [showTagForm, setShowTagForm] = useState(false)
  const [tagSeverity, setTagSeverity] = useState<ErrorSeverity>('major')
  const [tagCategory, setTagCategory] = useState('')
  const [tagStep, setTagStep] = useState('')
  const [escalateReview, setEscalateReview] = useState<Review | null>(null)
  const [escalateComment, setEscalateComment] = useState('')
  const [taskSubtasks, setTaskSubtasks] = useState<TaskSubtask[]>([])
  const [subtaskChecks, setSubtaskChecks] = useState<boolean[]>([])

  const isReviewer = isReviewerOrAbove(user?.role ?? 'annotator')
  const basePath = user?.clientSlug ? `/${user.clientSlug}/dashboard` : '/dashboard'

  useEffect(() => {
    if (!user) return
    api.reviews.list()
      .then(data => {
        setReviews(data)
        const active = data.filter((r: Review) => r.status === 'in-review' && r.reviewerId === user.id)
        setAtTaskLimit(isReviewer && active.length >= 1)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [user])

  const filtered = reviews.filter(r => {
    const mine = isReviewer
      ? r.status !== 'in-review' || r.reviewerId === user?.id
      : r.annotatorId === user?.id
    return mine && (statusFilter === 'all' || r.status === statusFilter)
  })

  const handleClaim = async (review: Review) => {
    try {
      const updated = await api.reviews.claim(review.id)
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, ...updated } : r))
    } catch (e: unknown) { if (e instanceof Error) alert(e.message) }
  }

  const openDecideDialog = async (review: Review) => {
    setDecideReview(review); setDecision('approve'); setErrorTags([]); setShowTagForm(false)
    setTaskSubtasks([]); setSubtaskChecks([])
    try {
      const task = await api.tasks.get(review.taskId) as Task
      if (task.subtasks && task.subtasks.length > 0) {
        setTaskSubtasks(task.subtasks)
        setSubtaskChecks(task.subtasks.map(() => true))
      }
    } catch { /* subtasks optional */ }
  }

  const ALL_CATEGORIES = [...MAJOR_ERROR_CATEGORIES, ...MINOR_ERROR_CATEGORIES]
  const getCategoryLabel = (value: string) => ALL_CATEGORIES.find(c => c.value === value)?.label ?? value

  const handleDecide = async () => {
    if (!decideReview) return
    setIsSubmitting(true)
    try {
      const fullTags = errorTags.map(t => ({
        tagId: crypto.randomUUID(),
        severity: t.severity,
        category: t.category,
        message: getCategoryLabel(t.category),
        stepReference: t.stepReference,
        scoreDeduction: t.severity === 'major' ? 20 : 5,
        status: 'open',
        createdBy: user?.id ?? '',
        createdByEmail: user?.email ?? '',
      }))
      const subtaskScore = taskSubtasks.length > 0
        ? Math.round((subtaskChecks.filter(Boolean).length / taskSubtasks.length) * 100)
        : qualityScore
      const updated = await api.reviews.decide(decideReview.id, {
        decision, comments, reasonCode,
        qualityScore: decision === 'approve' ? subtaskScore : undefined,
        criteriaScores: decision === 'approve' ? { accuracy: subtaskScore, completeness: subtaskScore, adherence: subtaskScore } : undefined,
        errorTags: fullTags.length ? fullTags : undefined,
      })
      setReviews(prev => prev.map(r => r.id === decideReview.id ? { ...r, ...updated } : r))
      setDecideReview(null)
      setComments('')
      setErrorTags([])
      setShowTagForm(false)
    } catch { /* noop */ }
    finally { setIsSubmitting(false) }
  }

  const handleRecall = async (review: Review) => {
    try {
      await api.tasks.action(review.taskId, 'recall')
      setReviews(prev => prev.filter(r => r.id !== review.id))
    } catch (e: unknown) { if (e instanceof Error) alert(e.message) }
  }

  const handleEscalate = async () => {
    if (!escalateReview) return
    setIsSubmitting(true)
    try {
      await api.tasks.action(escalateReview.taskId, 'escalate', { comment: escalateComment })
      setReviews(prev => prev.map(r => r.id === escalateReview.id ? { ...r, status: 'escalated' as ReviewStatus } : r))
      setEscalateReview(null)
      setEscalateComment('')
    } catch (e: unknown) { if (e instanceof Error) alert(e.message) }
    finally { setIsSubmitting(false) }
  }

  const pending = filtered.filter(r => r.status === 'pending')
  const approved = filtered.filter(r => r.status === 'approved')
  const needsAction = filtered.filter(r => ['rejected', 'revision-requested', 'escalated', 'on-hold', 'flagged'].includes(r.status))

  const pagedSlice = useCallback((list: Review[]) =>
    list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page])

  const TablePager = ({ list }: { list: Review[] }) => {
    const total = list.length
    const from = total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)
    const to = Math.min(page * PAGE_SIZE, total)
    const pages = Math.ceil(total / PAGE_SIZE)
    return (
      <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
        <span className="text-xs text-muted-foreground">{from} - {to} of {total} rows</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === pages || pages === 0} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(1)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  const ReviewTable = ({ list, inNeedsAction = false }: { list: Review[]; inNeedsAction?: boolean }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[300px]">Task ID</TableHead>
            <TableHead>Batch</TableHead>
            {isReviewer && <TableHead>Annotator</TableHead>}
            {!isReviewer && <TableHead>Reviewer</TableHead>}
            <TableHead className="w-[160px]">Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quality</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedSlice(list).length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No reviews found</TableCell>
            </TableRow>
          ) : (
            pagedSlice(list).map(review => {
              const isInReview = review.status === 'in-review'
              const isPendingReview = review.status === 'pending'
              const isNeedsRework = ['rejected', 'revision-requested'].includes(review.status)
              return (
                <TableRow key={review.id}>
                  <TableCell>
                    <Link href={`${basePath}/tasks/${review.taskId}`} className="text-primary hover:underline font-mono text-xs">
                      {review.taskId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{review.batchTitle}</TableCell>
                  {isReviewer && <TableCell className="text-sm text-muted-foreground">{review.annotatorEmail}</TableCell>}
                  {!isReviewer && <TableCell className="text-sm text-muted-foreground">{review.reviewerName || 'Pending'}</TableCell>}
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(review.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{statusBadge(review.status)}</TableCell>
                  <TableCell className="text-sm font-medium text-green-600">
                    {review.qualityScore ? `${review.qualityScore}%` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                        <Link href={`${basePath}/tasks/${review.taskId}`}>View</Link>
                      </Button>
                      {isReviewer && isPendingReview && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={atTaskLimit} onClick={() => handleClaim(review)}>Claim</Button>
                      )}
                      {isReviewer && isInReview && review.reviewerId === user?.id && (
                        <Button size="sm" className="h-7 text-xs"
                          onClick={() => openDecideDialog(review)}>Decide</Button>
                      )}
                      {isReviewer && isInReview && review.reviewerId !== user?.id && (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">In Review</Badge>
                      )}
                      {!isReviewer && inNeedsAction && (
                        isInReview ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">In Review</Badge>
                        ) : (
                          <>
                            {isPendingReview && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleRecall(review)}>
                                <Pencil className="h-3.5 w-3.5" />Edit
                              </Button>
                            )}
                            {isNeedsRework && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                                  <Link href={`${basePath}/tasks/${review.taskId}`}>Revise</Link>
                                </Button>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => setEscalateReview(review)}>
                                  <ArrowUpCircle className="h-3.5 w-3.5" />Escalate
                                </Button>
                              </>
                            )}
                          </>
                        )
                      )}
                      {!isReviewer && !inNeedsAction && review.status === 'revision-requested' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                          <Link href={`${basePath}/tasks/${review.taskId}`}>Revise</Link>
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
      <TablePager list={list} />
    </div>
  )

  return (
    <>
      <TopBar title="Reviews" subtitle={isReviewer ? 'Review submitted tasks' : 'Track your submission reviews'} />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {isReviewer && atTaskLimit && (
          <Alert className="mb-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              Maximum of 2 active reviews reached. Complete one before claiming more.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3 mb-4">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as ReviewStatus | 'all'); setPage(1) }}>
            <SelectTrigger className="w-[160px] bg-card border-border h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="revision-requested">Revision Needed</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive text-sm">{error}</div>
        ) : (
          <Tabs defaultValue="all" className="space-y-3" onValueChange={() => setPage(1)}>
            <TabsList className="bg-card border border-border h-9">
              <TabsTrigger value="all" className="text-xs">All ({filtered.length})</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">Approved ({approved.length})</TabsTrigger>
              <TabsTrigger value="action" className="text-xs">Needs Action ({needsAction.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all"><ReviewTable list={filtered} /></TabsContent>
            <TabsContent value="pending"><ReviewTable list={pending} /></TabsContent>
            <TabsContent value="approved"><ReviewTable list={approved} /></TabsContent>
            <TabsContent value="action"><ReviewTable list={needsAction} inNeedsAction /></TabsContent>
          </Tabs>
        )}
      </main>

      {/* Reviewer Decision Dialog */}
      <Dialog open={!!decideReview} onOpenChange={open => { if (!open) { setDecideReview(null); setErrorTags([]); setShowTagForm(false); setTaskSubtasks([]); setSubtaskChecks([]) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Decision</DialogTitle>
            <DialogDescription>{decideReview?.taskTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Decision</Label>
              <Select value={decision} onValueChange={v => setDecision(v as ReviewDecision)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="request-rework">Request Rework</SelectItem>
                  <SelectItem value="escalate">Escalate</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="flag">Flag for Investigation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {decision === 'approve' && taskSubtasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Step Checklist</Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {subtaskChecks.filter(Boolean).length}/{taskSubtasks.length} passed ·{' '}
                    {Math.round((subtaskChecks.filter(Boolean).length / taskSubtasks.length) * 100)}%
                  </span>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  {taskSubtasks.map((sub, i) => (
                    <button key={sub.id} type="button"
                      onClick={() => setSubtaskChecks(prev => prev.map((v, j) => j === i ? !v : v))}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${i % 2 === 0 ? 'bg-secondary/20' : ''} hover:bg-secondary/40`}>
                      <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${subtaskChecks[i] ? 'bg-success border-success' : 'border-border'}`}>
                        {subtaskChecks[i] && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-snug">{sub.title}</p>
                        {sub.description && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{sub.description}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {decision === 'approve' && taskSubtasks.length === 0 && (
              <div>
                <Label className="text-xs mb-2 block">Quality Score ({qualityScore}%)</Label>
                <input type="range" min={0} max={100} value={qualityScore}
                  onChange={e => setQualityScore(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            )}
            {decision !== 'approve' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs flex items-center gap-1.5"><Tag className="h-3 w-3" />Error Tags</Label>
                  {!showTagForm && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => { setShowTagForm(true); setTagSeverity('major'); setTagCategory(''); setTagStep('') }}>
                      <Plus className="h-3 w-3" />Add Tag
                    </Button>
                  )}
                </div>
                {errorTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {errorTags.map((tag, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                        tag.severity === 'major' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        <span className="font-bold uppercase">{tag.severity[0]}</span>
                        {getCategoryLabel(tag.category)}
                        {tag.stepReference && <span className="opacity-60">· {tag.stepReference}</span>}
                        <button type="button" className="ml-0.5 hover:opacity-100 opacity-60"
                          onClick={() => setErrorTags(prev => prev.filter((_, j) => j !== i))}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                {showTagForm && (
                  <div className="border border-border rounded-lg p-3 space-y-2.5 bg-secondary/20">
                    <div className="flex gap-2">
                      {(['major', 'minor'] as ErrorSeverity[]).map(sev => (
                        <button key={sev} type="button"
                          className={`flex-1 text-xs py-1.5 rounded border capitalize transition-colors ${
                            tagSeverity === sev
                              ? sev === 'major' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-yellow-50 border-yellow-300 text-yellow-700'
                              : 'border-border text-muted-foreground hover:border-muted-foreground'
                          }`}
                          onClick={() => { setTagSeverity(sev); setTagCategory('') }}>
                          {sev}
                        </button>
                      ))}
                    </div>
                    <Select value={tagCategory} onValueChange={setTagCategory}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category..." /></SelectTrigger>
                      <SelectContent>
                        {(tagSeverity === 'major' ? MAJOR_ERROR_CATEGORIES : MINOR_ERROR_CATEGORIES).map(c => (
                          <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="text" placeholder="Step reference (optional)"
                      value={tagStep} onChange={e => setTagStep(e.target.value)}
                      className="w-full h-8 text-xs px-3 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                        onClick={() => { setShowTagForm(false); setTagCategory(''); setTagStep('') }}>Cancel</Button>
                      <Button size="sm" className="flex-1 h-7 text-xs" disabled={!tagCategory}
                        onClick={() => {
                          setErrorTags(prev => [...prev, { severity: tagSeverity, category: tagCategory, stepReference: tagStep || undefined }])
                          setTagCategory(''); setTagStep(''); setShowTagForm(false)
                        }}>Add</Button>
                    </div>
                  </div>
                )}
                {errorTags.length === 0 && !showTagForm && (
                  <p className="text-[10px] text-muted-foreground">No error tags — add tags to categorize issues found.</p>
                )}
              </div>
            )}
            <div>
              <Label className="text-xs mb-2 block">Reason Code (optional)</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high-quality">High Quality Work</SelectItem>
                  <SelectItem value="incomplete">Incomplete Task</SelectItem>
                  <SelectItem value="inaccurate">Inaccurate Data</SelectItem>
                  <SelectItem value="format-error">Format Error</SelectItem>
                  <SelectItem value="policy-violation">Policy Violation</SelectItem>
                  <SelectItem value="needs-clarification">Needs Clarification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Comments</Label>
              <Textarea placeholder="Add review comments..." value={comments}
                onChange={e => setComments(e.target.value)} className="min-h-[100px] bg-secondary/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideReview(null)}>Cancel</Button>
            <Button onClick={handleDecide} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Annotator Escalate Dialog */}
      <Dialog open={!!escalateReview} onOpenChange={open => { if (!open) { setEscalateReview(null); setEscalateComment('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-destructive" />Escalate Task
            </DialogTitle>
            <DialogDescription>
              Escalate "{escalateReview?.taskTitle}" — explain why you disagree with the review decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the reason for escalation..."
            value={escalateComment}
            onChange={e => setEscalateComment(e.target.value)}
            className="min-h-[120px] bg-secondary/30"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEscalateReview(null); setEscalateComment('') }}>Cancel</Button>
            <Button onClick={handleEscalate} disabled={isSubmitting || !escalateComment.trim()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              <ArrowUpCircle className="h-4 w-4 mr-2" />{isSubmitting ? 'Escalating...' : 'Escalate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
