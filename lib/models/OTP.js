import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema({
  phone_number: { type: String, required: true },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0, max: 5 },
  created_at: { type: Date, default: Date.now, expires: 600 }, // Auto-delete after 10 minutes
});

export default mongoose.models.OTP || mongoose.model('OTP', OTPSchema);
