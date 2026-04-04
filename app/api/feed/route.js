import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getRankedCandidates } from '@/lib/feed-ranking';

// GET /api/feed?ownerId=<mongoId>
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get('ownerId');
  const limit = searchParams.get('limit') || '25';
  const randomness = searchParams.get('randomness') || '0.15';
  if (!ownerId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 });

  await connectDB();

  const ranked = await getRankedCandidates({
    ownerId,
    delegateId: session.sub,
    limit: Number(limit),
    randomness: Number(randomness),
  });

  if (ranked.error) {
    return NextResponse.json({ error: ranked.error }, { status: ranked.status || 400 });
  }

  return NextResponse.json({ candidates: ranked.candidates, meta: ranked.meta });
}
