'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, AlertCircle, Users, TrendingUp,
  BarChart3, Workflow, Building2, ShieldCheck, Globe,
  RefreshCw, HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TopBar } from '@/components/top-bar'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Review, Client, Task } from '@/lib/types'

export default function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === 'super_admin') return <SuperAdminDashboard />
  if (['annotator', 'reviewer', 'reviewer_annotator'].includes(user.role)) return <FieldWorkerDashboard />
  return <AdminDashboard />
}

// ─── Field Worker — centered task-focused interface ──────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function FieldWorkerDashboard() {
  const { user } = useAuth()
  const isCombined = user?.role === 'reviewer_annotator'
  const [mode, setMode] = useState<'annotate' | 'review'>(user?.role === 'reviewer' ? 'review' : 'annotate')
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allReviews, setAllReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [noTasks, setNoTasks] = useState(false)

  const basePath = user?.clientSlug ? `/${user.clientSlug}/dashboard` : '/dashboard'

  const showAnnotate = mode === 'annotate' || user?.role === 'annotator'
  const showReview   = mode === 'review'   || user?.role === 'reviewer'

  useEffect(() => { if (user) load() }, [user, mode])  // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setIsLoading(true)
    setNoTasks(false)
    try {
      const taskParam = user?.role === 'reviewer_annotator' ? { viewAs: 'annotator' } : { mine: 'true' }
      const [fetchedTasks, fetchedReviews] = await Promise.all([
        api.tasks.list(taskParam),
        api.reviews.list(),
      ])
      setAllTasks((fetchedTasks.tasks ?? []) as Task[])
      setAllReviews(fetchedReviews as Review[])
    } catch { /* noop */ }
    finally { setIsLoading(false) }
  }

  // ── Task groupings ───────────────────────────────────────────────────────────
  const reworkTasks  = allTasks.filter(t => t.status === 'revision-requested')
  const activeTasks  = allTasks.filter(t => ['in-progress', 'paused'].includes(t.status))

  // ── Review groupings ─────────────────────────────────────────────────────────
  const myReviews          = allReviews.filter(r => r.reviewerId === user?.id)
  const myActiveReviews    = myReviews.filter(r => r.status === 'in-review')
  const myCompletedReviews = myReviews.filter(r => ['approved', 'rejected', 'revision-requested'].includes(r.status))
  const pendingQueue       = allReviews.filter(r => r.status === 'pending')

  // ── Annotator stats ──────────────────────────────────────────────────────────
  const aTotal      = allTasks.length
  const aCompleted  = allTasks.filter(t => ['approved', 'data-ready'].includes(t.status)).length
  const aActive     = allTasks.filter(t => ['in-progress', 'paused'].includes(t.status)).length
  const aSubmitted  = allTasks.filter(t => ['submitted', 'in-review'].includes(t.status)).length
  const aScores     = allTasks.filter(t => t.qualityScore).map(t => t.qualityScore as number)
  const aAvgScore   = aScores.length ? Math.round(aScores.reduce((s, v) => s + v, 0) / aScores.length) : null
  const aReviewed   = allTasks.filter(t => ['approved', 'rejected', 'revision-requested', 'data-ready'].includes(t.status))
  const aApproval   = aReviewed.length
    ? Math.round(aReviewed.filter(t => ['approved', 'data-ready'].includes(t.status)).length / aReviewed.length * 100)
    : null

  // ── Reviewer stats ───────────────────────────────────────────────────────────
  const rTotal       = myReviews.length
  const rDone        = myCompletedReviews.length
  const rActive      = myActiveReviews.length
  const rInQueue     = pendingQueue.length
  const rApproved    = myCompletedReviews.filter(r => r.status === 'approved').length
  const rRejected    = myCompletedReviews.filter(r => r.status === 'rejected').length
  const rApprovalRate = myCompletedReviews.length
    ? Math.round(rApproved / myCompletedReviews.length * 100)
    : null

  // ── Get task logic ───────────────────────────────────────────────────────────
  const activeTask   = activeTasks[0]
  const reworkTask   = reworkTasks[0]
  const activeReview = myActiveReviews[0]

  const btnLabel = isClaiming ? 'Claiming…'
    : showAnnotate
      ? activeTask ? 'Resume Task' : reworkTask ? 'Complete Rework' : 'Get New Task'
      : activeReview ? 'Continue Review' : pendingQueue.length ? 'Start Next Review' : 'No Reviews'

  async function handleGetTask() {
    setIsClaiming(true)
    setNoTasks(false)
    try {
      if (showAnnotate) {
        if (activeTask) { window.location.href = `${basePath}/tasks/${activeTask.id}`; return }
        if (reworkTask) { window.location.href = `${basePath}/tasks/${reworkTask.id}`; return }
        const unclaimedRes = await api.tasks.list({ status: 'unclaimed' })
        const unclaimed = (unclaimedRes.tasks ?? []) as Task[]
        if (!unclaimed.length) { setNoTasks(true); return }
        const pick = unclaimed[Math.floor(Math.random() * unclaimed.length)]
        await api.tasks.action(pick.id, 'claim')
        window.location.href = `${basePath}/tasks/${pick.id}`
      } else {
        if (activeReview) { window.location.href = `${basePath}/tasks/${activeReview.taskId}`; return }
        if (!pendingQueue.length) { setNoTasks(true); return }
        await api.reviews.claim(pendingQueue[0].id)
        window.location.href = `${basePath}/tasks/${pendingQueue[0].taskId}`
      }
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
    finally { setIsClaiming(false) }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

          {/* Page title */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your current work</p>
          </div>

          {/* Mode tabs — combined role only */}
          {isCombined && (
            <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
              {(['annotate', 'review'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setNoTasks(false) }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'annotate' ? 'Annotator' : 'Reviewer'}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-6">
              {[120, 80, 220].map((h, i) => (
                <div key={i} className="rounded-lg bg-muted animate-pulse" style={{ height: h }} />
              ))}
            </div>
          ) : (
            <>
              {/* ── Re-requested section (annotator only) ── */}
              {showAnnotate && reworkTasks.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h2 className="text-base font-semibold text-destructive">Re-requested ({reworkTasks.length})</h2>
                    <p className="text-sm text-muted-foreground">Reviewers have requested changes to these tasks.</p>
                  </div>
                  <div className="space-y-2">
                    {reworkTasks.map(t => <FieldTaskCard key={t.id} task={t} basePath={basePath} />)}
                  </div>
                </section>
              )}

              {/* ── Current tasks / Review queue ── */}
              <section className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">{showAnnotate ? 'Current Tasks' : 'Review Queue'}</h2>
                    <p className="text-sm text-muted-foreground">
                      {showAnnotate
                        ? 'Continue your work or pick up something new.'
                        : `${pendingQueue.length} task${pendingQueue.length !== 1 ? 's' : ''} waiting for review.`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={handleGetTask}
                    disabled={
                      isClaiming ||
                      (showAnnotate && noTasks && !activeTask && !reworkTask) ||
                      (showReview && !activeReview && !pendingQueue.length)
                    }
                  >
                    {isClaiming && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    {btnLabel}
                  </Button>
                </div>

                {showAnnotate ? (
                  activeTasks.length > 0
                    ? <div className="space-y-2">{activeTasks.map(t => <FieldTaskCard key={t.id} task={t} basePath={basePath} />)}</div>
                    : <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
                        <p className="text-sm text-warning">No tasks right now.</p>
                      </div>
                ) : (
                  myActiveReviews.length > 0
                    ? <div className="space-y-2">{myActiveReviews.map(r => <FieldReviewCard key={r.id} review={r} basePath={basePath} />)}</div>
                    : <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
                        <p className="text-sm text-muted-foreground">
                          {pendingQueue.length > 0
                            ? `${pendingQueue.length} task${pendingQueue.length !== 1 ? 's' : ''} in queue — click "Start Next Review" to begin.`
                            : 'No reviews in queue right now.'}
                        </p>
                      </div>
                )}

                {noTasks && (
                  <p className="text-center text-xs text-muted-foreground">
                    {showAnnotate ? 'No unclaimed tasks available right now.' : 'No reviews in the queue right now.'}
                  </p>
                )}
              </section>

              {/* ── Stats ── */}
              <section className="space-y-3">
                <div>
                  <h2 className="text-base font-semibold">Your stats</h2>
                  <p className="text-sm text-muted-foreground">A snapshot of your activity in this workspace.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {showAnnotate ? (
                    <>
                      <StatCard label="Total Tasks"   value={aTotal} />
                      <StatCard label="Completed"     value={aCompleted} />
                      <StatCard label="Active"        value={aActive} />
                      <StatCard label="Pending Review" value={aSubmitted} />
                      <StatCard label="Avg Score"     value={aAvgScore !== null ? `${aAvgScore}%` : '—'} />
                      <StatCard label="Approval Rate" value={aApproval !== null ? `${aApproval}%` : '—'} />
                    </>
                  ) : (
                    <>
                      <StatCard label="Total Reviews" value={rTotal} />
                      <StatCard label="Completed"     value={rDone} />
                      <StatCard label="Active"        value={rActive} />
                      <StatCard label="In Queue"      value={rInQueue} />
                      <StatCard label="Approved"      value={rApproved} />
                      <StatCard label="Approval Rate" value={rApprovalRate !== null ? `${rApprovalRate}%` : '—'} />
                    </>
                  )}
                </div>
              </section>
            </>
          )}

      </div>
    </main>
  )
}

function FieldTaskCard({ task, basePath }: { task: Task; basePath: string }) {
  const lastActivity = task.activityLog?.[task.activityLog.length - 1]
  const when = timeAgo(lastActivity?.timestamp ?? task.submittedAt ?? task.createdAt)

  const statusLine =
    task.status === 'revision-requested' ? `Re-requested with feedback${when ? ` ${when}` : ''}`
    : task.status === 'in-progress'       ? 'Currently in progress'
    : task.status === 'paused'            ? 'Paused'
    : task.status

  const typeLabel = task.taskType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return (
    <Link href={`${basePath}/tasks/${task.id}`}>
      <div className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/40 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{task.title}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{task.id}</p>
            <p className="text-xs text-muted-foreground mt-1">{statusLine}</p>
            {task.status === 'revision-requested' && task.feedback && (
              <p className="text-xs text-muted-foreground mt-1.5 pl-2 border-l-2 border-border truncate">
                ↳ {task.feedback}
              </p>
            )}
          </div>
          <span className="shrink-0 inline-flex items-center rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-medium text-background">
            {typeLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}

function FieldReviewCard({ review, basePath }: { review: Review; basePath: string }) {
  return (
    <Link href={`${basePath}/tasks/${review.taskId}`}>
      <div className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/40 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{review.taskTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">By {review.annotatorName} · {review.batchTitle}</p>
          </div>
          <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
            In Review
          </span>
        </div>
      </div>
    </Link>
  )
}

function StatCard({ label, sub, value }: { label: string; sub?: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-1 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>}
        </div>
        <HelpCircle className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

// ─── Super Admin ─────────────────────────────────────────────────────────────

function SuperAdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.clients.list()
      .then(setClients)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const active = clients.filter(c => c.isActive).length
  const plans  = clients.reduce<Record<string, number>>((acc, c) => { acc[c.plan] = (acc[c.plan] ?? 0) + 1; return acc }, {})

  const summaryCards = [
    { label: 'Total Workspaces',    value: clients.length,        icon: Building2,   cls: 'bg-primary/10 text-primary'        },
    { label: 'Active Workspaces',   value: active,                icon: Globe,       cls: 'bg-success/10 text-success'        },
    { label: 'Enterprise Plan',     value: plans.enterprise ?? 0, icon: ShieldCheck, cls: 'bg-destructive/10 text-destructive' },
    { label: 'Pro Plan',            value: plans.pro ?? 0,        icon: ShieldCheck, cls: 'bg-warning/10 text-warning'        },
    { label: 'Starter Plan',        value: plans.starter ?? 0,    icon: Users,       cls: 'bg-muted text-muted-foreground'    },
  ]

  const planCls: Record<string, string> = {
    enterprise: 'bg-destructive/10 text-destructive border-destructive/20',
    pro:        'bg-warning/10 text-warning border-warning/20',
    starter:    'bg-muted text-muted-foreground border-border',
  }

  return (
    <>
      <TopBar title="System Overview" subtitle="All workspaces across the platform" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-destructive text-sm text-center py-12">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {summaryCards.map(c => (
                <Card key={c.label} className="border-border bg-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${c.cls}`}><c.icon className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xl font-bold">{c.value}</p>
                        <p className="text-[10px] text-muted-foreground">{c.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1.5 text-xs" asChild>
                <Link href="/dashboard/admin"><Building2 className="h-3.5 w-3.5" />Manage Workspaces</Link>
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
                <Link href="/dashboard/reports"><Users className="h-3.5 w-3.5" />All Users</Link>
              </Button>
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-3">All Workspaces</h2>
              {clients.length === 0 ? (
                <Card className="border-border bg-card">
                  <CardContent className="flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">No workspaces yet. Create one in Manage Workspaces.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {clients.map(client => (
                    <Card key={client.id} className="border-border bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{client.name}</p>
                                <Badge variant="outline" className={`text-[10px] ${planCls[client.plan]}`}>{client.plan}</Badge>
                                {!client.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">{client.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" asChild>
                              <Link href={`/${client.slug}/login`} target="_blank"><Globe className="h-3 w-3" />Login</Link>
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" asChild>
                              <Link href="/dashboard/admin"><ShieldCheck className="h-3 w-3" />Manage</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

// ─── Admin (client_admin / qa_lead) ──────────────────────────────────────────

function AdminDashboard() {
  const { user } = useAuth()
  const basePath = user?.clientSlug ? `/${user.clientSlug}/dashboard` : '/dashboard'
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.analytics.get()
      .then(setAnalytics)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  const summary       = (analytics?.summary       as Record<string, number>)      || {}
  const annotatorPerf = (analytics?.annotatorPerformance as Record<string, unknown>[]) || []
  const reviewerAct   = (analytics?.reviewerActivity     as Record<string, unknown>[]) || []

  const summaryCards = [
    { label: 'Total Annotators', value: summary.totalAnnotators ?? 0, icon: Users,       cls: 'bg-primary/10 text-primary'     },
    { label: 'Tasks Completed',  value: summary.completedTasks  ?? 0, icon: CheckCircle2, cls: 'bg-success/10 text-success'     },
    { label: 'Pending Reviews',  value: summary.pendingReviews  ?? 0, icon: AlertCircle,  cls: 'bg-warning/10 text-warning'     },
    { label: 'Active Tasks',     value: summary.activeTasks     ?? 0, icon: TrendingUp,   cls: 'bg-muted text-muted-foreground' },
  ]

  return (
    <>
      <TopBar title="Dashboard" subtitle="Platform overview" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-destructive text-sm text-center py-12">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {summaryCards.map(c => (
                <Card key={c.label} className="border-border bg-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${c.cls}`}><c.icon className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xl font-bold">{c.value}</p>
                        <p className="text-[10px] text-muted-foreground">{c.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1.5 text-xs" asChild>
                <Link href={`${basePath}/admin`}><Users className="h-3.5 w-3.5" />Manage Users</Link>
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
                <Link href={`${basePath}/work`}><Workflow className="h-3.5 w-3.5" />Filter Tasks</Link>
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
                <Link href={`${basePath}/reports`}><BarChart3 className="h-3.5 w-3.5" />Reports</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">Annotators</CardTitle>
                  <Badge variant="outline" className="text-[10px]">{annotatorPerf.length}</Badge>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  {annotatorPerf.length === 0
                    ? <p className="text-xs text-muted-foreground">No annotators yet</p>
                    : annotatorPerf.slice(0, 5).map(a => (
                        <div key={a.id as string} className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-[10px] font-medium flex items-center justify-center shrink-0">
                            {(a.name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{a.name as string}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{a.email as string}</p>
                          </div>
                        </div>
                      ))
                  }
                  <Link href={`${basePath}/admin`} className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
                    See all <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">Reviewers</CardTitle>
                  <Badge variant="outline" className="text-[10px]">{reviewerAct.length}</Badge>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  {reviewerAct.length === 0
                    ? <p className="text-xs text-muted-foreground">No reviewers yet</p>
                    : reviewerAct.slice(0, 5).map(r => (
                        <div key={r.id as string} className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-success/15 text-success text-[10px] font-medium flex items-center justify-center shrink-0">
                            {(r.name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{r.name as string}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{r.email as string}</p>
                          </div>
                        </div>
                      ))
                  }
                  <Link href={`${basePath}/admin`} className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
                    See all <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  )
}
