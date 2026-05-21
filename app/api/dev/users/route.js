export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

// DEV ONLY: List all users or clear them
export async function GET(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({}).select('email netid name createdAt').lean();

  return NextResponse.json({
    count: users.length,
    users: users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      netid: u.netid,
      name: u.name,
      created: u.createdAt,
    })),
  });
}

// DEV ONLY: Delete a user by email
export async function DELETE(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const all = searchParams.get('all');

  await connectDB();

  if (all === 'true') {
    const result = await User.deleteMany({});
    return NextResponse.json({ deleted: result.deletedCount, message: 'All users deleted' });
  }

  if (!email) {
    return NextResponse.json({ error: 'Provide ?email=... or ?all=true' }, { status: 400 });
  }

  const result = await User.deleteOne({ email: email.toLowerCase() });
  return NextResponse.json({
    deleted: result.deletedCount,
    message: result.deletedCount ? `Deleted ${email}` : `${email} not found`,
  });
}
