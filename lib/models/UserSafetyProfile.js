import mongoose, { Schema } from 'mongoose';
import { MODERATION_STATUSES } from '@/lib/types/safety';

const ActionHistorySchema = new Schema(
  {
    actionType: { type: String, required: true },
    reason: { type: String, default: null },
    notes: { type: String, default: null },
    performedBy: { type: String, default: null },
    isAutomated: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSafetyProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    totalReportsReceived: { type: Number, default: 0 },
    totalReportsSubmitted: { type: Number, default: 0 },
    openReportsCount: { type: Number, default: 0 },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    flags: { type: [String], default: [] },
    lastReportedAt: { type: Date, default: null },
    lastActionAt: { type: Date, default: null },
    moderationStatus: { type: String, enum: MODERATION_STATUSES, default: 'clear', index: true },
    actionHistory: { type: [ActionHistorySchema], default: [] },
  },
  { timestamps: true }
);

UserSafetyProfileSchema.index({ moderationStatus: 1, riskScore: -1 });

const UserSafetyProfile = mongoose.models.UserSafetyProfile ||
  mongoose.model('UserSafetyProfile', UserSafetyProfileSchema);

export default UserSafetyProfile;
