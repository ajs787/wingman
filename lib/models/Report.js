import mongoose, { Schema } from 'mongoose';
import { REPORT_PRIORITIES, REPORT_REASONS, REPORT_STATUSES } from '@/lib/types/safety';

const MessageSnapshotSchema = new Schema(
  {
    messageId: { type: String, required: true },
    senderId: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const ProfileSnapshotSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, default: null },
    first_name: { type: String, default: null },
    last_name: { type: String, default: null },
    age: { type: Number, default: null },
    bio: { type: String, default: null },
    personality_answer: { type: String, default: null },
    photos: { type: [String], default: [] },
    school: { type: String, default: null },
    year: { type: String, default: null },
    majors: { type: [String], default: [] },
  },
  { _id: false }
);

const EvidenceSchema = new Schema(
  {
    messageSnapshots: { type: [MessageSnapshotSchema], default: [] },
    imageUrls: { type: [String], default: [] },
    profileSnapshot: { type: ProfileSnapshotSchema, default: null },
  },
  { _id: false }
);

const ReportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
    conversationId: { type: Schema.Types.ObjectId, default: null, index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true, index: true },
    details: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: REPORT_STATUSES, default: 'open', index: true },
    priority: { type: String, enum: REPORT_PRIORITIES, default: 'low', index: true },
    evidence: { type: EvidenceSchema, default: {} },
    autoBlock: { type: Boolean, default: false },
    adminNotes: { type: String, default: null, maxlength: 5000 },
  },
  { timestamps: true }
);

ReportSchema.index({ reportedUserId: 1, createdAt: -1 });
ReportSchema.index({ status: 1, priority: -1, createdAt: -1 });

const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);

export default Report;
