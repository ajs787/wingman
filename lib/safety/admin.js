import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

function splitCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdminUser(request) {
  const session = await getSession(request);
  if (!session) return { ok: false, status: 401, error: 'Unauthorized' };

  await connectDB();

  const user = await User.findById(session.sub).select('_id email role').lean();
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };

  const allowedEmails = splitCsv(process.env.ADMIN_EMAILS);
  const allowedIds = splitCsv(process.env.ADMIN_USER_IDS);
  const isAdminByRole = user.role === 'admin';
  const isAdminByEmail = !!user.email && allowedEmails.includes(String(user.email).toLowerCase());
  const isAdminById = allowedIds.includes(String(user._id).toLowerCase());

  if (!isAdminByRole && !isAdminByEmail && !isAdminById) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true, user: { id: String(user._id), email: user.email ?? null } };
}
