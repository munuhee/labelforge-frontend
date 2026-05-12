import mongoose, { Schema, Document, Model } from 'mongoose'

export type MemberRole = 'client_admin' | 'qa_lead' | 'reviewer' | 'annotator' | 'reviewer_annotator'

export interface IClientMembership extends Document {
  userId: mongoose.Types.ObjectId
  tenantId: mongoose.Types.ObjectId
  /** Role within this specific client workspace */
  role: MemberRole
  isActive: boolean
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
}

const ClientMembershipSchema = new Schema<IClientMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    role: {
      type: String,
      enum: ['client_admin', 'qa_lead', 'reviewer', 'annotator', 'reviewer_annotator'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// A user can only have one active membership per client
ClientMembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true })
ClientMembershipSchema.index({ tenantId: 1 })
ClientMembershipSchema.index({ userId: 1 })

const ClientMembership: Model<IClientMembership> =
  mongoose.models.ClientMembership ||
  mongoose.model<IClientMembership>('ClientMembership', ClientMembershipSchema)
export default ClientMembership
