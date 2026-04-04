import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  match_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxLength: 2000 },
  read: { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ match_id: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
