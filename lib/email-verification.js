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

// SendGrid's HTTP API, not raw SMTP — serverless platforms like Vercel don't
// reliably support outbound SMTP on ports 587/465/25, but plain HTTPS always
// works. Reuses the existing SMTP_PASS value, which is already a SendGrid API
// key (SendGrid's SMTP relay uses the literal username "apikey" with the API
// key as the password).
function getSendGridApiKey() {
  return process.env.SENDGRID_API_KEY || process.env.SMTP_PASS || null;
}

// "Wingman <no-reply@wingman33.com>" -> { name: 'Wingman', email: 'no-reply@wingman33.com' }
function parseFromAddress(raw) {
  const match = /^\s*(.*?)\s*<(.+)>\s*$/.exec(raw || '');
  if (match) return { name: match[1].replace(/^"|"$/g, '') || undefined, email: match[2] };
  return { email: raw };
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

export async function sendEmailVerification({ to, code }) {
  const apiKey = getSendGridApiKey();
  const fromRaw = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'Wingman <no-reply@wingman.local>';
  const verifyUrl = `${getAppBaseUrl()}/login?verify=${encodeURIComponent(to)}`;

  if (!apiKey) {
    if (isProduction()) {
      throw new Error('SendGrid is not configured. Set SENDGRID_API_KEY (or SMTP_PASS) and SMTP_FROM.');
    }

    console.log(`[DEV] Wingman email verification code for ${to}: ${code}`);
    return { sent: false, devCode: code };
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: parseFromAddress(fromRaw),
      subject: 'Verify your Wingman email',
      content: [
        {
          type: 'text/plain',
          value: `Your Wingman verification code is ${code}. It expires in 15 minutes.\n\nOpen Wingman: ${verifyUrl}`,
        },
        {
          type: 'text/html',
          value: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#32141f">
              <h1 style="margin:0 0 12px">Verify your Wingman email</h1>
              <p>Use this code to finish creating your account:</p>
              <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${code}</p>
              <p>This code expires in 15 minutes.</p>
              <p><a href="${verifyUrl}">Open Wingman</a></p>
            </div>
          `,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SendGrid API error ${res.status}: ${body.slice(0, 300)}`);
  }

  return { sent: true };
}
