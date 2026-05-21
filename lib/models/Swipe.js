import mongoose from 'mongoose';

const SwipeSchema = new mongoose.Schema({
  owner_user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delegate_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target_user_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  direction:        { type: String, enum: ['left', 'right'], required: true },
  friend_note:      { type: String, default: null, maxLength: 200 },
}, { timestamps: true });

// One swipe per owner+delegate+target. Different wingmen can independently vote on the same candidate.
SwipeSchema.index({ owner_user_id: 1, delegate_user_id: 1, target_user_id: 1 }, { unique: true });
SwipeSchema.index({ owner_user_id: 1, target_user_id: 1, direction: 1 });

export default mongoose.models.Swipe || mongoose.model('Swipe', SwipeSchema);
