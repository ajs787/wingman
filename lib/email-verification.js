import crypto from 'crypto';
import nodemailer from 'nodemailer';

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

function getTransportConfig() {
  if (process.env.SMTP_URL) return process.env.SMTP_URL;
  if (!process.env.SMTP_HOST) return null;

  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
  };

  if (process.env.SMTP_USER || process.env.SMTP_PASS) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  return config;
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
  const transportConfig = getTransportConfig();
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'Wingman <no-reply@wingman.local>';
  const verifyUrl = `${getAppBaseUrl()}/login?verify=${encodeURIComponent(to)}`;

  if (!transportConfig) {
    if (isProduction()) {
      throw new Error('SMTP is not configured. Set SMTP_URL or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM.');
    }

    console.log(`[DEV] Wingman email verification code for ${to}: ${code}`);
    return { sent: false, devCode: code };
  }

  const transporter = nodemailer.createTransport(transportConfig);
  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your Wingman email',
    text: `Your Wingman verification code is ${code}. It expires in 15 minutes.\n\nOpen Wingman: ${verifyUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#32141f">
        <h1 style="margin:0 0 12px">Verify your Wingman email</h1>
        <p>Use this code to finish creating your account:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${code}</p>
        <p>This code expires in 15 minutes.</p>
        <p><a href="${verifyUrl}">Open Wingman</a></p>
      </div>
    `,
  });

  return { sent: true };
}
