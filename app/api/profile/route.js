import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

async function getAuthedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// GET /api/profile — return current user's profile + photos
export async function GET() {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('*, photos(id, storage_path, position, prompt_id, prompt_answer)')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ profile: profile ?? null });
}

const profileSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(17).max(99),
  year: z.string().min(1),
  major: z.string().min(1).max(100),
  gender: z.string().min(1),
  looking_for: z.string().min(1),
  personality_answer: z.string().min(1).max(500),
});

// PUT /api/profile — upsert profile fields
export async function PUT(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .update(parsed.data)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
