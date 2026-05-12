import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IProject extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  description?: string
  /** Markdown guidelines shown to annotators */
  guidelines?: string
  taskTypes: string[]
  workflowStages: ('annotation' | 'review' | 'qa')[]
  isActive: boolean
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema = new Schema<IProject>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    guidelines: { type: String, default: '' },
    taskTypes: [{ type: String }],
    workflowStages: {
      type: [String],
      enum: ['annotation', 'review', 'qa'],
      default: ['annotation', 'review'],
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

ProjectSchema.index({ tenantId: 1 })
ProjectSchema.index({ tenantId: 1, isActive: 1 })

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)
export default Project
