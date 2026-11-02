import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { supabase } from '../supabase/supabase.client';

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
];

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Public URL -> object name inside the `products` bucket. */
export function storageObjectName(url: string): string | null {
  if (!url) return null;
  const marker = '/products/';
  const index = url.lastIndexOf(marker);
  if (index === -1) return null;
  const name = url.slice(index + marker.length).split('?')[0];
  return name ? decodeURIComponent(name) : null;
}

/**
 * Uploads one image to the shared `products` bucket under a unique name, so
 * replacing an image never serves a stale CDN copy. Returns its public URL.
 */
export async function uploadImageToBucket(
  file: UploadedImage,
  prefix: string,
): Promise<string> {
  if (!file) throw new BadRequestException('No file was received');
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      'Only JPEG, PNG, WebP, AVIF and SVG images are allowed',
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestException('Images must be 5 MB or smaller');
  }

  const ext = EXTENSION_BY_TYPE[file.mimetype] || 'jpeg';
  const objectName = `${prefix}-${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('products')
    .upload(objectName, file.buffer, {
      upsert: false,
      contentType: file.mimetype,
    });
  if (error) {
    throw new BadRequestException(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from('products').getPublicUrl(objectName);
  return data.publicUrl;
}

/** Removes an uploaded object, but only if it is one of ours. */
export async function removeUploadedImage(url: string | null | undefined) {
  const objectName = storageObjectName(url || '');
  if (!objectName) return;
  await supabase.storage.from('products').remove([objectName]);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
