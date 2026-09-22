import { getS3Url } from '../config/storage.js';

function normalizeStorageKey(value: string): string {
  if (value.startsWith('s3://')) {
    const [, , ...parts] = value.split('/');
    return parts.join('/');
  }

  return value.replace(/^\/+/, '');
}

export function toPublicAssetUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return getS3Url(normalizeStorageKey(value));
}

export function serializeMediaClip<T extends Record<string, any>>(clip: T): T {
  return {
    ...clip,
    thumbnail_url: toPublicAssetUrl(clip.thumbnail_url),
    stream_url: clip.processing_status === 'completed'
      ? toPublicAssetUrl(clip.converted_storage_key || clip.storage_key)
      : undefined,
  };
}

export function serializeNodeWithMediaRow<T extends Record<string, any>>(row: T): Record<string, any> & {
  media_clip: Record<string, any> | null;
} {
  const mediaClip = row.media_clip_id
    ? serializeMediaClip({
        id: row.media_clip_id,
        original_filename: row.media_clip_original_filename,
        original_media_type: row.media_clip_original_media_type,
        converted_storage_key: row.media_clip_converted_storage_key,
        duration_ms: row.media_clip_duration_ms,
        processing_status: row.media_clip_processing_status,
        thumbnail_url: row.media_clip_thumbnail_url,
      })
    : null;

  const {
    media_clip_original_filename,
    media_clip_original_media_type,
    media_clip_thumbnail_url,
    media_clip_converted_storage_key,
    media_clip_duration_ms,
    media_clip_processing_status,
    ...node
  } = row;

  return {
    ...node,
    media_clip: mediaClip,
  };
}
