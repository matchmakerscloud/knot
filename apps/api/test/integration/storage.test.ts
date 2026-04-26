import { describe, it, expect, beforeAll } from 'vitest';
import { getStorage } from '../../src/shared/storage/index.js';

const storage = getStorage();

describe('Storage (MinIO via S3 SDK)', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const resourceId = '00000000-0000-0000-0000-000000000002';

  beforeAll(() => {
    // Bucket is created by docker compose (minio-init service)
  });

  it('puts and gets an object', async () => {
    const key = storage.buildKey('voice', userId, resourceId, 'webm');
    await storage.putObject(key, Buffer.from('test-audio-bytes'), 'audio/webm');
    expect(await storage.exists(key)).toBe(true);
    const fetched = await storage.getObject(key);
    expect(fetched.toString()).toBe('test-audio-bytes');
    await storage.deleteObject(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it('signs a PUT URL for a voice upload', async () => {
    const out = await storage.signUpload({
      namespace: 'voice',
      ownerId: userId,
      resourceId,
      extension: 'webm',
      contentType: 'audio/webm',
    });
    expect(out.url).toContain('http');
    expect(out.url).toContain('X-Amz-Signature');
    expect(out.key).toMatch(/^voice\/.*\.webm$/);
    expect(out.expiresIn).toBe(300);
  });

  it('signs a GET URL for an existing object', async () => {
    const key = storage.buildKey('photo', userId, resourceId, 'jpg');
    await storage.putObject(key, Buffer.from('fake-image'), 'image/jpeg');
    const out = await storage.signDownload(key);
    expect(out.url).toContain('X-Amz-Signature');
    await storage.deleteObject(key);
  });

  it('rejects unsupported audio content types', async () => {
    await expect(
      storage.signUpload({
        namespace: 'voice',
        ownerId: userId,
        resourceId,
        extension: 'avi',
        contentType: 'video/x-msvideo',
      }),
    ).rejects.toThrow(/unsupported_content_type/);
  });

  it('rejects unsupported image content types', async () => {
    await expect(
      storage.signUpload({
        namespace: 'photo',
        ownerId: userId,
        resourceId,
        extension: 'gif',
        contentType: 'image/gif',
      }),
    ).rejects.toThrow(/unsupported_content_type/);
  });
});
