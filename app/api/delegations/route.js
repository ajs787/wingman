import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

async function getAuthedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// GET /api/delegations — list all active delegates for the current user (as owner)
export async function GET() {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('delegations')
    .select('id, status, created_at, delegate_user_id, profiles!delegations_delegate_user_id_fkey(id, name, netid)')
    .eq('owner_user_id', user.id)
    .eq('status', 'active');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also return owners that the current user is a delegate for
  const { data: asDelegate } = await admin
    .from('delegations')
    .select('id, status, created_at, owner_user_id, profiles!delegations_owner_user_id_fkey(id, name, netid)')
    .eq('delegate_user_id', user.id)
    .eq('status', 'active');

  return NextResponse.json({ delegates: data ?? [], owners: asDelegate ?? [] });
}

const revokeSchema = z.object({
  delegation_id: z.number().int(),
});

// DELETE /api/delegations — revoke a delegation (owner only)
export async function DELETE(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid delegation_id' }, { status: 422 });

  const admin = createAdminClient();

  // Verify ownership before revoke
  const { data: delegation } = await admin
    .from('delegations')
    .select('id, owner_user_id')
    .eq('id', parsed.data.delegation_id)
    .single();

  if (!delegation) return NextResponse.json({ error: 'Delegation not found' }, { status: 404 });
  if (delegation.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin
    .from('delegations')
    .update({ status: 'revoked' })
    .eq('id', parsed.data.delegation_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
