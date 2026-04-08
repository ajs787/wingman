import mongoose, { Schema } from 'mongoose';
import { MODERATION_ACTION_TYPES } from '@/lib/types/safety';

const ModerationActionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', default: null, index: true },
    actionType: { type: String, enum: MODERATION_ACTION_TYPES, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    notes: { type: String, default: null, maxlength: 5000 },
    performedBy: { type: String, required: true },
    isAutomated: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ModerationActionSchema.index({ userId: 1, createdAt: -1 });

const ModerationAction = mongoose.models.ModerationAction ||
  mongoose.model('ModerationAction', ModerationActionSchema);

export default ModerationAction;
