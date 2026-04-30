import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyToken } from '@/lib/auth';

function splitCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireServerAdmin() {
  const token = cookies().get('wingman_session')?.value;
  if (!token) redirect('/login');

  const session = verifyToken(token);
  if (!session?.sub) redirect('/login');

  await connectDB();
  const user = await User.findById(session.sub).select('_id email role').lean();
  if (!user) redirect('/login');

  const allowedEmails = splitCsv(process.env.ADMIN_EMAILS);
  const allowedIds = splitCsv(process.env.ADMIN_USER_IDS);
  const isAdminByRole = user.role === 'admin';
  const isAdminByEmail = !!user.email && allowedEmails.includes(String(user.email).toLowerCase());
  const isAdminById = allowedIds.includes(String(user._id).toLowerCase());

  if (!isAdminByRole && !isAdminByEmail && !isAdminById) {
    redirect('/feed');
  }

  return { id: String(user._id), email: user.email || null };
}
