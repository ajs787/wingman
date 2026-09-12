import crypto from 'crypto';

export const EMAIL_VERIFICATION_TTL_MS = 15 * 60 * 1000;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

function getSecret() {
  return process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET || 'wingman-dev-secret';
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

// Resend's HTTP API (https://resend.com) — plain HTTPS, which serverless
// platforms like Vercel always allow (outbound SMTP on 587/465/25 is often
// blocked). The From domain must be verified in Resend so DKIM/SPF align.
function getResendApiKey() {
  return process.env.RESEND_API_KEY || null;
}

export function generateEmailVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashEmailVerificationCode(email, code) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${String(email || '').trim().toLowerCase()}:${String(code || '').trim()}`)
    .digest('hex');
}

export function createEmailVerificationPayload(email) {
  const code = generateEmailVerificationCode();
  return {
    code,
    codeHash: hashEmailVerificationCode(email, code),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    sentAt: new Date(),
  };
}

export function isEmailVerificationCodeValid({ email, code, codeHash, expiresAt }) {
  if (!email || !code || !codeHash || !expiresAt) return false;
  if (new Date(expiresAt).getTime() < Date.now()) return false;

  const expected = Buffer.from(hashEmailVerificationCode(email, code), 'hex');
  const actual = Buffer.from(codeHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// `purpose` tailors the copy: 'verify' (default) for sign-in verification,
// 'reset' for a forgot-password code. The delivery mechanics are identical.
function emailCopy(purpose, code) {
  if (purpose === 'reset') {
    return {
      subject: `${code} is your Wingman password reset code`,
      category: 'password_reset',
      preheader: `Your Wingman password reset code is ${code} — expires in 15 minutes.`,
      heading: 'Reset your password',
      lead: 'Use this code to reset your Wingman password:',
      plain: `Your Wingman password reset code is ${code}. It expires in 15 minutes.\n\nEnter it in the app to reset your password. If you didn't request this, you can ignore this email.`,
    };
  }
  return {
    subject: `${code} is your Wingman verification code`,
    category: 'email_verification',
    preheader: `Your Wingman code is ${code} — expires in 15 minutes.`,
    heading: 'Verify your email',
    lead: 'Use this code to finish signing in to Wingman:',
    plain: `Your Wingman verification code is ${code}. It expires in 15 minutes.\n\nEnter it in the app to finish signing in. If you didn't request this, you can ignore this email.`,
  };
}

export async function sendEmailVerification({ to, code, purpose = 'verify' }) {
  const apiKey = getResendApiKey();
  const copy = emailCopy(purpose, code);
  // Default From MUST be on a domain verified in Resend (wingman33.com) so the
  // message passes SPF/DKIM/DMARC alignment — a mismatched From is a top spam
  // trigger, especially for strict .edu (Rutgers) filters.
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Wingman <no-reply@wingman33.com>';
  const replyTo = process.env.EMAIL_REPLY_TO || 'Wingman Support <support@wingman33.com>';

  if (!apiKey) {
    if (isProduction()) {
      throw new Error('Resend is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
    }

    // Local dev without Resend: log the code so the flow is testable, no send.
    console.log(`[DEV] Wingman ${purpose} code for ${to}: ${code}`);
    return { sent: false, devCode: code };
  }

  const html = `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${copy.preheader}</div>
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#32141f;max-width:440px">
      <h1 style="margin:0 0 12px;font-size:20px">${copy.heading}</h1>
      <p style="margin:0 0 8px">${copy.lead}</p>
      <p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:16px 0;color:#e0447f">${code}</p>
      <p style="margin:0 0 4px;color:#5c534d">This code expires in 15 minutes.</p>
      <p style="margin:12px 0 0;color:#8a7c72;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Resend accepts a raw "Name <email@domain>" string for from/reply_to.
      from,
      to: [to],
      reply_to: replyTo,
      // Code in the subject reads as a recognizable transactional message (like
      // Google/Apple OTPs) and improves inbox placement.
      subject: copy.subject,
      text: copy.plain,
      html,
      // Segments this stream in Resend analytics (values: letters/digits/_/-).
      tags: [{ name: 'category', value: copy.category }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${body.slice(0, 300)}`);
  }

  return { sent: true };
}
