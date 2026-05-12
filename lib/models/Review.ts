import mongoose, { Schema, Document, Model } from 'mongoose'

export type ReviewStatus = 'pending' | 'in-review' | 'approved' | 'rejected' | 'revision-requested' | 'escalated' | 'on-hold' | 'flagged'
export type ReviewDecision = 'approve' | 'reject' | 'request-rework' | 'escalate' | 'hold' | 'flag'

interface IErrorTag {
  tagId: string
  severity: 'major' | 'minor'
  category: string
  message: string
  stepReference?: string
  scoreDeduction: number
  status: 'open' | 'resolved'
  createdBy: string
  createdByEmail: string
  resolvedBy?: string
  resolvedAt?: Date
}

export interface IReview extends Document {
  tenantId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  taskId: mongoose.Types.ObjectId
  taskTitle: string
  batchId: mongoose.Types.ObjectId
  batchTitle: string
  workflowId: mongoose.Types.ObjectId
  annotatorId: mongoose.Types.ObjectId
  annotatorEmail: string
  annotatorName: string
  reviewerId?: mongoose.Types.ObjectId
  reviewerEmail?: string
  reviewerName?: string
  status: ReviewStatus
  decision?: ReviewDecision
  comments?: string
  reasonCode?: string
  qualityScore?: number
  criteriaScores?: {
    accuracy: number
    completeness: number
    adherence: number
  }
  errorTags?: IErrorTag[]
  submittedAt: Date
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    taskTitle: { type: String, required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    batchTitle: { type: String, required: true },
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    annotatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    annotatorEmail: { type: String, required: true },
    annotatorName: { type: String, required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewerEmail: { type: String },
    reviewerName: { type: String },
    status: {
      type: String,
      enum: ['pending', 'in-review', 'approved', 'rejected', 'revision-requested', 'escalated', 'on-hold', 'flagged'],
      default: 'pending',
    },
    decision: { type: String, enum: ['approve', 'reject', 'request-rework', 'escalate', 'hold', 'flag'] },
    comments: { type: String },
    reasonCode: { type: String },
    qualityScore: { type: Number, min: 0, max: 100 },
    criteriaScores: {
      accuracy: { type: Number },
      completeness: { type: Number },
      adherence: { type: Number },
    },
    errorTags: [{
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
    }],
    submittedAt: { type: Date, required: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
)

ReviewSchema.index({ tenantId: 1 })
ReviewSchema.index({ tenantId: 1, projectId: 1 })
ReviewSchema.index({ tenantId: 1, status: 1 })
ReviewSchema.index({ tenantId: 1, reviewerId: 1 })

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)
export default Review
