import { put, del } from '@vercel/blob';

// Single source of truth for turning a stored photo record into a servable URL.
//
// New uploads live in Vercel Blob and store a full https `url`. Legacy photos
// (committed under public/uploads/) only have a `filename` and are served from
// /uploads/{userId}/{filename}. Prefer the blob url; fall back to legacy.
export function resolvePhotoUrl(photo, userId) {
  if (!photo) return null;
  if (photo.url) return photo.url;
  return photo.filename ? `/uploads/${userId}/${photo.filename}` : null;
}

// Same, but returns the photo object decorated with a resolved `url` (used by the
// endpoints that hand whole photo records back to the client).
export function photoWithUrl(photo, userId) {
  return { ...photo, url: resolvePhotoUrl(photo, userId) };
}

// Resolve the Blob read/write token. Prefer the SDK default, but also accept the
// prefixed name Vercel injects when a store is connected under a custom name
// (e.g. a store named "photos" → PHOTOS_READ_WRITE_TOKEN). This lets both local
// dev and the Vercel deployment work without hand-renaming env vars.
function blobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find(
    (k) => /_READ_WRITE_TOKEN$/.test(k) && (process.env[k] || '').startsWith('vercel_blob_rw_')
  );
  return key ? process.env[key] : null;
}

export function isBlobConfigured() {
  return !!blobToken();
}

// Upload a profile photo buffer to Vercel Blob. Returns { url, pathname }.
// Throws a clear error if the store isn't configured so misconfig is obvious.
export async function putProfilePhoto({ userId, position, buffer, contentType, ext }) {
  const token = blobToken();
  if (!token) {
    throw new Error('Photo storage is not configured (set BLOB_READ_WRITE_TOKEN).');
  }
  const rand = Math.random().toString(36).slice(2, 8);
  const pathname = `profiles/${userId}/${position}-${Date.now()}-${rand}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    token,
  });
  return { url: blob.url, pathname: blob.pathname };
}

// Delete the blob backing a photo (best-effort). Legacy filename-only photos live
// in the read-only deployment bundle and have nothing to delete here.
export async function deleteProfilePhoto(photo) {
  const target = photo?.url;
  const token = blobToken();
  if (!target || !token) return;
  // Only our blob URLs are deletable via the API; skip anything else.
  if (!/\.public\.blob\.vercel-storage\.com\//.test(target) && !photo?.blob_pathname) return;
  try {
    await del(target, { token });
  } catch {
    // Non-fatal: a failed blob delete just leaves an orphaned object.
  }
}
