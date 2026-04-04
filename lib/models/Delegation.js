import mongoose from 'mongoose';

const DelegationSchema = new mongoose.Schema({
  owner_user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delegate_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:           { type: String, enum: ['active', 'revoked'], default: 'active' },
}, { timestamps: true });

DelegationSchema.index({ owner_user_id: 1, delegate_user_id: 1 }, { unique: true });

export default mongoose.models.Delegation || mongoose.model('Delegation', DelegationSchema);
