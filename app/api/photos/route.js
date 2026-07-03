export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/auth';

function photoWithUrl(photo, userId) {
  return {
    ...photo,
    url: photo.filename ? `/uploads/${userId}/${photo.filename}` : null,
  };
}

const reorderSchema = z.object({
  photos: z.array(
    z.object({
      position:      z.number().int().min(0).max(4),
      filename:      z.string(),
      prompt:        z.string().max(300).nullable().optional(),
      prompt_answer: z.string().max(300).nullable().optional(),
    })
  ).max(5),
});

export async function POST(request) {
  const session = getSession(request);
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

    await connectDB();
    await User.findByIdAndUpdate(session.sub, { $set: { photos: parsed.data.photos } });
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
  const ext = IMAGE_EXT[(file.type || '').toLowerCase()];
  if (!ext) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, GIF, or HEIC images are allowed.' }, { status: 415 });
  }
  const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
  if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image must be 8 MB or smaller.' }, { status: 413 });
  }

  const userId = session.sub;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);
  await mkdir(uploadDir, { recursive: true });

  await connectDB();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Delete old file at this position
  const existing = user.photos.find((p) => p.position === position);
  if (existing?.filename) {
    const oldPath = path.join(uploadDir, existing.filename);
    await unlink(oldPath).catch(() => {});
  }

  // Save new file (ext is the validated image extension from the allow-list above)
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `${position}-${random}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image must be 8 MB or smaller.' }, { status: 413 });
  }
  await writeFile(filePath, Buffer.from(arrayBuffer));

  // Update photos array in MongoDB
  const newPhoto = { position, filename, prompt: prompt || null, prompt_answer: prompt_answer || null };

  if (existing) {
    await User.updateOne(
      { _id: userId, 'photos.position': position },
      { $set: { 'photos.$': newPhoto } }
    );
  } else {
    await User.updateOne({ _id: userId }, { $push: { photos: newPhoto } });
  }

  return NextResponse.json({
    photo: { ...newPhoto, url: `/uploads/${userId}/${filename}` },
  });
}

export async function DELETE(request) {
  const session = getSession(request);
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

  if (photo.filename) {
    const filePath = path.join(process.cwd(), 'public', 'uploads', userId, photo.filename);
    await unlink(filePath).catch(() => {});
  }

  await User.updateOne({ _id: userId }, { $pull: { photos: { position } } });
  return NextResponse.json({ success: true });
}
