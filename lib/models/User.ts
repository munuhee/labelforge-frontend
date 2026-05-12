import mongoose, { Schema, Document, Model } from 'mongoose'

export type UserRole = 'super_admin' | 'client_admin' | 'qa_lead' | 'reviewer' | 'annotator' | 'reviewer_annotator'

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: UserRole
  department?: string
  isActive: boolean
  otp?: string
  otpExpiry?: Date
  badges: Array<{
    type: 'role' | 'expertise' | 'level'
    name: string
    description: string
    awardedAt: Date
  }>
  createdAt: Date
  updatedAt: Date
}

const BadgeSchema = new Schema({
  type: { type: String, enum: ['role', 'expertise', 'level'], required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  awardedAt: { type: Date, default: Date.now },
}, { _id: false })

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['super_admin', 'client_admin', 'qa_lead', 'reviewer', 'annotator', 'reviewer_annotator'],
      default: 'annotator',
    },
    department: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    otp: { type: String },
    otpExpiry: { type: Date },
    badges: { type: [BadgeSchema], default: [] },
  },
  { timestamps: true }
)

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export default User
