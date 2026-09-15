import mongoose from 'mongoose';

const InviteCodeSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true },
  owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Invite codes no longer expire — they're single-use instead (max_uses: 1),
  // so a code stays valid until a friend actually redeems it. Kept as an
  // optional field so pre-existing documents still load.
  expires_at:    { type: Date, default: null },
  max_uses:      { type: Number, default: 1 },
  uses:          { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.InviteCode || mongoose.model('InviteCode', InviteCodeSchema);
