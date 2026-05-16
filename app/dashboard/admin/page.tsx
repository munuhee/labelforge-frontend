'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Plus, Award, UserPlus, Workflow, X, Check,
  Upload, FileJson, FileText, ChevronDown, ChevronRight,
  ListTodo, ExternalLink, AlertCircle, Building2, Globe,
  ShieldCheck, UserCheck, Trash2, RefreshCw, Eye, Search,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TopBar } from '@/components/top-bar'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { useAuth } from '@/lib/auth-context'
import { useAppDispatch } from '@/store/hooks'
import { setUser } from '@/store/features/auth'
import { api } from '@/lib/api'
import type { User, Workflow as WorkflowType, Batch, Client } from '@/lib/types'
import { isClientAdmin, isSuperAdmin } from '@/lib/types'

const TASK_TYPES = ['agentic-ai', 'llm-training', 'multimodal', 'evaluation', 'benchmarking', 'preference-ranking', 'red-teaming', 'data-collection']

export default function AdminPage() {
  const { user } = useAuth()
  if (user?.role === 'super_admin') return <SuperAdminPage />
  return <ClientAdminPage />
}

// ─── Super Admin: platform-wide workspace & user management ───────────────────

type ClientMember = { id: string; userId: string; name: string; email: string; role: string; isActive: boolean; joinedAt: string }

function SuperAdminPage() {
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [members, setMembers] = useState<ClientMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState('all')

  // Create workspace dialog
  const [showCreate, setShowCreate] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', slug: '', description: '', plan: 'starter' })
  const [isCreating, setIsCreating] = useState(false)

  // Add member dialog
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember] = useState({ email: '', role: 'annotator' })
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Impersonate dialog
  const [impersonating, setImpersonating] = useState<ClientMember | null>(null)
  const [isImpersonating, setIsImpersonating] = useState(false)

  const loadClients = () =>
    api.clients.list()
      .then(setClients)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setIsLoading(false))

  useEffect(() => { loadClients() }, [])

  const loadMembers = async (client: Client) => {
    setSelectedClient(client)
    setMembers([])
    setMembersLoading(true)
    try {
      const data = await api.memberships.listForClient(client.id)
      setMembers(data)
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newClient.name || !newClient.slug) return
    setIsCreating(true)
    try {
      const created = await api.clients.create(newClient)
      setClients(prev => [...prev, created])
      setShowCreate(false)
      setNewClient({ name: '', slug: '', description: '', plan: 'starter' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsCreating(false) }
  }

  const handleAddMember = async () => {
    if (!selectedClient || !newMember.email) return
    setIsAddingMember(true)
    try {
      await api.memberships.addToClient(selectedClient.id, newMember)
      await loadMembers(selectedClient)
      setShowAddMember(false)
      setNewMember({ email: '', role: 'annotator' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsAddingMember(false) }
  }

  const handleDeactivateWorkspace = async (client: Client) => {
    if (!confirm(`Deactivate workspace "${client.name}"? Users will lose access.`)) return
    try {
      await api.clients.deactivate(client.id)
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, isActive: false } : c))
      if (selectedClient?.id === client.id) setSelectedClient(c => c ? { ...c, isActive: false } : c)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const handleActivateWorkspace = async (client: Client) => {
    try {
      await api.clients.activate(client.id)
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, isActive: true } : c))
      if (selectedClient?.id === client.id) setSelectedClient(c => c ? { ...c, isActive: true } : c)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const handleImpersonate = async () => {
    if (!impersonating || !selectedClient) return
    setIsImpersonating(true)
    try {
      await api.auth.impersonate(impersonating.userId, selectedClient.slug)
      // Clear the session cache so the next page does a fresh /me fetch
      // instead of returning the stale super-admin user from the 30s cache.
      dispatch(setUser(null))
      window.location.href = `/${selectedClient.slug}/dashboard`
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to impersonate')
      setIsImpersonating(false)
    }
  }

  const handleRemoveMember = async (member: ClientMember) => {
    if (!confirm(`Remove ${member.name} from this workspace?`)) return
    try {
      await api.memberships.deactivate(member.id)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, isActive: false } : m))
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const planColor: Record<string, string> = {
    enterprise: 'bg-destructive/10 text-destructive border-destructive/20',
    pro:        'bg-warning/10 text-warning border-warning/20',
    starter:    'bg-muted text-muted-foreground border-border',
  }
  const roleColor: Record<string, string> = {
    client_admin:      'bg-warning/10 text-warning border-warning/20',
    qa_lead:           'bg-success/10 text-success border-success/20',
    reviewer:          'bg-primary/10 text-primary border-primary/20',
    annotator:         'bg-muted text-foreground border-border',
    reviewer_annotator:'bg-primary/20 text-primary border-primary/30',
  }

  return (
    <>
      <TopBar title="Workspaces" subtitle="Platform-wide client management" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-destructive text-sm text-center py-12">{error}</div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6">

            {/* ── Left: workspace list ── */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Workspaces {clientSearch ? `(${clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.slug.toLowerCase().includes(clientSearch.toLowerCase())).length}/${clients.length})` : `(${clients.length})`}
                </h2>
                <Button size="sm" className="gap-1.5 text-xs h-7" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5" />New
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                  placeholder="Search by name or slug…" className="h-8 pl-8 text-xs"
                />
              </div>

              {(() => {
                const filtered = clients.filter(c =>
                  !clientSearch ||
                  c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  c.slug.toLowerCase().includes(clientSearch.toLowerCase())
                )
                if (filtered.length === 0) return (
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 text-center text-sm text-muted-foreground">
                      {clientSearch ? 'No workspaces match your search.' : 'No workspaces yet.'}
                    </CardContent>
                  </Card>
                )
                return filtered.map(client => (
                  <Card
                    key={client.id}
                    onClick={() => loadMembers(client)}
                    className={`border-border bg-card cursor-pointer transition-colors hover:border-primary/50 ${selectedClient?.id === client.id ? 'border-primary ring-1 ring-primary/30' : ''}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                            {client.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{client.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${planColor[client.plan]}`}>{client.plan}</Badge>
                          {!client.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Off</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              })()}
            </div>

            {/* ── Right: selected workspace detail ── */}
            <div className="lg:col-span-3">
              {!selectedClient ? (
                <div className="flex items-center justify-center h-64 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  Select a workspace to manage its members
                </div>
              ) : (
                <div className="space-y-4">
                  <Card className="border-border bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground">{selectedClient.name}</h3>
                            <Badge variant="outline" className={`text-[10px] ${planColor[selectedClient.plan]}`}>{selectedClient.plan}</Badge>
                            {!selectedClient.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{selectedClient.slug}</p>
                          {selectedClient.description && <p className="text-xs text-muted-foreground mt-1">{selectedClient.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" asChild>
                            <a href={`/${selectedClient.slug}/login`} target="_blank" rel="noreferrer">
                              <Globe className="h-3 w-3" />Open
                            </a>
                          </Button>
                          {selectedClient.isActive ? (
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-destructive hover:text-destructive" onClick={() => handleDeactivateWorkspace(selectedClient)}>
                              <Trash2 className="h-3 w-3" />Deactivate
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleActivateWorkspace(selectedClient)}>
                              <RefreshCw className="h-3 w-3" />Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Members {memberSearch || memberRoleFilter !== 'all' ? `(${members.filter(m => (!memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())) && (memberRoleFilter === 'all' || m.role === memberRoleFilter)).length}/${members.length})` : `(${members.length})`}</h4>
                    <Button size="sm" className="gap-1.5 text-xs h-7" onClick={() => setShowAddMember(true)}>
                      <UserPlus className="h-3.5 w-3.5" />Add Member
                    </Button>
                  </div>

                  {members.length > 0 && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                          placeholder="Search by name or email…" className="h-8 pl-8 text-xs" />
                      </div>
                      <Select value={memberRoleFilter} onValueChange={setMemberRoleFilter}>
                        <SelectTrigger className="h-8 text-xs w-32 shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="client_admin">Admin</SelectItem>
                          <SelectItem value="qa_lead">QA Lead</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                          <SelectItem value="reviewer_annotator">Rev/Annotator</SelectItem>
                          <SelectItem value="annotator">Annotator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {membersLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Loading members...</p>
                  ) : members.length === 0 ? (
                    <Card className="border-border bg-card">
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        No members yet. Click <strong>Add Member</strong> to onboard users.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {members.filter(m =>
                        (!memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())) &&
                        (memberRoleFilter === 'all' || m.role === memberRoleFilter)
                      ).map(member => (
                        <Card key={member.id} className={`border-border bg-card ${!member.isActive ? 'opacity-50' : ''}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold shrink-0">
                                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium truncate">{member.name}</p>
                                    <Badge variant="outline" className={`text-[10px] ${roleColor[member.role] ?? 'bg-secondary'}`}>{member.role.replace('_', ' ')}</Badge>
                                    {!member.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Removed</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {member.isActive && (
                                  <>
                                    <Button
                                      size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                      title={`Impersonate ${member.name}`}
                                      onClick={() => setImpersonating(member)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                      title="Remove from workspace"
                                      onClick={() => handleRemoveMember(member)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Create workspace dialog ── */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>A new isolated client workspace on the platform.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Workspace Name</Label>
                <Input placeholder="Acme Corp" value={newClient.name}
                  onChange={e => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                    setNewClient(p => ({ ...p, name, slug }))
                  }} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Slug <span className="text-muted-foreground">(URL-safe, auto-filled)</span></Label>
                <Input placeholder="acme-corp" value={newClient.slug}
                  onChange={e => setNewClient(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="mt-1 h-8 text-sm font-mono" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input placeholder="Optional description" value={newClient.description}
                  onChange={e => setNewClient(p => ({ ...p, description: e.target.value }))} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Plan</Label>
                <Select value={newClient.plan} onValueChange={v => setNewClient(p => ({ ...p, plan: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateWorkspace} disabled={isCreating || !newClient.name || !newClient.slug}>
                {isCreating ? 'Creating...' : 'Create Workspace'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Add member dialog ── */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to {selectedClient?.name}</DialogTitle>
              <DialogDescription>The user must already exist in the system. They will receive workspace access with the selected role.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Email Address</Label>
                <Input type="email" placeholder="user@company.com" value={newMember.email}
                  onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={newMember.role} onValueChange={v => setNewMember(p => ({ ...p, role: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annotator">Annotator</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
                    <SelectItem value="reviewer_annotator">Reviewer / Annotator</SelectItem>
                    <SelectItem value="qa_lead">QA Lead</SelectItem>
                    <SelectItem value="client_admin">Workspace Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowAddMember(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddMember} disabled={isAddingMember || !newMember.email}>
                {isAddingMember ? 'Adding...' : 'Add Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Impersonate dialog ── */}
        <Dialog open={!!impersonating} onOpenChange={v => !v && setImpersonating(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Impersonate User</DialogTitle>
              <DialogDescription>
                You will be logged in as <strong>{impersonating?.name}</strong> ({impersonating?.role.replace('_', ' ')}) in workspace <strong>{selectedClient?.name}</strong> for 1 hour.
              </DialogDescription>
            </DialogHeader>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
              Your current super admin session will be replaced. To return, log in again at <code className="font-mono text-xs">/login</code>.
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setImpersonating(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleImpersonate} disabled={isImpersonating}>
                {isImpersonating ? 'Starting...' : `Impersonate ${impersonating?.name}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  )
}

// ─── Client Admin: workspace-scoped management ────────────────────────────────

function ClientAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [workflows, setWorkflows] = useState<WorkflowType[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [userPage, setUserPage] = useState(1)
  const USER_PAGE_SIZE = 15
  const [wfSearch, setWfSearch] = useState('')
  const [wfTypeFilter, setWfTypeFilter] = useState('all')
  const [batchSearch, setBatchSearch] = useState('')
  const [batchStatusFilter, setBatchStatusFilter] = useState('all')

  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'annotator', department: '' })
  const [isCreating, setIsCreating] = useState(false)

  const [showAddMember, setShowAddMember] = useState(false)
  const [addMemberForm, setAddMemberForm] = useState({ email: '', role: 'annotator', department: '' })
  const [isAddingMember, setIsAddingMember] = useState(false)

  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', type: 'agentic-ai' })
  const [isCreatingWF, setIsCreatingWF] = useState(false)

  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [newBatchWorkflowId, setNewBatchWorkflowId] = useState('')
  const [newBatch, setNewBatch] = useState({ title: '', description: '', instructions: '', taskType: 'agentic-ai', priority: '0.8', workloadEstimate: '10', deadline: '' })
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)

  const [badgeUser, setBadgeUser] = useState<User | null>(null)
  const [newBadge, setNewBadge] = useState({ type: 'expertise', name: '', description: '' })

  const [assignWorkflow, setAssignWorkflow] = useState<WorkflowType | null>(null)

  const [importBatch, setImportBatch] = useState<Batch | null>(null)
  const [importText, setImportText] = useState('')
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json')
  const [importMeta, setImportMeta] = useState({ priority: '', difficulty: '', languageTags: '', sla: '', estimatedDuration: '' })
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState<{ created: number; errors: number; errorDetails?: { index: number; error: string }[] } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user && !isClientAdmin(user.role)) { router.push('/dashboard'); return }
    Promise.all([api.users.list(), api.workflows.list(), api.batches.list()])
      .then(([u, w, b]) => { setUsers(u); setWorkflows(w); setBatches(b) })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setIsLoading(false))
  }, [user])

  if (!user || !isClientAdmin(user.role)) return null

  const handleCreateUser = async () => {
    setIsCreating(true)
    try {
      const created = await api.users.create(newUser)
      setUsers(prev => [...prev, created])
      setShowCreateUser(false)
      setNewUser({ name: '', email: '', password: '', role: 'annotator', department: '' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsCreating(false) }
  }

  const handleAddMember = async () => {
    if (!addMemberForm.email) return
    setIsAddingMember(true)
    try {
      await api.memberships.add(addMemberForm)
      const updated = await api.users.list()
      setUsers(updated)
      setShowAddMember(false)
      setAddMemberForm({ email: '', role: 'annotator' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsAddingMember(false) }
  }

  const handleCreateWorkflow = async () => {
    setIsCreatingWF(true)
    try {
      const created = await api.workflows.create(newWorkflow)
      setWorkflows(prev => [...prev, created])
      setShowCreateWorkflow(false)
      setNewWorkflow({ name: '', description: '', type: 'agentic-ai' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsCreatingWF(false) }
  }

  const handleCreateBatch = async () => {
    if (!newBatchWorkflowId) return
    setIsCreatingBatch(true)
    const wf = workflows.find(w => w.id === newBatchWorkflowId)
    try {
      const created = await api.batches.create({
        workflowId: newBatchWorkflowId,
        workflowName: wf?.name ?? '',
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
      setBatches(prev => [...prev, created])
      setShowCreateBatch(false)
      setNewBatch({ title: '', description: '', instructions: '', taskType: 'agentic-ai', priority: '0.8', workloadEstimate: '10', deadline: '' })
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
    finally { setIsCreatingBatch(false) }
  }

  const handleToggleUserStatus = async (u: User) => {
    try {
      const updated = await api.users.update(u.id, { isActive: !u.isActive })
      setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, isActive: updated.isActive } : usr))
    } catch { /* noop */ }
  }

  const handleAwardBadge = async () => {
    if (!badgeUser || !newBadge.name) return
    try {
      const updated = await api.users.awardBadge(badgeUser.id, newBadge)
      setUsers(prev => prev.map(u => u.id === badgeUser.id ? { ...u, badges: updated.badges } : u))
      setBadgeUser(null)
      setNewBadge({ type: 'expertise', name: '', description: '' })
    } catch { /* noop */ }
  }

  const handleRemoveBadge = async (userId: string, badge: { type: string; name: string }) => {
    try {
      const updated = await api.users.removeBadge(userId, badge)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, badges: updated.badges } : u))
    } catch { /* noop */ }
  }

  const handleAssignUser = async (workflowId: string, userId: string) => {
    try {
      const updated = await api.workflows.assign(workflowId, userId)
      setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, assignedUsers: updated.assignedUsers } : w))
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const handleUnassignUser = async (workflowId: string, userId: string) => {
    try {
      const updated = await api.workflows.unassign(workflowId, userId)
      setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, assignedUsers: updated.assignedUsers } : w))
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  const parseCsvToJson = (csv: string): Record<string, unknown>[] => {
    const lines = csv.trim().split('\n').filter(Boolean)
    if (lines.length < 2) throw new Error('CSV needs a header row + at least one data row')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isCsv = file.name.endsWith('.csv')
    setImportFormat(isCsv ? 'csv' : 'json')
    const reader = new FileReader()
    reader.onload = ev => setImportText(ev.target?.result as string ?? '')
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importBatch) return
    setImportError('')
    setImportResult(null)
    let tasks: Record<string, unknown>[]
    try {
      tasks = importFormat === 'csv' ? parseCsvToJson(importText) : JSON.parse(importText)
      if (!Array.isArray(tasks)) throw new Error('Must be a JSON array')
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Parse error')
      return
    }
    setIsImporting(true)
    const metadata: Record<string, unknown> = {}
    if (importMeta.priority) metadata.priority = parseFloat(importMeta.priority)
    if (importMeta.difficulty) metadata.difficulty = importMeta.difficulty
    if (importMeta.estimatedDuration) metadata.estimatedDuration = parseInt(importMeta.estimatedDuration)
    if (importMeta.sla) metadata.sla = importMeta.sla
    if (importMeta.languageTags) metadata.languageTags = importMeta.languageTags
    try {
      const result = await api.tasks.bulkImport(importBatch.id, tasks, metadata)
      setImportResult({ created: result.created, errors: result.errors, errorDetails: result.errorDetails })
      const updated = await api.batches.list()
      setBatches(updated)
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally { setIsImporting(false) }
  }

  const badgeTypeColors: Record<string, string> = {
    role:      'bg-primary/10 text-primary border-primary/20',
    expertise: 'bg-success/10 text-success border-success/20',
    level:     'bg-warning/10 text-warning border-warning/20',
  }

  const toggleExpand = (id: string) => {
    setExpandedWorkflows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const batchesByWorkflow = batches.reduce<Record<string, Batch[]>>((acc, b) => {
    const key = b.workflowId
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})

  return (
    <>
      <TopBar title="Admin Panel" subtitle="Manage users, workflows, batches, and task pipelines" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <Tabs defaultValue="workflows" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-1.5 text-xs"><Workflow className="h-3.5 w-3.5" />Workflows</TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-1.5 text-xs"><ListTodo className="h-3.5 w-3.5" />Batches & Tasks</TabsTrigger>
          </TabsList>

          {/* ── Users ── */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {userSearch || userRoleFilter !== 'all'
                  ? `${users.filter(u => (!userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())) && (userRoleFilter === 'all' || u.role === userRoleFilter)).length} / ${users.length} users`
                  : `${users.length} total users`}
              </h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setShowAddMember(true)}>
                  <UserCheck className="h-3.5 w-3.5" />Add Member
                </Button>
                <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreateUser(true)}>
                  <UserPlus className="h-3.5 w-3.5" />Create User
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
                  placeholder="Search by name or email…" className="h-8 pl-8 text-xs" />
              </div>
              <Select value={userRoleFilter} onValueChange={v => { setUserRoleFilter(v); setUserPage(1) }}>
                <SelectTrigger className="h-8 text-xs w-36 shrink-0"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="annotator">Annotator</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="reviewer_annotator">Rev / Annotator</SelectItem>
                  <SelectItem value="qa_lead">QA Lead</SelectItem>
                  <SelectItem value="client_admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
              : error ? <div className="text-destructive text-sm text-center py-12">{error}</div>
              : (() => {
                const filtered = users.filter(u =>
                  (!userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())) &&
                  (userRoleFilter === 'all' || u.role === userRoleFilter)
                )
                const pagedUsers = filtered.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE)
                return filtered.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No users match the current filter.</div>
                ) : (
                <div className="space-y-3">
                  {pagedUsers.map(u => (
                    <Card key={u.id} className="border-border bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-medium shrink-0">
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-sm">{u.name}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
                              {!u.isActive && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">Inactive</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{u.email}</p>
                            {u.badges && u.badges.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {u.badges.map((badge, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <Badge variant="outline" className={`text-[10px] ${badgeTypeColors[badge.type] || ''}`}>{badge.name}</Badge>
                                    <button onClick={() => handleRemoveBadge(u.id, badge)} className="text-muted-foreground hover:text-destructive">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setBadgeUser(u)}>
                              <Award className="h-3.5 w-3.5" />Badge
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleToggleUserStatus(u)}>
                              {u.isActive ? <><X className="h-3.5 w-3.5" />Deactivate</> : <><Check className="h-3.5 w-3.5" />Activate</>}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <PaginationBar page={userPage} total={filtered.length} pageSize={USER_PAGE_SIZE} onPage={setUserPage} />
                </div>
                )
              })()}
          </TabsContent>

          {/* ── Workflows ── */}
          <TabsContent value="workflows" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {wfSearch || wfTypeFilter !== 'all'
                  ? `${workflows.filter(w => (!wfSearch || w.name.toLowerCase().includes(wfSearch.toLowerCase())) && (wfTypeFilter === 'all' || w.type === wfTypeFilter)).length} / ${workflows.length} workflows`
                  : `${workflows.length} workflows`}
              </h3>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreateWorkflow(true)}>
                <Plus className="h-3.5 w-3.5" />Create Workflow
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input value={wfSearch} onChange={e => setWfSearch(e.target.value)}
                  placeholder="Search by name…" className="h-8 pl-8 text-xs" />
              </div>
              <Select value={wfTypeFilter} onValueChange={setWfTypeFilter}>
                <SelectTrigger className="h-8 text-xs w-40 shrink-0"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {workflows.filter(w =>
              (!wfSearch || w.name.toLowerCase().includes(wfSearch.toLowerCase())) &&
              (wfTypeFilter === 'all' || w.type === wfTypeFilter)
            ).length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">No workflows match the current filter.</div>
            )}
            <div className="space-y-3">
              {workflows.filter(w =>
                (!wfSearch || w.name.toLowerCase().includes(wfSearch.toLowerCase())) &&
                (wfTypeFilter === 'all' || w.type === wfTypeFilter)
              ).map(w => {
                const assigned = (w.assignedUsers || []) as string[]
                const assignedObjs = users.filter(u => assigned.includes(u.id))
                return (
                  <Card key={w.id} className="border-border bg-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm">{w.name}</span>
                            <Badge variant="outline" className="text-[10px]">{w.type}</Badge>
                            <Badge variant="outline" className="text-[10px]">{w.batchCount} batch{w.batchCount !== 1 ? 'es' : ''}</Badge>
                            <Badge variant="outline" className="text-[10px]">{w.taskCount} tasks</Badge>
                            {!w.isActive && <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{w.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAssignWorkflow(w)}>
                            <Users className="h-3.5 w-3.5 mr-1" />Assign
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                            <Link href={`/dashboard/workflows/${w.id}`}><ExternalLink className="h-3.5 w-3.5 mr-1" />Manage</Link>
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() =>
                            api.workflows.update(w.id, { isActive: !w.isActive })
                              .then(upd => setWorkflows(prev => prev.map(wf => wf.id === w.id ? { ...wf, isActive: upd.isActive } : wf)))
                          }>
                            {w.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                      {assignedObjs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedObjs.map(u => (
                            <div key={u.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                              <span className="text-[10px] text-primary">{u.name}</span>
                              <button onClick={() => handleUnassignUser(w.id, u.id)} className="text-primary/60 hover:text-destructive">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {assignedObjs.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">No users assigned — not visible to annotators or reviewers</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* ── Batches & Tasks ── */}
          <TabsContent value="batches" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {batches.length} batches · {batches.reduce((s, b) => s + b.tasksTotal, 0)} tasks total
              </h3>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setNewBatchWorkflowId(workflows[0]?.id ?? ''); setShowCreateBatch(true) }}>
                <Plus className="h-3.5 w-3.5" />New Batch
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input value={batchSearch} onChange={e => setBatchSearch(e.target.value)}
                  placeholder="Search batches…" className="h-8 pl-8 text-xs" />
              </div>
              <Select value={batchStatusFilter} onValueChange={setBatchStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-36 shrink-0"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="pending-review">Pending Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
              : error ? <div className="text-destructive text-sm text-center py-12">{error}</div>
              : workflows.length === 0 ? (
                <Card className="border-border bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
                    <p className="text-muted-foreground text-sm">No workflows yet. Create one first.</p>
                    <Button size="sm" onClick={() => setShowCreateWorkflow(true)}><Plus className="h-4 w-4 mr-1" />Create Workflow</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {workflows.map(wf => {
                    const allWfBatches = batchesByWorkflow[wf.id] ?? []
                    const wfBatches = allWfBatches.filter(b =>
                      (!batchSearch || b.title.toLowerCase().includes(batchSearch.toLowerCase())) &&
                      (batchStatusFilter === 'all' || b.status === batchStatusFilter)
                    )
                    if ((batchSearch || batchStatusFilter !== 'all') && wfBatches.length === 0) return null
                    const expanded = expandedWorkflows.has(wf.id)
                    const totalTasks    = allWfBatches.reduce((s, b) => s + b.tasksTotal, 0)
                    const completedTasks = allWfBatches.reduce((s, b) => s + b.tasksCompleted, 0)
                    return (
                      <Card key={wf.id} className="border-border bg-card">
                        <button className="w-full text-left" onClick={() => toggleExpand(wf.id)}>
                          <div className="flex items-center gap-3 p-4">
                            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{wf.name}</span>
                                <Badge variant="outline" className="text-[10px]">{wf.type}</Badge>
                                {!wf.isActive && <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Inactive</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                              <span>
                                {(batchSearch || batchStatusFilter !== 'all') && wfBatches.length !== allWfBatches.length
                                  ? `${wfBatches.length}/${allWfBatches.length} batches`
                                  : `${allWfBatches.length} batch${allWfBatches.length !== 1 ? 'es' : ''}`}
                              </span>
                              <span>{completedTasks}/{totalTasks} tasks</span>
                            </div>
                          </div>
                        </button>

                        {expanded && (
                          <div className="border-t border-border">
                            {wfBatches.length === 0 ? (
                              <div className="px-4 py-3 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">No batches yet</p>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                  onClick={() => { setNewBatchWorkflowId(wf.id); setShowCreateBatch(true) }}>
                                  <Plus className="h-3.5 w-3.5" />Add Batch
                                </Button>
                              </div>
                            ) : (
                              <>
                                {wfBatches.map((batch, i) => {
                                  const pct = batch.tasksTotal > 0 ? Math.round((batch.tasksCompleted / batch.tasksTotal) * 100) : 0
                                  return (
                                    <div key={batch.id} className={`px-4 py-3 ${i < wfBatches.length - 1 ? 'border-b border-border' : ''}`}>
                                      <div className="flex items-center gap-3">
                                        <div className="w-3 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-sm font-medium">{batch.title}</span>
                                            <Badge variant="outline" className="text-[10px]">{batch.taskType}</Badge>
                                            {batch.deadline && (
                                              <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
                                                Due {new Date(batch.deadline).toLocaleDateString()}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>{batch.tasksCompleted}/{batch.tasksTotal} completed</span>
                                            <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-secondary overflow-hidden">
                                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span>{pct}%</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                            onClick={() => { setImportBatch(batch); setImportText(''); setImportFormat('json'); setImportMeta({ priority: '', difficulty: '', languageTags: '', sla: '', estimatedDuration: '' }); setImportResult(null) }}>
                                            <Upload className="h-3.5 w-3.5" />Import Tasks
                                          </Button>
                                          <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                                            <Link href={`/dashboard/workflows/${wf.id}`}><ExternalLink className="h-3.5 w-3.5" /></Link>
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                <div className="px-4 py-2 border-t border-border/50">
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                    onClick={() => { setNewBatchWorkflowId(wf.id); setShowCreateBatch(true) }}>
                                    <Plus className="h-3.5 w-3.5" />Add Batch
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
          </TabsContent>

        </Tabs>
      </main>

      {/* ── Add Existing Member ── */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add an existing LabelForge user to this workspace by their email address.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Email Address</Label>
              <Input type="email" placeholder="name@labelforge.ai" value={addMemberForm.email}
                onChange={e => setAddMemberForm(p => ({ ...p, email: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Role</Label>
              <Select value={addMemberForm.role} onValueChange={v => setAddMemberForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annotator">Annotator — labels and completes tasks</SelectItem>
                  <SelectItem value="reviewer">Reviewer — reviews annotator submissions</SelectItem>
                  <SelectItem value="reviewer_annotator">Reviewer / Annotator — handles both</SelectItem>
                  <SelectItem value="qa_lead">QA Lead — oversees quality and reviews</SelectItem>
                  <SelectItem value="client_admin">Admin — manages workspace and team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Department (optional)</Label>
              <Input placeholder="e.g. Annotation Team" value={addMemberForm.department}
                onChange={(e: { target: { value: string } }) => setAddMemberForm((p: typeof addMemberForm) => ({ ...p, department: e.target.value }))} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={isAddingMember || !addMemberForm.email}>
              {isAddingMember ? 'Adding...' : 'Add to Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create User ── */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle><DialogDescription>Add a new team member</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs mb-1 block">Full Name</Label><Input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Password</Label><Input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Role</Label>
              <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annotator">Annotator</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="reviewer_annotator">Reviewer / Annotator</SelectItem>
                  <SelectItem value="qa_lead">QA Lead</SelectItem>
                  <SelectItem value="client_admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1 block">Department (optional)</Label><Input value={newUser.department} onChange={e => setNewUser(p => ({ ...p, department: e.target.value }))} className="h-9" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUser(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>{isCreating ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Workflow ── */}
      <Dialog open={showCreateWorkflow} onOpenChange={setShowCreateWorkflow}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Workflow</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs mb-1 block">Name</Label><Input value={newWorkflow.name} onChange={e => setNewWorkflow(p => ({ ...p, name: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Description</Label><Textarea value={newWorkflow.description} onChange={e => setNewWorkflow(p => ({ ...p, description: e.target.value }))} className="min-h-[80px]" /></div>
            <div><Label className="text-xs mb-1 block">Type</Label>
              <Select value={newWorkflow.type} onValueChange={v => setNewWorkflow(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWorkflow(false)}>Cancel</Button>
            <Button onClick={handleCreateWorkflow} disabled={isCreatingWF}>{isCreatingWF ? 'Creating...' : 'Create Workflow'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Batch ── */}
      <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Batch</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div><Label className="text-xs mb-1 block">Workflow *</Label>
              <Select value={newBatchWorkflowId} onValueChange={setNewBatchWorkflowId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select workflow..." /></SelectTrigger>
                <SelectContent>{workflows.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1 block">Title *</Label><Input value={newBatch.title} onChange={e => setNewBatch(p => ({ ...p, title: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Description</Label><Textarea value={newBatch.description} onChange={e => setNewBatch(p => ({ ...p, description: e.target.value }))} className="min-h-[60px]" /></div>
            <div><Label className="text-xs mb-1 block">Annotator Instructions</Label>
              <Textarea value={newBatch.instructions} onChange={e => setNewBatch(p => ({ ...p, instructions: e.target.value }))} className="min-h-[80px]" placeholder="Step-by-step instructions shown to annotators..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1 block">Task Type</Label>
                <Select value={newBatch.taskType} onValueChange={v => setNewBatch(p => ({ ...p, taskType: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs mb-1 block">Priority (0–1)</Label>
                <Input type="number" min="0" max="1" step="0.1" value={newBatch.priority} onChange={e => setNewBatch(p => ({ ...p, priority: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1 block">Est. Hours</Label>
                <Input type="number" value={newBatch.workloadEstimate} onChange={e => setNewBatch(p => ({ ...p, workloadEstimate: e.target.value }))} className="h-9" />
              </div>
              <div><Label className="text-xs mb-1 block">Deadline (optional)</Label>
                <Input type="date" value={newBatch.deadline} onChange={e => setNewBatch(p => ({ ...p, deadline: e.target.value }))} className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBatch(false)}>Cancel</Button>
            <Button onClick={handleCreateBatch} disabled={isCreatingBatch || !newBatch.title || !newBatchWorkflowId}>
              {isCreatingBatch ? 'Creating...' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Task Import Pipeline ── */}
      <Dialog open={!!importBatch} onOpenChange={open => { if (!open) { setImportBatch(null); setImportText(''); setImportResult(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Task Import Pipeline</DialogTitle>
            <DialogDescription>Import tasks into <strong>{importBatch?.title}</strong> via JSON or CSV</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {(['json', 'csv'] as const).map(f => (
                  <Button key={f} size="sm" variant={importFormat === f ? 'default' : 'outline'} className="h-7 text-xs uppercase gap-1"
                    onClick={() => { setImportFormat(f); setImportText('') }}>
                    {f === 'json' ? <FileJson className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}{f}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 ml-auto" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />Upload File
              </Button>
              <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFileSelect} />
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                {importFormat === 'json' ? 'JSON array — one object per task:' : 'CSV — first row is headers:'}
              </p>
              {importFormat === 'json' ? (
                <code className="block whitespace-pre font-mono">{`[ { "title": "...", "externalUrl": "https://...", "estimatedDuration": 30 }, ... ]`}</code>
              ) : (
                <>
                  <code className="block font-mono">title,externalUrl,estimatedDuration,description</code>
                  <code className="block font-mono">Navigate Amazon,https://www.amazon.com,30,Search for headphones</code>
                </>
              )}
              <p className="text-[10px] pt-1">Per-task fields override global metadata. Supported: title, externalUrl, description, estimatedDuration, priority, difficulty, languageTags</p>
            </div>

            <Textarea value={importText} onChange={e => { setImportText(e.target.value); setImportError(''); setImportResult(null) }}
              className="min-h-[150px] font-mono text-xs bg-secondary/30"
              placeholder={importFormat === 'json' ? '[{"title":"...","externalUrl":"https://..."}]' : 'title,externalUrl\nTask 1,https://example.com'} />

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Global Metadata <span className="text-muted-foreground font-normal">(applied to all tasks unless overridden per-task)</span></p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label className="text-[10px] mb-1 block">Priority (0–1)</Label>
                  <Input type="number" min="0" max="1" step="0.1" placeholder="Batch default" value={importMeta.priority}
                    onChange={e => setImportMeta(p => ({ ...p, priority: e.target.value }))} className="h-8 text-xs bg-secondary/30" /></div>
                <div><Label className="text-[10px] mb-1 block">Difficulty</Label>
                  <Select value={importMeta.difficulty || 'none'} onValueChange={v => setImportMeta(p => ({ ...p, difficulty: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="h-8 text-xs bg-secondary/30"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px] mb-1 block">Est. Duration (min)</Label>
                  <Input type="number" placeholder="30" value={importMeta.estimatedDuration}
                    onChange={e => setImportMeta(p => ({ ...p, estimatedDuration: e.target.value }))} className="h-8 text-xs bg-secondary/30" /></div>
                <div><Label className="text-[10px] mb-1 block">Language Tags (comma-sep)</Label>
                  <Input placeholder="en, es, fr" value={importMeta.languageTags}
                    onChange={e => setImportMeta(p => ({ ...p, languageTags: e.target.value }))} className="h-8 text-xs bg-secondary/30" /></div>
                <div><Label className="text-[10px] mb-1 block">SLA Deadline</Label>
                  <Input type="date" value={importMeta.sla}
                    onChange={e => setImportMeta(p => ({ ...p, sla: e.target.value }))} className="h-8 text-xs bg-secondary/30" /></div>
              </div>
            </div>

            {importError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">{importError}</p>
              </div>
            )}
            {importResult && (
              <div className={`space-y-2 p-3 rounded-lg border ${importResult.errors === 0 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
                <div className="flex items-center gap-2">
                  <Check className={`h-4 w-4 shrink-0 ${importResult.errors === 0 ? 'text-success' : 'text-warning'}`} />
                  <p className={`text-xs font-medium ${importResult.errors === 0 ? 'text-success' : 'text-warning'}`}>
                    {importResult.created} task{importResult.created !== 1 ? 's' : ''} imported successfully
                    {importResult.errors > 0 && ` · ${importResult.errors} row${importResult.errors !== 1 ? 's' : ''} failed`}
                  </p>
                </div>
                {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                  <ul className="text-xs text-warning space-y-0.5 pl-6 list-disc">
                    {importResult.errorDetails.map(e => (
                      <li key={e.index}>Row {e.index + 1}: {e.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {importResult ? (
              <>
                <Button variant="outline" onClick={() => { setImportResult(null); setImportText('') }}>
                  Import More
                </Button>
                <Button onClick={() => { setImportBatch(null); setImportText(''); setImportResult(null) }}>
                  <Check className="h-4 w-4 mr-2" />Done
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setImportBatch(null); setImportText(''); setImportResult(null) }}>Cancel</Button>
                <Button onClick={handleImport} disabled={isImporting || !importText.trim()}>
                  <Upload className="h-4 w-4 mr-2" />{isImporting ? 'Importing…' : 'Import Tasks'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Users ── */}
      <Dialog open={!!assignWorkflow} onOpenChange={open => { if (!open) setAssignWorkflow(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Users</DialogTitle>
            <DialogDescription>Control who can see "{assignWorkflow?.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {users.filter((u: User) => u.role === 'annotator' || u.role === 'reviewer' || u.role === 'reviewer_annotator').map((u: User) => {
              const isAssigned = ((assignWorkflow?.assignedUsers || []) as string[]).includes(u.id)
              return (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · {u.role}</p>
                  </div>
                  <Button size="sm" variant={isAssigned ? 'destructive' : 'outline'} className="h-7 text-xs"
                    onClick={() => assignWorkflow && (isAssigned ? handleUnassignUser(assignWorkflow.id, u.id) : handleAssignUser(assignWorkflow.id, u.id))}>
                    {isAssigned ? <><X className="h-3.5 w-3.5 mr-1" />Remove</> : <><Check className="h-3.5 w-3.5 mr-1" />Assign</>}
                  </Button>
                </div>
              )
            })}
            {users.filter((u: User) => u.role === 'annotator' || u.role === 'reviewer' || u.role === 'reviewer_annotator').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No annotators or reviewers yet</p>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAssignWorkflow(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Award Badge ── */}
      <Dialog open={!!badgeUser} onOpenChange={open => { if (!open) setBadgeUser(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Award Badge</DialogTitle><DialogDescription>Award a badge to {badgeUser?.name}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs mb-1 block">Badge Type</Label>
              <Select value={newBadge.type} onValueChange={v => setNewBadge(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="expertise">Expertise</SelectItem>
                  <SelectItem value="level">Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1 block">Badge Name</Label>
              <Input value={newBadge.name} onChange={e => setNewBadge(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Agentic AI Specialist" className="h-9" /></div>
            <div><Label className="text-xs mb-1 block">Description</Label>
              <Input value={newBadge.description} onChange={e => setNewBadge(p => ({ ...p, description: e.target.value }))} className="h-9" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBadgeUser(null)}>Cancel</Button>
            <Button onClick={handleAwardBadge} disabled={!newBadge.name}>Award Badge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
