import mongoose from 'mongoose';

const InviteCodeSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true },
  owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expires_at:    { type: Date, required: true },
  max_uses:      { type: Number, default: 1 },
  uses:          { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.InviteCode || mongoose.model('InviteCode', InviteCodeSchema);
