import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  // user_a < user_b (lexicographic ObjectId string comparison — ensures unique unordered pair)
  user_a: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_b: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Status for each user's acceptance
  user_a_status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  user_b_status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  // Friend notes from the swipers
  user_a_friend_note: { type: String, default: null },
  user_b_friend_note: { type: String, default: null },
  // Who made the match (delegate info)
  user_a_matched_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  user_b_matched_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active', index: true },
  blocked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  blocked_reason: { type: String, default: null },
}, { timestamps: true });

MatchSchema.index({ user_a: 1, user_b: 1 }, { unique: true });

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
