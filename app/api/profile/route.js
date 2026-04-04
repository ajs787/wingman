import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

function photoWithUrl(photo, userId) {
  return {
    position: photo.position,
    filename: photo.filename,
    prompt: photo.prompt,
    prompt_answer: photo.prompt_answer,
    url: photo.filename ? `/uploads/${userId}/${photo.filename}` : null,
  };
}

// GET /api/profile — return current user's profile + photos
export async function GET(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.sub).lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const profile = {
    _id: user._id.toString(),
    netid: user.netid,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    name: user.name,
    age: user.age,
    school: user.school,
    year: user.year,
    majors: user.majors ?? [],
    minors: user.minors ?? [],
    major: user.major,
    gender: user.gender,
    sexuality: user.sexuality,
    looking_for: user.looking_for,
    height: user.height,
    location: user.location,
    job: user.job,
    religion: user.religion,
    personality_answer: user.personality_answer,
    favorite_cuisine: user.favorite_cuisine,
    favorite_cuisines: user.favorite_cuisines ?? [],
    race_ethnicities: user.race_ethnicities ?? [],
    alcohol_use: user.alcohol_use,
    weed_use: user.weed_use,
    drug_use: user.drug_use,
    hidden: user.hidden ?? false,
    show_age: user.show_age ?? true,
    show_school: user.show_school ?? true,
    filters: user.filters ?? {},
    photos: (user.photos ?? [])
      .sort((a, b) => a.position - b.position)
      .map((p) => photoWithUrl(p, user._id.toString())),
  };

  return NextResponse.json({ profile });
}

const profileSchema = z.object({
  first_name:         z.string().min(1).max(50).optional(),
  last_name:          z.string().min(1).max(50).optional(),
  name:               z.string().min(1).max(100).optional(),
  age:                z.number().int().min(17).max(99),
  school:             z.string().min(1).max(200).optional(),
  year:               z.string().min(1),
  majors:             z.array(z.string()).optional(),
  minors:             z.array(z.string()).optional(),
  major:              z.string().max(100).optional(),
  gender:             z.string().min(1),
  sexuality:          z.string().max(100).nullable().optional(),
  looking_for:        z.string().min(1),
  height:             z.string().max(50).nullable().optional(),
  location:           z.string().max(200).nullable().optional(),
  job:                z.string().max(200).nullable().optional(),
  religion:           z.string().max(200).nullable().optional(),
  personality_answer: z.string().max(500).nullable().optional(),
  favorite_cuisine:   z.string().min(1).max(100).optional(),
  favorite_cuisines:  z.array(z.string()).max(3).optional(),
  race_ethnicities:   z.array(z.string()).optional(),
  alcohol_use:        z.string().max(100).nullable().optional(),
  weed_use:           z.string().max(100).nullable().optional(),
  drug_use:           z.string().max(100).nullable().optional(),
});

// PUT /api/profile — update profile fields
export async function PUT(request) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(
    session.sub,
    { $set: parsed.data },
    { new: true }
  ).lean();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    profile: {
      ...user,
      id: user._id.toString(),
      photos: (user.photos ?? [])
        .sort((a, b) => a.position - b.position)
        .map((p) => photoWithUrl(p, user._id.toString())),
    },
  });
}
