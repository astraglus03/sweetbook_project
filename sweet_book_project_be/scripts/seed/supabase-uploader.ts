/**
 * supabase-uploader.ts
 * Supabase Storage 업로드 헬퍼. src/common/storage/storage.service.ts 와 동일한 패턴.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let bucket: string = '';
let publicBase: string = '';

export function initSupabase(): void {
  const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  bucket = process.env.SUPABASE_STORAGE_BUCKET ?? '';

  if (!url || !key || !bucket) {
    throw new Error(
      '환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET 가 필요합니다.',
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  publicBase = `${url}/storage/v1/object/public/${bucket}`;
}

export function publicUrl(objectPath: string): string {
  const normalized = objectPath.replace(/^\/+/, '');
  return `${publicBase}/${normalized}`;
}

/**
 * 버퍼를 Supabase Storage에 업로드하고 public URL을 반환한다.
 * Photo.filename 컬럼에는 이 public URL 전체를 저장한다.
 */
export async function uploadFile(
  buffer: Buffer,
  objectPath: string,
  contentType: string,
): Promise<string> {
  if (!client) initSupabase();

  const normalized = objectPath.replace(/^\/+/, '');
  const { error } = await client!.storage.from(bucket).upload(normalized, buffer, {
    contentType,
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(`Supabase 업로드 실패: ${normalized} — ${error.message}`);
  }

  return publicUrl(normalized);
}
