import crypto from 'crypto';
import twilio from 'twilio';

export const PHONE_OTP_TTL_MS = 10 * 60 * 1000;
export const PHONE_OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function getSecret() {
  return process.env.PHONE_OTP_SECRET || process.env.JWT_SECRET || 'wingman-dev-secret';
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function normalizeUSPhone(phoneNumber) {
  const raw = String(phoneNumber || '').trim();
  if (raw.startsWith('+') && !raw.startsWith('+1')) return null;

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOTP(phoneNumber, code) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${String(phoneNumber || '').trim()}:${String(code || '').trim()}`)
    .digest('hex');
}

export function isOTPValid({ phoneNumber, code, codeHash }) {
  if (!phoneNumber || !code || !codeHash) return false;

  const expected = Buffer.from(hashOTP(phoneNumber, code), 'hex');
  const actual = Buffer.from(codeHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function sendOTP({ to, code }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    if (isProduction()) {
      throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID.');
    }

    console.log(`[DEV] Wingman OTP for ${to}: ${code}`);
    return { sent: false, devOtp: code };
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    to,
    body: `Your Wingman verification code is ${code}. It expires in 10 minutes.`,
    ...(messagingServiceSid ? { messagingServiceSid } : { from }),
  });

  return { sent: true };
}
