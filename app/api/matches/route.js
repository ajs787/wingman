import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function getAuthedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// GET /api/matches?ownerId=<uuid>
export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 });

  const admin = createAdminClient();

  // Permission check: user must be owner OR an active delegate for owner
  const isOwner = user.id === ownerId;
  let hasPermission = isOwner;

  if (!hasPermission) {
    const { data: delegation } = await admin
      .from('delegations')
      .select('id')
      .eq('owner_user_id', ownerId)
      .eq('delegate_user_id', user.id)
      .eq('status', 'active')
      .single();
    hasPermission = !!delegation;
  }

  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch matches where owner is user_a or user_b
  const { data: matchRows, error } = await admin
    .from('matches')
    .select('id, created_at, user_a, user_b')
    .or(`user_a.eq.${ownerId},user_b.eq.${ownerId}`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Collect the other user IDs
  const otherIds = (matchRows ?? []).map((m) => (m.user_a === ownerId ? m.user_b : m.user_a));

  if (otherIds.length === 0) return NextResponse.json({ matches: [] });

  // Fetch their profiles + photos
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, age, year, major, photos(storage_path, position)')
    .in('id', otherIds);

  const profileMap = {};
  (profiles ?? []).forEach((p) => {
    profileMap[p.id] = {
      ...p,
      photos: (p.photos ?? [])
        .sort((a, b) => a.position - b.position)
        .map((ph) => ({
          ...ph,
          publicUrl: admin.storage.from('profile-photos').getPublicUrl(ph.storage_path).data.publicUrl,
        })),
    };
  });

  // Get swipe tags if any
  const { data: swipeRows } = await admin
    .from('swipes')
    .select('target_user_id, tag')
    .eq('owner_user_id', ownerId)
    .in('target_user_id', otherIds)
    .eq('direction', 'right');

  const tagMap = {};
  (swipeRows ?? []).forEach((s) => { tagMap[s.target_user_id] = s.tag; });

  const matches = (matchRows ?? []).map((m) => {
    const otherId = m.user_a === ownerId ? m.user_b : m.user_a;
    return {
      match_id: m.id,
      matched_at: m.created_at,
      profile: profileMap[otherId] ?? { id: otherId },
      tag: tagMap[otherId] ?? null,
    };
  });

  return NextResponse.json({ matches });
}
