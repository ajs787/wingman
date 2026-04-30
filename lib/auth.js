import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'wingman-dev-secret';

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

/**
 * Extract + verify the session from a Next.js API route request.
 * Returns decoded JWT payload { sub, email, netid } or null.
 */
export function getSession(request) {
  const token = request.cookies.get('wingman_session')?.value;
  if (!token) return null;
  return verifyToken(token);
}
