import jwt from 'jsonwebtoken';

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
 * Extract + verify the session from a Next.js API route request.
 * Returns decoded JWT payload { sub, email, netid } or null.
 */
export function getSession(request) {
  const token = getBearerToken(request) || request.cookies.get('wingman_session')?.value;
  if (!token) return null;
  return verifyToken(token);
}
