// ─── Roles ────────────────────────────────────────────────────────────────────
// "tenant" is an internal concept only. In the UI always use "client", "workspace", or "project".
export type UserRole = 'super_admin' | 'client_admin' | 'qa_lead' | 'reviewer' | 'annotator' | 'reviewer_annotator'

export function isSuperAdmin(role: UserRole) { return role === 'super_admin' }
export function isClientAdmin(role: UserRole) { return role === 'client_admin' || role === 'super_admin' }
export function isQaOrAbove(role: UserRole)   { return role === 'qa_lead' || isClientAdmin(role) }
export function isReviewerOrAbove(role: UserRole) { return role === 'reviewer' || role === 'reviewer_annotator' || isQaOrAbove(role) }
export function isFieldWorker(role: UserRole) { return role === 'annotator' || role === 'reviewer' || role === 'reviewer_annotator' }

// ─── Workflow / Task types ─────────────────────────────────────────────────────
export type WorkflowType =
  | 'agentic-ai' | 'llm-training' | 'multimodal' | 'evaluation'
  | 'benchmarking' | 'preference-ranking' | 'red-teaming' | 'data-collection'

export type TaskType = WorkflowType

export type WorkflowStage = 'annotation' | 'review' | 'qa'

export type BatchStatus = 'available' | 'in-progress' | 'completed' | 'pending-review'

export type TaskStatus =
  | 'unclaimed' | 'in-progress' | 'paused' | 'submitted' | 'in-review'
  | 'approved' | 'rejected' | 'revision-requested' | 'escalated' | 'data-ready'

// ─── Client / Tenant ──────────────────────────────────────────────────────────
export type ClientPlan = 'starter' | 'pro' | 'enterprise'

/** Internal: a "tenant". In the UI this is called a "client" or "workspace". */
export interface Client {
  id: string
  name: string
  /** URL-safe identifier, e.g. "acme-corp". Used in /[clientSlug]/... routing. */
  slug: string
  description?: string
  logoUrl?: string
  isActive: boolean
  plan: ClientPlan
  settings?: Record<string, unknown>
  createdAt: string
}

// ─── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string
  tenantId: string
  name: string
  description?: string
  /** Markdown guidelines shown to annotators */
  guidelines?: string
  taskTypes: WorkflowType[]
  workflowStages: WorkflowStage[]
  isActive: boolean
  createdAt: string
}

// ─── Membership ───────────────────────────────────────────────────────────────
/** Maps a user to a client workspace with a specific role within that workspace. */
export interface ClientMembership {
  id: string
  userId: string
  tenantId: string
  role: UserRole
  isActive: boolean
  joinedAt: string
}

// ─── Error tags ───────────────────────────────────────────────────────────────
export type ErrorSeverity = 'major' | 'minor'

export const MAJOR_ERROR_CATEGORIES = [
  { value: 'task-not-completed',    label: 'Task Not Completed Correctly' },
  { value: 'logical-inconsistency', label: 'Logical Inconsistency in Steps' },
  { value: 'missing-critical-step', label: 'Missing Critical Steps' },
  { value: 'fabricated-results',    label: 'Fabricated or Unsupported Results' },
  { value: 'wrong-navigation',      label: 'Completely Wrong Navigation Path' },
  { value: 'invalid-data-capture',  label: 'Missing or Invalid Data Capture' },
  { value: 'instruction-violation', label: 'Failure to Follow Instructions' },
] as const

export const MINOR_ERROR_CATEGORIES = [
  { value: 'inefficient-workflow',    label: 'Inefficient Workflow' },
  { value: 'poor-clarity',           label: 'Poor Clarity in Reasoning' },
  { value: 'missing-minor-context',  label: 'Missing Minor Context' },
  { value: 'timing-irregularity',    label: 'Timing Irregularity' },
  { value: 'mislabeling',            label: 'Mislabeling of Actions' },
  { value: 'low-quality-screenshot', label: 'Low-Quality Screenshots' },
] as const

export type MajorErrorCategory = typeof MAJOR_ERROR_CATEGORIES[number]['value']
export type MinorErrorCategory = typeof MINOR_ERROR_CATEGORIES[number]['value']
export type ErrorCategory = MajorErrorCategory | MinorErrorCategory

export const ERROR_CATEGORIES: Record<ErrorSeverity, readonly { value: string; label: string }[]> = {
  major: MAJOR_ERROR_CATEGORIES,
  minor: MINOR_ERROR_CATEGORIES,
}

export interface ErrorTag {
  tagId: string
  severity: ErrorSeverity
  category: ErrorCategory
  message: string
  stepReference?: string
  scoreDeduction: number
  status: 'open' | 'resolved'
  createdBy: string
  createdByEmail: string
  resolvedBy?: string
  resolvedAt?: string
}

export interface ActivityEntry {
  action: string
  userId: string
  userEmail: string
  comment?: string
  timestamp: string
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export type BadgeType = 'role' | 'expertise' | 'level'

export interface Badge {
  type: BadgeType
  name: string
  description: string
  awardedAt: string
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  /** System-level role. super_admin bypasses all client scoping. */
  role: UserRole
  /** Active client context (tenantId). Absent for super_admin acting globally. */
  tenantId?: string
  department?: string
  isActive?: boolean
  badges?: Badge[]
  createdAt?: string
}

// ─── Workflow ─────────────────────────────────────────────────────────────────
export interface Workflow {
  id: string
  tenantId: string
  projectId?: string
  name: string
  description: string
  type: WorkflowType
  isActive: boolean
  assignedUsers?: string[]
  batchCount: number
  taskCount: number
  createdAt: string
}

// ─── Batch ────────────────────────────────────────────────────────────────────
export interface Batch {
  id: string
  tenantId: string
  projectId?: string
  workflowId: string
  workflowName: string
  title: string
  description: string
  instructions?: string
  taskType: TaskType
  priority: number
  workloadEstimate: number
  status: BatchStatus
  tasksTotal: number
  tasksCompleted: number
  deadline?: string
  createdAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export interface TaskSubtask {
  id: string
  title: string
  description?: string
  completed?: boolean
}

export interface Task {
  id: string
  tenantId: string
  projectId?: string
  batchId: string
  batchTitle: string
  workflowId: string
  workflowName: string
  title: string
  description: string
  taskType: TaskType
  status: TaskStatus
  isLocked?: boolean
  priority: number
  difficulty?: 'easy' | 'medium' | 'hard'
  languageTags?: string[]
  sla?: string
  externalUrl?: string
  estimatedDuration: number
  actualDuration?: number
  annotatorId?: string
  annotatorEmail?: string
  reviewerId?: string
  reviewerEmail?: string
  feedback?: string
  qualityScore?: number
  notes?: string
  objective?: string
  successCriteria?: string[]
  expectedOutput?: Record<string, unknown>
  subtasks?: TaskSubtask[]
  submissionData?: Record<string, unknown>
  extensionData?: Record<string, unknown>
  screenshots?: string[]
  errorTags?: ErrorTag[]
  activityLog?: ActivityEntry[]
  startedAt?: string
  completedAt?: string
  submittedAt?: string
  signedOffAt?: string
  createdAt?: string
  review?: TaskReview | null
}

export interface TaskReview {
  id: string
  status: string
  decision?: string
  comments?: string
  qualityScore?: number
  criteriaScores?: { accuracy: number; completeness: number; adherence: number }
  reviewerName?: string
  reviewedAt?: string
}

// ─── Review ───────────────────────────────────────────────────────────────────
export interface Review {
  id: string
  tenantId: string
  projectId?: string
  taskId: string
  taskTitle: string
  batchId: string
  batchTitle: string
  workflowId?: string
  annotatorId: string
  annotatorEmail: string
  annotatorName: string
  reviewerId?: string
  reviewerEmail?: string
  reviewerName?: string
  status: 'pending' | 'in-review' | 'approved' | 'rejected' | 'revision-requested' | 'escalated' | 'on-hold' | 'flagged' | 'data-ready'
  decision?: 'approve' | 'reject' | 'request-rework' | 'escalate' | 'hold' | 'flag'
  comments?: string
  reasonCode?: string
  qualityScore?: number
  criteriaScores?: { accuracy: number; completeness: number; adherence: number }
  submittedAt: string
  reviewedAt?: string
  errorTags?: ErrorTag[]
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  tenantId?: string
  userId?: string
  type: 'batch-assigned' | 'task-approved' | 'task-rejected' | 'review-needed' | 'priority-warning' | 'system' | 'escalation' | 'deadline'
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt: string
}

// ─── Priority helpers ─────────────────────────────────────────────────────────
export type Priority = number

export function priorityToLabel(priority: Priority): string {
  if (priority >= 0.9) return 'P0'
  if (priority >= 0.7) return 'P1'
  if (priority >= 0.5) return 'P2'
  if (priority >= 0.3) return 'P3'
  return 'P4'
}

export function priorityToColor(priority: Priority): string {
  if (priority >= 0.9) return 'bg-destructive text-destructive-foreground'
  if (priority >= 0.7) return 'bg-orange-500 text-white'
  if (priority >= 0.5) return 'bg-yellow-500 text-black'
  if (priority >= 0.3) return 'bg-blue-500 text-white'
  return 'bg-muted text-muted-foreground'
}
