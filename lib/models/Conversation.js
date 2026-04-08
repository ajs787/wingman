import mongoose, { Schema } from 'mongoose';

const ConversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 2,
        message: 'Conversation must have exactly two participants.',
      },
      required: true,
    },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
    status: { type: String, enum: ['active', 'closed', 'blocked'], default: 'active', index: true },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    blockReason: { type: String, default: null },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });

const Conversation = mongoose.models.Conversation ||
  mongoose.model('Conversation', ConversationSchema);

export default Conversation;
