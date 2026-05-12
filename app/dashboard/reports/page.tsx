'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp, Users, Clock, Award, Search, X, Building2,
  UserCheck, Shield, Star,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TopBar } from '@/components/top-bar'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Client, User } from '@/lib/types'
import {
  Bar, BarChart, Line, LineChart, Pie, PieChart, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

const PLAN_COLORS: Record<string, string> = {
  enterprise: 'bg-destructive/10 text-destructive border-destructive/20',
  pro:        'bg-warning/10 text-warning border-warning/20',
  starter:    'bg-muted text-muted-foreground border-border',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin:        'bg-destructive/10 text-destructive border-destructive/20',
  client_admin:       'bg-warning/10 text-warning border-warning/20',
  qa_lead:            'bg-success/10 text-success border-success/20',
  reviewer:           'bg-primary/10 text-primary border-primary/20',
  reviewer_annotator: 'bg-primary/20 text-primary border-primary/30',
  annotator:          'bg-muted text-foreground border-border',
}

const ROLE_DISPLAY: Record<string, string> = {
  super_admin:        'Super Admin',
  client_admin:       'Admin',
  qa_lead:            'QA Lead',
  reviewer:           'Reviewer',
  reviewer_annotator: 'Rev / Annotator',
  annotator:          'Annotator',
}

const TEAM_PAGE_SIZE = 12

// ─── Types ────────────────────────────────────────────────────────────────────

type Filters = {
  workflow: string
  annotatorEmail: string
  reviewerEmail: string
  dateFrom: string
  dateTo: string
  clientId: string
}

const EMPTY: Filters = {
  workflow: '', annotatorEmail: '', reviewerEmail: '',
  dateFrom: '', dateTo: '', clientId: '',
}

// ─── Team member card ─────────────────────────────────────────────────────────

function MemberCard({
  user,
  perf,
  act,
}: {
  user: User
  perf?: Record<string, unknown>
  act?: Record<string, unknown>
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-medium shrink-0">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium text-sm text-foreground">{user.name}</p>
              <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[user.role] ?? ''}`}>
                {ROLE_DISPLAY[user.role] ?? user.role}
              </Badge>
              {!user.isActive && (
                <Badge variant="outline" className="text-[10px] bg-muted">Inactive</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{user.email}</p>
            {user.department && (
              <p className="text-xs text-muted-foreground mb-2">{user.department}</p>
            )}
            {perf && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{perf.tasksCompleted as number} tasks</span>
                <span className={Number(perf.averageQuality) >= 90 ? 'text-success' : 'text-warning'}>
                  {perf.averageQuality as number}% quality
                </span>
                <span>{perf.averageTimeMinutes as number}m avg</span>
              </div>
            )}
            {act && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{act.reviewsCompleted as number} reviews</span>
                <span className={Number(act.approvalRate) >= 85 ? 'text-success' : 'text-warning'}>
                  {act.approvalRate as number}% approval
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PaginatedMemberGrid({
  users,
  perf,
  act,
}: {
  users: User[]
  perf: Record<string, unknown>[]
  act: Record<string, unknown>[]
}) {
  const [page, setPage] = useState(1)
  const slice = users.slice((page - 1) * TEAM_PAGE_SIZE, page * TEAM_PAGE_SIZE)

  useEffect(() => { setPage(1) }, [users.length])

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No members in this group.</p>
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        {slice.map(u => (
          <MemberCard
            key={u.id}
            user={u}
            perf={perf.find(a => a.id === u.id)}
            act={act.find(a => a.id === u.id)}
          />
        ))}
      </div>
      <PaginationBar page={page} total={users.length} pageSize={TEAM_PAGE_SIZE} onPage={setPage} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY)

  const set = (k: keyof Filters, v: string) => setFilters(p => ({ ...p, [k]: v }))

  const buildParams = (f: Filters): Record<string, string> => {
    const p: Record<string, string> = {}
    if (f.workflow)       p.workflow       = f.workflow
    if (f.annotatorEmail) p.annotatorEmail = f.annotatorEmail
    if (f.reviewerEmail)  p.reviewerEmail  = f.reviewerEmail
    if (f.dateFrom)       p.dateFrom       = f.dateFrom
    if (f.dateTo)         p.dateTo         = f.dateTo
    if (f.clientId)       p.clientId       = f.clientId
    return p
  }

  const loadAnalytics = useCallback(async (f: Filters) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = buildParams(f)
      const data = await api.analytics.get(Object.keys(params).length ? params : undefined)
      setAnalytics(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      loadAnalytics(EMPTY)
      try {
        const [u, c] = await Promise.all([
          api.users.list(),
          isSuperAdmin ? api.clients.list() : Promise.resolve([]),
        ])
        setUsers(u)
        setClients(c)
      } catch {}
    }
    init()
  }, [loadAnalytics, isSuperAdmin])

  const hasFilters = Object.values(filters).some(v => v !== '')

  const summary             = (analytics?.summary as Record<string, number>) || {}
  const tasksCompletedByDay = (analytics?.tasksCompletedByDay as { date: string; count: number }[]) || []
  const qualityScoresTrend  = (analytics?.qualityScoresTrend as { date: string; score: number }[]) || []
  const tasksByType         = (analytics?.tasksByType as { type: string; count: number }[]) || []
  const annotatorPerf       = (analytics?.annotatorPerformance as Record<string, unknown>[]) || []
  const reviewerAct         = (analytics?.reviewerActivity as Record<string, unknown>[]) || []

  const taskTypeData = tasksByType.map(item => ({
    name: item.type.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    value: item.count,
  }))
  const totalTasksThisWeek = tasksCompletedByDay.reduce((s, d) => s + d.count, 0)

  // Team member groups
  const annotators    = users.filter(u => u.role === 'annotator')
  const reviewers     = users.filter(u => u.role === 'reviewer')
  const revAnnotators = users.filter(u => u.role === 'reviewer_annotator')
  const qaLeads       = users.filter(u => u.role === 'qa_lead')
  const admins        = users.filter(u => u.role === 'client_admin' || u.role === 'super_admin')

  const visibleAll = isSuperAdmin
    ? users
    : users.filter(u => ['annotator', 'reviewer', 'reviewer_annotator', 'qa_lead', 'client_admin'].includes(u.role))

  return (
    <>
      <TopBar title="Reports & Analytics" subtitle="Performance insights, metrics, and team overview" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">

        {/* Super Admin: Workspace Overview */}
        {isSuperAdmin && clients.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />Workspace Overview
              </CardTitle>
              <CardDescription className="text-xs">All active workspaces — click to filter analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { set('clientId', c.id); loadAnalytics({ ...filters, clientId: c.id }) }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:border-primary/50 ${
                      filters.clientId === c.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{c.slug}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${PLAN_COLORS[c.plan]}`}>{c.plan}</Badge>
                      {!c.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Off</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {isSuperAdmin && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs mb-1 block">Workspace</Label>
                  <Select value={filters.clientId || 'all'} onValueChange={v => set('clientId', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-sm bg-secondary/30"><SelectValue placeholder="All workspaces" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All workspaces</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} <span className="text-muted-foreground text-xs">({c.plan})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs mb-1 block">Workflow</Label>
                <Input
                  placeholder="e.g. agentic-ai"
                  value={filters.workflow}
                  onChange={e => set('workflow', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Annotator Email</Label>
                <Input
                  placeholder="annotator@company.com"
                  value={filters.annotatorEmail}
                  onChange={e => set('annotatorEmail', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Reviewer Email</Label>
                <Input
                  placeholder="reviewer@company.com"
                  value={filters.reviewerEmail}
                  onChange={e => set('reviewerEmail', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => set('dateFrom', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => set('dateTo', e.target.value)}
                  className="h-9 text-sm bg-secondary/30"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => loadAnalytics(filters)} disabled={isLoading} className="gap-1.5">
                <Search className="h-4 w-4" />
                {isLoading ? 'Loading…' : 'Apply Filters'}
              </Button>
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={() => { setFilters(EMPTY); loadAnalytics(EMPTY) }}
                  className="gap-1.5"
                >
                  <X className="h-4 w-4" />Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {error ? (
          <div className="text-destructive text-sm text-center py-12">{error}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Tasks This Week',   value: totalTasksThisWeek,                     icon: TrendingUp, color: 'text-primary',          bg: 'bg-primary/10'  },
                { label: 'Avg. Quality',      value: `${summary.averageQualityScore || 0}%`,  icon: Award,      color: 'text-success',          bg: 'bg-success/10'  },
                { label: 'Avg. Task Time',    value: '18m',                                  icon: Clock,      color: 'text-muted-foreground', bg: 'bg-muted'       },
                { label: 'Active Annotators', value: summary.totalAnnotators || 0,            icon: Users,      color: 'text-warning',          bg: 'bg-warning/10'  },
              ].map(s => (
                <Card key={s.label} className="border-border bg-card">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                      <div>
                        <p className="text-2xl font-semibold">{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Tasks Completed</CardTitle>
                  <CardDescription>Daily completion trend</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartContainer config={{ count: { label: 'Tasks', color: 'hsl(var(--chart-1))' } }} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tasksCompletedByDay} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="2 2" className="stroke-border/50" />
                        <XAxis dataKey="date"
                          tickFormatter={v => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })}
                          tickLine={false} axisLine={false}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Quality Score Trend</CardTitle>
                  <CardDescription>Average quality over time</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartContainer config={{ score: { label: 'Quality (%)', color: 'hsl(var(--chart-2))' } }} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={qualityScoresTrend} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="2 2" className="stroke-border/50" />
                        <XAxis dataKey="date"
                          tickFormatter={v => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })}
                          tickLine={false} axisLine={false} tick={{ fontSize: 12 }}
                        />
                        <YAxis domain={[70, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="natural" dataKey="score" stroke="hsl(var(--chart-2))" strokeWidth={3}
                          dot={{ r: 4, fill: 'hsl(var(--chart-2))', strokeWidth: 2 }} activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {taskTypeData.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Tasks by Type</CardTitle>
                  <CardDescription>Distribution of annotation task types</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={taskTypeData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} dataKey="value" nameKey="name">
                          {taskTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Team performance */}
            {users.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />Team Performance
                  </CardTitle>
                  <CardDescription className="text-xs">Per-member metrics for the selected period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Role counts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Annotators',        count: annotators.length,                       icon: UserCheck, color: 'text-primary',     bg: 'bg-primary/10'     },
                      { label: 'Reviewers',          count: reviewers.length + revAnnotators.length, icon: Shield,    color: 'text-success',     bg: 'bg-success/10'     },
                      { label: 'QA Leads',           count: qaLeads.length,                          icon: Star,      color: 'text-warning',     bg: 'bg-warning/10'     },
                      { label: 'Admins',             count: admins.length,                           icon: Users,     color: 'text-destructive', bg: 'bg-destructive/10' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 p-3">
                        <div className={`p-1.5 rounded-lg ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                        <div>
                          <p className="text-xl font-bold">{s.count}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Member grid by role */}
                  <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="bg-card border border-border h-auto flex-wrap">
                      <TabsTrigger value="all" className="text-xs">All ({visibleAll.length})</TabsTrigger>
                      <TabsTrigger value="annotators" className="text-xs">Annotators ({annotators.length})</TabsTrigger>
                      <TabsTrigger value="reviewers" className="text-xs">Reviewers ({reviewers.length})</TabsTrigger>
                      <TabsTrigger value="rev-annotators" className="text-xs">Rev / Annotators ({revAnnotators.length})</TabsTrigger>
                      <TabsTrigger value="qa" className="text-xs">QA Leads ({qaLeads.length})</TabsTrigger>
                      {['super_admin', 'qa_lead', 'client_admin'].includes(user?.role ?? '') && (
                        <TabsTrigger value="admins" className="text-xs">Admins ({admins.length})</TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="all">
                      <PaginatedMemberGrid users={visibleAll} perf={annotatorPerf} act={reviewerAct} />
                    </TabsContent>
                    <TabsContent value="annotators">
                      <PaginatedMemberGrid users={annotators} perf={annotatorPerf} act={[]} />
                    </TabsContent>
                    <TabsContent value="reviewers">
                      <PaginatedMemberGrid users={reviewers} perf={[]} act={reviewerAct} />
                    </TabsContent>
                    <TabsContent value="rev-annotators">
                      <PaginatedMemberGrid users={revAnnotators} perf={annotatorPerf} act={reviewerAct} />
                    </TabsContent>
                    <TabsContent value="qa">
                      <PaginatedMemberGrid users={qaLeads} perf={[]} act={reviewerAct} />
                    </TabsContent>
                    {['super_admin', 'qa_lead', 'client_admin'].includes(user?.role ?? '') && (
                      <TabsContent value="admins">
                        <PaginatedMemberGrid users={admins} perf={[]} act={[]} />
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  )
}
