import mongoose, { Schema, Document, Model } from 'mongoose'

export type TaskStatus =
  | 'unclaimed' | 'in-progress' | 'paused' | 'submitted'
  | 'approved' | 'rejected' | 'revision-requested' | 'escalated' | 'data-ready'

export type ErrorTagStatus = 'open' | 'resolved'

export interface IErrorTag {
  tagId: string
  severity: 'major' | 'minor'
  category: string
  message: string
  stepReference?: string
  scoreDeduction: number
  status: ErrorTagStatus
  createdBy: string
  createdByEmail: string
  resolvedBy?: string
  resolvedAt?: Date
}

export interface IActivityEntry {
  action: string
  userId: string
  userEmail: string
  comment?: string
  timestamp: Date
}

export interface ISubtask {
  id: string
  title: string
  description?: string
  completed?: boolean
}

export interface ITask extends Document {
  tenantId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  batchId: mongoose.Types.ObjectId
  batchTitle: string
  workflowId: mongoose.Types.ObjectId
  workflowName: string
  title: string
  description: string
  taskType: string
  status: TaskStatus
  isLocked: boolean
  priority: number
  difficulty?: 'easy' | 'medium' | 'hard'
  languageTags?: string[]
  sla?: Date
  externalUrl?: string
  estimatedDuration: number
  actualDuration?: number
  annotatorId?: mongoose.Types.ObjectId
  annotatorEmail?: string
  reviewerId?: mongoose.Types.ObjectId
  reviewerEmail?: string
  feedback?: string
  qualityScore?: number
  notes?: string
  objective?: string
  successCriteria?: string[]
  expectedOutput?: Record<string, unknown>
  subtasks?: ISubtask[]
  submissionData?: Record<string, unknown>
  screenshots?: string[]
  extensionData?: Record<string, unknown>
  errorTags: IErrorTag[]
  activityLog: IActivityEntry[]
  startedAt?: Date
  completedAt?: Date
  submittedAt?: Date
  signedOffAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ErrorTagSchema = new Schema<IErrorTag>(
  {
    tagId: { type: String, required: true },
    severity: { type: String, enum: ['major', 'minor'], required: true },
    category: { type: String, required: true },
    message: { type: String, required: true },
    stepReference: { type: String },
    scoreDeduction: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    createdBy: { type: String, required: true },
    createdByEmail: { type: String, required: true },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
  },
  { _id: false }
)

const ActivityEntrySchema = new Schema<IActivityEntry>(
  {
    action: { type: String, required: true },
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    comment: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

const SubtaskSchema = new Schema<ISubtask>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
)

const TaskSchema = new Schema<ITask>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    batchTitle: { type: String, required: true },
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    workflowName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    taskType: { type: String, required: true },
    status: {
      type: String,
      enum: ['unclaimed', 'in-progress', 'paused', 'submitted', 'in-review', 'approved', 'rejected', 'revision-requested', 'escalated', 'data-ready'],
      default: 'unclaimed',
    },
    isLocked: { type: Boolean, default: false },
    priority: { type: Number, default: 0.5 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    languageTags: [{ type: String }],
    sla: { type: Date },
    externalUrl: { type: String },
    estimatedDuration: { type: Number, default: 30 },
    actualDuration: { type: Number },
    annotatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    annotatorEmail: { type: String },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewerEmail: { type: String },
    feedback: { type: String },
    qualityScore: { type: Number },
    notes: { type: String },
    objective: { type: String },
    successCriteria: [{ type: String }],
    expectedOutput: { type: Schema.Types.Mixed },
    subtasks: { type: [SubtaskSchema], default: undefined },
    submissionData: { type: Schema.Types.Mixed },
    screenshots: [{ type: String }],
    extensionData: { type: Schema.Types.Mixed },
    errorTags: { type: [ErrorTagSchema], default: [] },
    activityLog: { type: [ActivityEntrySchema], default: [] },
    startedAt: { type: Date },
    completedAt: { type: Date },
    submittedAt: { type: Date },
    signedOffAt: { type: Date },
  },
  { timestamps: true }
)

TaskSchema.index({ tenantId: 1 })
TaskSchema.index({ tenantId: 1, projectId: 1 })
TaskSchema.index({ tenantId: 1, status: 1 })
TaskSchema.index({ tenantId: 1, annotatorId: 1 })

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema)
export default Task
