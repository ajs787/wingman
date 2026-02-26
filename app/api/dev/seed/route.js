import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Only available in development
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const DEMO_PROFILES = [
    { name: 'Jordan Lee', age: 21, year: 'Junior', major: 'Computer Science', gender: 'Man', looking_for: 'Everyone', personality_answer: 'Night owl 🦉' },
    { name: 'Morgan Kim', age: 20, year: 'Sophomore', major: 'Biology', gender: 'Woman', looking_for: 'Men', personality_answer: 'Early bird 🌅' },
    { name: 'Taylor Patel', age: 22, year: 'Senior', major: 'Psychology', gender: 'Non-binary', looking_for: 'Everyone', personality_answer: 'Ambivert ⚖️' },
    { name: 'Casey Williams', age: 19, year: 'Freshman', major: 'Economics', gender: 'Man', looking_for: 'Women', personality_answer: 'Extrovert 🎉' },
    { name: 'Riley Nguyen', age: 21, year: 'Junior', major: 'Math', gender: 'Woman', looking_for: 'Everyone', personality_answer: 'Introvert 🏡' },
    { name: 'Avery Chen', age: 23, year: 'Graduate', major: 'Statistics', gender: 'Man', looking_for: 'Everyone', personality_answer: 'Night owl 🦉' },
    { name: 'Quinn Santos', age: 20, year: 'Sophomore', major: 'Art & Design', gender: 'Woman', looking_for: 'Women', personality_answer: 'Early bird 🌅' },
    { name: 'Blake Okonjo', age: 22, year: 'Senior', major: 'History', gender: 'Man', looking_for: 'Women', personality_answer: 'Extrovert 🎉' },
    { name: 'Skyler Zhang', age: 21, year: 'Junior', major: 'Physics', gender: 'Non-binary', looking_for: 'Everyone', personality_answer: 'Ambivert ⚖️' },
    { name: 'Drew Hoffman', age: 20, year: 'Sophomore', major: 'Business', gender: 'Man', looking_for: 'Everyone', personality_answer: 'Introvert 🏡' },
  ];

  const created = [];
  const errors = [];

  for (let i = 0; i < DEMO_PROFILES.length; i++) {
    const demoInfo = DEMO_PROFILES[i];
    const netid = `demo_${demoInfo.name.toLowerCase().replace(/\s/g, '_')}`;
    const email = `${netid}@scarletmail.rutgers.edu`;

    // Create auth user (or get existing)
    const { data: authData, error: authCreateErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { netid },
    });

    let userId;
    if (authCreateErr) {
      if (authCreateErr.message?.includes('already been registered')) {
        // Get existing user
        const { data: listData } = await admin.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email === email);
        if (!existing) { errors.push(`${netid}: ${authCreateErr.message}`); continue; }
        userId = existing.id;
      } else {
        errors.push(`${netid}: ${authCreateErr.message}`);
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    // Upsert profile
    const { error: profErr } = await admin
      .from('profiles')
      .upsert({ id: userId, netid, email, ...demoInfo }, { onConflict: 'id' });

    if (profErr) { errors.push(`profile ${netid}: ${profErr.message}`); continue; }

    // Add placeholder photos (use a gradient color placeholder stored as text path)
    for (let pos = 0; pos < 5; pos++) {
      await admin
        .from('photos')
        .upsert(
          {
            user_id: userId,
            storage_path: `seed/placeholder-${pos}.jpg`,
            position: pos,
          },
          { onConflict: 'user_id,position' }
        );
    }

    created.push({ id: userId, netid, name: demoInfo.name });
  }

  // Create delegations: current user as delegate for first 2 demo profiles
  const delegatesFor = created.slice(0, 2);
  for (const owner of delegatesFor) {
    const { error: delErr } = await admin
      .from('delegations')
      .upsert(
        {
          owner_user_id: owner.id,
          delegate_user_id: user.id,
          status: 'active',
        },
        { onConflict: 'owner_user_id,delegate_user_id' }
      );
    if (delErr) errors.push(`delegation for ${owner.netid}: ${delErr.message}`);
  }

  return NextResponse.json({
    success: true,
    created: created.length,
    delegations_created: delegatesFor.length,
    delegated_for: delegatesFor.map((d) => d.name),
    errors,
  });
}
