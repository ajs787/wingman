export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import Match from '@/lib/models/Match';
import { getSession } from '@/lib/auth';

const actionSchema = z.object({
  match_id: z.string().min(1),
  action: z.enum(['accept', 'reject']),
});

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { match_id, action } = parsed.data;
  const userId = session.sub;

  await connectDB();

  const match = await Match.findById(match_id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  // Determine which user position this user is in
  const isUserA = match.user_a.toString() === userId;
  const isUserB = match.user_b.toString() === userId;

  if (!isUserA && !isUserB) {
    return NextResponse.json({ error: 'Not your match' }, { status: 403 });
  }

  const status = action === 'accept' ? 'accepted' : 'rejected';

  if (isUserA) {
    match.user_a_status = status;
  } else {
    match.user_b_status = status;
  }

  await match.save();

  return NextResponse.json({
    ok: true,
    status,
    canChat: match.user_a_status === 'accepted' && match.user_b_status === 'accepted',
  });
}
