export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import Delegation from '@/lib/models/Delegation';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

function serializeUser(u) {
  const uid = u._id.toString();
  return {
    _id: uid,
    name: u.name,
    netid: u.netid,
    age: u.age,
    year: u.year,
    major: u.major,
    personality_answer: u.personality_answer,
    photos: (u.photos ?? [])
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        position: p.position,
        url: p.filename ? `/uploads/${uid}/${p.filename}` : null,
        prompt: p.prompt,
        prompt_answer: p.prompt_answer,
      })),
  };
}

// GET /api/delegations — delegates I manage (as owner) + owners I'm swiping for
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const [asDelegator, asDelegate] = await Promise.all([
    Delegation.find({ owner_user_id: session.sub, status: 'active' })
      .populate('delegate_user_id', 'name netid age year major personality_answer photos')
      .lean(),
    Delegation.find({ delegate_user_id: session.sub, status: 'active' })
      .populate('owner_user_id', 'name netid age year major personality_answer photos')
      .lean(),
  ]);

  const delegates = asDelegator.map((d) => ({
    delegation_id: d._id.toString(),
    status: d.status,
    created_at: d.createdAt,
    ...serializeUser(d.delegate_user_id),
  }));

  const owners = asDelegate.map((d) => ({
    delegation_id: d._id.toString(),
    status: d.status,
    created_at: d.createdAt,
    ...serializeUser(d.owner_user_id),
  }));

  return NextResponse.json({ delegates, owners });
}

const revokeSchema = z.object({
  delegation_id: z.string().min(1),
});

// DELETE /api/delegations — revoke a delegation (owner only)
export async function DELETE(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid delegation_id' }, { status: 422 });

  await connectDB();
  const delegation = await Delegation.findById(parsed.data.delegation_id);

  if (!delegation) return NextResponse.json({ error: 'Delegation not found' }, { status: 404 });
  if (delegation.owner_user_id.toString() !== session.sub) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  delegation.status = 'revoked';
  await delegation.save();

  return NextResponse.json({ success: true });
}

