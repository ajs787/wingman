import mongoose from 'mongoose';

// A sender = one of the OWNER's wingmen who liked the target on the owner's behalf.
// Multiple wingmen can pile onto the same potential match; each carries their own note.
const SenderSchema = new mongoose.Schema({
  wingman_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment:         { type: String, default: null, maxLength: 300 },
  // How the like was framed: a plain like, a reply to one of the target's prompts,
  // or a reply to one of the target's photos.
  comment_type:    { type: String, enum: ['none', 'prompt', 'photo'], default: 'none' },
  // What the note replies to: the prompt text (comment_type='prompt') or the photo
  // position (comment_type='photo'). Null for a plain like.
  comment_ref:     { type: String, default: null },
  createdAt:       { type: Date, default: Date.now },
}, { _id: false });

// A decision = one of the TARGET's wingmen accepting or rejecting the incoming like.
// One reject does not kill the potential match; any single accept promotes it to a match.
const DecisionSchema = new mongoose.Schema({
  wingman_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  decision:        { type: String, enum: ['accept', 'reject'], required: true },
  decidedAt:       { type: Date, default: Date.now },
}, { _id: false });

// A directed like: owner O's side likes target C. C's wingmen review it (receiver-only gate).
const PotentialMatchSchema = new mongoose.Schema({
  owner_user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // O — from
  target_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // C — to (receiver)
  senders:        { type: [SenderSchema], default: [] },
  decisions:      { type: [DecisionSchema], default: [] },
  // Aggregate receiver-side verdict. Recomputed on every decision:
  //   accepted — at least one target wingman accepted
  //   rejected — every active target wingman has rejected (dead, but revivable by an accept)
  //   pending  — otherwise
  status:         { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
  accepted_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // target wingman who accepted
  match_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
}, { timestamps: true });

// One potential match per directed (owner -> target) pair. Wingmen accumulate as senders.
PotentialMatchSchema.index({ owner_user_id: 1, target_user_id: 1 }, { unique: true });
// Incoming-likes query: everything sent to a given target, newest first.
PotentialMatchSchema.index({ target_user_id: 1, status: 1, updatedAt: -1 });

export default mongoose.models.PotentialMatch || mongoose.model('PotentialMatch', PotentialMatchSchema);
