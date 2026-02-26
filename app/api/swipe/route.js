import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

async function getAuthedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

const swipeSchema = z.object({
  owner_user_id: z.string().uuid(),
  target_user_id: z.string().uuid(),
  direction: z.enum(['left', 'right']),
  tag: z.string().max(50).optional(),
});

export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = swipeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { owner_user_id, target_user_id, direction, tag } = parsed.data;

  // CRITICAL: Block self-swipe variants
  if (owner_user_id === user.id) {
    return NextResponse.json({ error: 'You cannot swipe for yourself.' }, { status: 400 });
  }
  if (target_user_id === owner_user_id) {
    return NextResponse.json({ error: 'Owner cannot swipe on themselves.' }, { status: 400 });
  }
  if (target_user_id === user.id) {
    return NextResponse.json({ error: 'You cannot swipe on yourself as a candidate.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify active delegation
  const { data: delegation } = await admin
    .from('delegations')
    .select('id')
    .eq('owner_user_id', owner_user_id)
    .eq('delegate_user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!delegation) {
    return NextResponse.json({ error: 'No active delegation. Cannot swipe.' }, { status: 403 });
  }

  // Insert swipe (unique constraint: owner_user_id + target_user_id)
  const { data: swipe, error: swipeError } = await admin
    .from('swipes')
    .insert({
      owner_user_id,
      delegate_user_id: user.id,
      target_user_id,
      direction,
      tag: tag || null,
    })
    .select()
    .single();

  if (swipeError) {
    if (swipeError.code === '23505') {
      // duplicate — already swiped
      return NextResponse.json({ message: 'Already swiped on this profile.', alreadySwiped: true });
    }
    return NextResponse.json({ error: swipeError.message }, { status: 500 });
  }

  let matched = false;

  // Match logic: if right swipe, check if reciprocal right swipe exists
  if (direction === 'right') {
    // Does a right swipe exist where owner=target likes owner=our_owner?
    const { data: reciprocal } = await admin
      .from('swipes')
      .select('id')
      .eq('owner_user_id', target_user_id)
      .eq('target_user_id', owner_user_id)
      .eq('direction', 'right')
      .single();

    if (reciprocal) {
      // Create match — ordered pair by consistent min/max UUID string comparison
      const a = owner_user_id < target_user_id ? owner_user_id : target_user_id;
      const b = owner_user_id < target_user_id ? target_user_id : owner_user_id;

      await admin
        .from('matches')
        .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b', ignoreDuplicates: true });

      matched = true;
    }
  }

  return NextResponse.json({ swipe, matched });
}
