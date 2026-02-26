import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/feed';

  if (code) {
    const supabase = createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session) {
      const user = session.user;
      const email = user.email.toLowerCase();
      const netid = email.split('@')[0];

      // Upsert profile; enforce one account per netid
      const adminClient = createAdminClient();

      // Check if netid already exists with a different user id
      const { data: existing } = await adminClient
        .from('profiles')
        .select('id, netid')
        .eq('netid', netid)
        .single();

      if (existing && existing.id !== user.id) {
        // NetID conflict — different auth user
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=netid_taken&netid=${encodeURIComponent(netid)}`
        );
      }

      // Upsert profile
      await adminClient
        .from('profiles')
        .upsert(
          { id: user.id, netid, email },
          { onConflict: 'id', ignoreDuplicates: false }
        );

      // Check if onboarding is complete
      const { data: profile } = await adminClient
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const redirectTo = profile?.name ? next : '/onboarding';
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
