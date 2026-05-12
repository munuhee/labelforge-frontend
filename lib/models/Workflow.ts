import mongoose, { Schema, Document, Model } from 'mongoose'

export type WorkflowType =
  | 'agentic-ai' | 'llm-training' | 'multimodal' | 'evaluation'
  | 'benchmarking' | 'preference-ranking' | 'red-teaming' | 'data-collection'

export interface IWorkflow extends Document {
  tenantId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  name: string
  description: string
  type: WorkflowType
  isActive: boolean
  assignedUsers: mongoose.Types.ObjectId[]
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const WorkflowSchema = new Schema<IWorkflow>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['agentic-ai', 'llm-training', 'multimodal', 'evaluation', 'benchmarking', 'preference-ranking', 'red-teaming', 'data-collection'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    assignedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

WorkflowSchema.index({ tenantId: 1 })
WorkflowSchema.index({ tenantId: 1, projectId: 1 })
WorkflowSchema.index({ tenantId: 1, isActive: 1 })

const Workflow: Model<IWorkflow> = mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', WorkflowSchema)
export default Workflow
