import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function getAuthedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// GET /api/feed?ownerId=<uuid>
// Returns 20 candidate profiles for delegate to swipe on behalf of owner
export async function GET(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 });

  // Block self-swipe at API level
  if (ownerId === user.id) {
    return NextResponse.json({ error: 'You cannot swipe for yourself.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify active delegation exists
  const { data: delegation } = await admin
    .from('delegations')
    .select('id')
    .eq('owner_user_id', ownerId)
    .eq('delegate_user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!delegation) {
    return NextResponse.json({ error: 'No active delegation found. Ask the owner to share their code.' }, { status: 403 });
  }

  // Get all profiles owner has already swiped on
  const { data: swipedRows } = await admin
    .from('swipes')
    .select('target_user_id')
    .eq('owner_user_id', ownerId);

  const swipedIds = (swipedRows ?? []).map((s) => s.target_user_id);

  // Exclude owner, delegate, and already swiped
  const excludeIds = [...new Set([ownerId, user.id, ...swipedIds])];

  // Build query
  let query = admin
    .from('profiles')
    .select('id, name, age, year, major, gender, looking_for, personality_answer, photos(id, storage_path, position, prompt_id, prompt_answer, prompts(text))')
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .not('name', 'is', null)
    .limit(20);

  const { data: candidates, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach public URLs to photos
  const withUrls = (candidates ?? []).map((c) => ({
    ...c,
    photos: (c.photos ?? [])
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        ...p,
        publicUrl: admin.storage.from('profile-photos').getPublicUrl(p.storage_path).data.publicUrl,
      })),
  }));

  return NextResponse.json({ candidates: withUrls });
}
