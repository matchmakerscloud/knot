import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config/index.js';

export type StorageNamespace = 'voice' | 'photo' | 'doc';

export interface SignedUploadUrl {
  url: string;
  key: string;
  expiresIn: number;
  contentType: string;
}

export interface SignedDownloadUrl {
  url: string;
  expiresIn: number;
}

const SIGNED_PUT_TTL = 5 * 60;   // 5 min — narrow window for direct browser PUT
const SIGNED_GET_TTL = 5 * 60;   // 5 min — per spec, audio playback start signed-url TTL

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/ogg; codecs=opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
]);

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

class StorageService {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    });
  }

  /**
   * Build a deterministic, namespace-prefixed object key.
   * Includes a random component so even multiple uploads from the same user/resource don't collide.
   */
  buildKey(namespace: StorageNamespace, ownerId: string, resourceId: string, ext: string): string {
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8) || 'bin';
    return `${namespace}/${ownerId}/${resourceId}/${randomUUID()}.${safeExt}`;
  }

  validateAudioContentType(contentType: string): void {
    if (!ALLOWED_AUDIO_TYPES.has(contentType.toLowerCase())) {
      throw new Error(`storage.audio.unsupported_content_type:${contentType}`);
    }
  }

  validateImageContentType(contentType: string): void {
    if (!ALLOWED_IMAGE_TYPES.has(contentType.toLowerCase())) {
      throw new Error(`storage.image.unsupported_content_type:${contentType}`);
    }
  }

  async signUpload(opts: {
    namespace: StorageNamespace;
    ownerId: string;
    resourceId: string;
    extension: string;
    contentType: string;
    contentLength?: number;
  }): Promise<SignedUploadUrl> {
    if (opts.namespace === 'voice') this.validateAudioContentType(opts.contentType);
    if (opts.namespace === 'photo') this.validateImageContentType(opts.contentType);

    const key = this.buildKey(opts.namespace, opts.ownerId, opts.resourceId, opts.extension);
    const cmd = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      ContentType: opts.contentType,
      ...(opts.contentLength ? { ContentLength: opts.contentLength } : {}),
      Metadata: {
        ownerId: opts.ownerId,
        resourceId: opts.resourceId,
        namespace: opts.namespace,
      },
    });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: SIGNED_PUT_TTL });
    return { url, key, expiresIn: SIGNED_PUT_TTL, contentType: opts.contentType };
  }

  async signDownload(key: string, ttlSeconds: number = SIGNED_GET_TTL): Promise<SignedDownloadUrl> {
    const cmd = new GetObjectCommand({ Bucket: config.s3.bucket, Key: key });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
    return { url, expiresIn: ttlSeconds };
  }

  async putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({ Bucket: config.s3.bucket, Key: key });
    const out = await this.client.send(cmd);
    if (!out.Body) throw new Error('storage.get.empty_body');
    const chunks: Buffer[] = [];
    for await (const chunk of out.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: config.s3.bucket, Key: key }));
      return true;
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
  }
}

let cached: StorageService | undefined;
export function getStorage(): StorageService {
  if (!cached) cached = new StorageService();
  return cached;
}

export type { StorageService };
