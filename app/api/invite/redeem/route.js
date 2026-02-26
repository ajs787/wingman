import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

async function getAuthedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

const redeemSchema = z.object({
  code: z.string().min(1).max(20),
});

export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code format' }, { status: 422 });

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from('invite_codes')
    .select('*')
    .eq('code', parsed.data.code.toUpperCase())
    .single();

  if (!invite) return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 });

  // Expired?
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite code has expired.' }, { status: 410 });
  }

  // Already used?
  if (invite.uses >= invite.max_uses) {
    return NextResponse.json({ error: 'This invite code has already been used.' }, { status: 410 });
  }

  // Cannot redeem your own code
  if (invite.owner_user_id === user.id) {
    return NextResponse.json({ error: 'You cannot be your own wingman.' }, { status: 400 });
  }

  // Create delegation (idempotent upsert by unique constraint)
  const { error: delError } = await admin
    .from('delegations')
    .upsert(
      {
        owner_user_id: invite.owner_user_id,
        delegate_user_id: user.id,
        status: 'active',
      },
      { onConflict: 'owner_user_id,delegate_user_id', ignoreDuplicates: false }
    );

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

  // Increment uses
  await admin
    .from('invite_codes')
    .update({ uses: invite.uses + 1 })
    .eq('code', invite.code);

  // Fetch owner profile for confirmation
  const { data: owner } = await admin
    .from('profiles')
    .select('id, name, netid')
    .eq('id', invite.owner_user_id)
    .single();

  return NextResponse.json({ success: true, owner });
}
