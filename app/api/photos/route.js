import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

async function getAuthedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// POST /api/photos/reorder — update photo positions metadata only
const reorderSchema = z.object({
  photos: z.array(
    z.object({
      id: z.number(),
      position: z.number().int().min(0).max(4),
      prompt_id: z.number().nullable().optional(),
      prompt_answer: z.string().max(300).nullable().optional(),
    })
  ).length(5),
});

export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'reorder') {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const admin = createAdminClient();
    // Verify all photos belong to user
    const ids = parsed.data.photos.map((p) => p.id);
    const { data: existing } = await admin
      .from('photos')
      .select('id')
      .eq('user_id', user.id)
      .in('id', ids);

    if (!existing || existing.length !== ids.length) {
      return NextResponse.json({ error: 'Photo ownership check failed' }, { status: 403 });
    }

    // Upsert positions
    for (const photo of parsed.data.photos) {
      await admin
        .from('photos')
        .update({
          position: photo.position,
          prompt_id: photo.prompt_id ?? null,
          prompt_answer: photo.prompt_answer ?? null,
        })
        .eq('id', photo.id)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
  }

  // Default: upload photo. Expects multipart/form-data
  const formData = await request.formData();
  const file = formData.get('file');
  const position = parseInt(formData.get('position') ?? '0', 10);

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (isNaN(position) || position < 0 || position > 4) {
    return NextResponse.json({ error: 'Position must be 0–4' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Delete existing photo at this position (storage + db record)
  const { data: oldPhoto } = await admin
    .from('photos')
    .select('id, storage_path')
    .eq('user_id', user.id)
    .eq('position', position)
    .single();

  if (oldPhoto) {
    await admin.storage.from('profile-photos').remove([oldPhoto.storage_path]);
    await admin.from('photos').delete().eq('id', oldPhoto.id);
  }

  // Upload new file
  const ext = file.name?.split('.').pop() || 'jpg';
  const random = Math.random().toString(36).slice(2, 8);
  const storagePath = `${user.id}/${position}-${random}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from('profile-photos')
    .upload(storagePath, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Insert db record
  const { data: photoRecord, error: dbError } = await admin
    .from('photos')
    .insert({ user_id: user.id, storage_path: storagePath, position })
    .select()
    .single();

  if (dbError) {
    await admin.storage.from('profile-photos').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage
    .from('profile-photos')
    .getPublicUrl(storagePath);

  return NextResponse.json({ photo: { ...photoRecord, publicUrl } });
}

export async function DELETE(request) {
  const supabase = createServerSupabaseClient();
  const user = await getAuthedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const photoId = parseInt(searchParams.get('id') ?? '', 10);
  if (isNaN(photoId)) return NextResponse.json({ error: 'Missing photo id' }, { status: 400 });

  const admin = createAdminClient();
  const { data: photo } = await admin
    .from('photos')
    .select('id, storage_path')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single();

  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await admin.storage.from('profile-photos').remove([photo.storage_path]);
  await admin.from('photos').delete().eq('id', photoId);

  return NextResponse.json({ success: true });
}
