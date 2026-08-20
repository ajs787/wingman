export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';
import { putProfilePhoto, deleteProfilePhoto, photoWithUrl } from '@/lib/photos';

// Reorder/save round-trips whole photo records back from the client. Photos may be
// blob-backed (url + blob_pathname) or legacy (filename) — accept either so neither
// is dropped when the array is rewritten.
const reorderSchema = z.object({
  photos: z.array(
    z.object({
      position:      z.number().int().min(0).max(4),
      url:           z.string().nullable().optional(),
      blob_pathname: z.string().nullable().optional(),
      filename:      z.string().nullable().optional(),
      prompt:        z.string().max(300).nullable().optional(),
      prompt_answer: z.string().max(300).nullable().optional(),
    })
  ).max(5),
});

export async function POST(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'reorder') {
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Normalize: keep url/filename/blob_pathname so nothing is lost on rewrite.
    const photos = parsed.data.photos.map((p) => ({
      position: p.position,
      url: p.url ?? null,
      blob_pathname: p.blob_pathname ?? null,
      filename: p.filename ?? null,
      prompt: p.prompt ?? null,
      prompt_answer: p.prompt_answer ?? null,
    }));

    await connectDB();
    await User.findByIdAndUpdate(session.sub, { $set: { photos } });
    return NextResponse.json({ success: true });
  }

  // Default: upload file via multipart/form-data
  const formData = await request.formData();
  const file = formData.get('file');
  const position = parseInt(formData.get('position') ?? '0', 10);
  const prompt = formData.get('prompt') ?? null;
  const prompt_answer = formData.get('prompt_answer') ?? null;

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (isNaN(position) || position < 0 || position > 4) {
    return NextResponse.json({ error: 'Position must be 0–4' }, { status: 400 });
  }

  // Force the extension from an image MIME allow-list. Blocks stored XSS (an
  // uploaded .html/.svg would be served same-origin and execute), blocks path
  // traversal via a crafted filename, and rejects non-image uploads.
  const IMAGE_EXT = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heic',
  };
  const contentType = (file.type || '').toLowerCase();
  const ext = IMAGE_EXT[contentType];
  if (!ext) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, GIF, or HEIC images are allowed.' }, { status: 415 });
  }
  const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
  if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image must be 8 MB or smaller.' }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image must be 8 MB or smaller.' }, { status: 413 });
  }

  const userId = session.sub;
  await connectDB();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Persistent object storage (Vercel Blob). The serverless filesystem is
  // read-only/ephemeral, so we never write photos to disk.
  let uploaded;
  try {
    uploaded = await putProfilePhoto({
      userId,
      position,
      buffer: Buffer.from(arrayBuffer),
      contentType,
      ext,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }

  // Best-effort delete of whatever was at this position before.
  const existing = user.photos.find((p) => p.position === position);
  if (existing) await deleteProfilePhoto(existing);

  const newPhoto = {
    position,
    url: uploaded.url,
    blob_pathname: uploaded.pathname,
    filename: null,
    prompt: prompt || null,
    prompt_answer: prompt_answer || null,
  };

  if (existing) {
    await User.updateOne(
      { _id: userId, 'photos.position': position },
      { $set: { 'photos.$': newPhoto } }
    );
  } else {
    await User.updateOne({ _id: userId }, { $push: { photos: newPhoto } });
  }

  return NextResponse.json({ photo: photoWithUrl(newPhoto, userId) });
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const position = parseInt(searchParams.get('position') ?? '', 10);
  if (isNaN(position)) return NextResponse.json({ error: 'Missing position' }, { status: 400 });

  const userId = session.sub;
  await connectDB();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const photo = user.photos.find((p) => p.position === position);
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  await deleteProfilePhoto(photo);
  await User.updateOne({ _id: userId }, { $pull: { photos: { position } } });
  return NextResponse.json({ success: true });
}
