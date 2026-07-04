export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

const filtersSchema = z.object({
  filters: z.object({
    school: z.string().nullable().optional(),
    school_dealbreaker: z.boolean().optional(),
    age_min: z.number().int().min(17).max(99).nullable().optional(),
    age_max: z.number().int().min(17).max(99).nullable().optional(),
    age_dealbreaker: z.boolean().optional(),
    majors: z.array(z.string()).optional(),
    majors_dealbreaker: z.boolean().optional(),
    year: z.string().nullable().optional(),
    year_dealbreaker: z.boolean().optional(),
    gender: z.string().nullable().optional(),
    gender_dealbreaker: z.boolean().optional(),
    races: z.array(z.string()).optional(),
    races_dealbreaker: z.boolean().optional(),
    distance_miles: z.number().int().min(5).max(100).optional(),
    distance_dealbreaker: z.boolean().optional(),
  }),
});

// PUT /api/profile/filters — update user's swipe filters
export async function PUT(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = filtersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(
    session.sub,
    { $set: { filters: parsed.data.filters } },
    { new: true }
  ).lean();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ ok: true, filters: user.filters });
}
