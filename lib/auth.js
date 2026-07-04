import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

// Never ship a committed fallback secret to production: with it, anyone can forge
// a valid 30-day session token for any user. Require a real secret in prod; keep a
// dev-only fallback so local development still works without extra setup.
const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET must be set in production'); })()
    : 'wingman-dev-secret'
);

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

/**
 * Extract + verify the session from a Next.js API route request, AND confirm the
 * token hasn't been revoked (token_version) or the account disabled. Async: reads
 * the user's current token_version + account_status. Returns the JWT payload
 * { sub, email, netid, tv } or null.
 */
export async function getSession(request) {
  const token = getBearerToken(request) || request.cookies.get('wingman_session')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.sub) return null;

  await connectDB();
  const user = await User.findById(payload.sub).select('token_version account_status').lean();
  if (!user) return null;

  // Revoked: logout / password change bumped token_version past what's in this token.
  if ((user.token_version || 0) !== (payload.tv || 0)) return null;
  // Disabled account: stop honoring existing tokens immediately.
  if (user.account_status === 'suspended' || user.account_status === 'banned') return null;

  return payload;
}

// Invalidate every existing session for a user (logout / password change / ban).
export async function bumpTokenVersion(userId) {
  await connectDB();
  await User.updateOne({ _id: userId }, { $inc: { token_version: 1 } });
}
