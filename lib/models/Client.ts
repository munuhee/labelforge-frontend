import mongoose, { Schema, Document, Model } from 'mongoose'

// Internal name: Tenant. In the UI this is called a "client" or "workspace".
export interface IClient extends Document {
  name: string
  /** URL-safe slug used in routing: /[clientSlug]/dashboard/... */
  slug: string
  description?: string
  logoUrl?: string
  isActive: boolean
  plan: 'starter' | 'pro' | 'enterprise'
  settings?: Record<string, unknown>
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    description: { type: String, default: '' },
    logoUrl: { type: String },
    isActive: { type: Boolean, default: true },
    plan: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
    settings: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ClientSchema.index({ slug: 1 }, { unique: true })
ClientSchema.index({ isActive: 1 })

const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema)
export default Client
