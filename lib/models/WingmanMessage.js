import mongoose from 'mongoose';

// Back-and-forth between the two sides' wingmen about a specific potential match,
// before it becomes a real match. `side` records which user the sender is a wingman for.
const WingmanMessageSchema = new mongoose.Schema({
  potential_match_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PotentialMatch', required: true },
  sender_user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  side:               { type: String, enum: ['owner', 'target'], required: true },
  body:               { type: String, required: true, maxLength: 500 },
}, { timestamps: true });

WingmanMessageSchema.index({ potential_match_id: 1, createdAt: 1 });

export default mongoose.models.WingmanMessage || mongoose.model('WingmanMessage', WingmanMessageSchema);
