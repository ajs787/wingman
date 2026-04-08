import mongoose, { Schema } from 'mongoose';

const BlockSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

const Block = mongoose.models.Block || mongoose.model('Block', BlockSchema);

export default Block;
