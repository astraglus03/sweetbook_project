import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ExternalApiException } from '../exceptions';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(configService: ConfigService) {
    const url = configService.getOrThrow<string>('SUPABASE_URL').replace(/\/$/, '');
    const key = configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = configService.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.publicBase = `${url}/storage/v1/object/public/${this.bucket}`;
  }

  publicUrl(objectPath: string): string {
    return `${this.publicBase}/${objectPath.replace(/^\/+/, '')}`;
  }

  getPublicBase(): string {
    return this.publicBase;
  }

  async upload(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const normalized = objectPath.replace(/^\/+/, '');
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(normalized, body, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });
    if (error) {
      this.logger.error(
        `Supabase upload failed: ${normalized} (${error.message})`,
      );
      throw new ExternalApiException(
        'STORAGE_UPLOAD_FAILED',
        `스토리지 업로드에 실패했습니다: ${error.message}`,
      );
    }
    return this.publicUrl(normalized);
  }

  async download(objectPath: string): Promise<Buffer> {
    const normalized = objectPath.replace(/^\/+/, '');
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(normalized);
    if (error || !data) {
      this.logger.error(
        `Supabase download failed: ${normalized} (${error?.message ?? 'no data'})`,
      );
      throw new ExternalApiException(
        'STORAGE_DOWNLOAD_FAILED',
        `스토리지 다운로드에 실패했습니다: ${error?.message ?? 'unknown'}`,
      );
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(objectPaths: string[]): Promise<void> {
    if (objectPaths.length === 0) return;
    const normalized = objectPaths.map((p) => p.replace(/^\/+/, ''));
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove(normalized);
    if (error) {
      this.logger.warn(
        `Supabase remove failed (ignored): ${error.message} (paths=${normalized.join(',')})`,
      );
    }
  }
}
