import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { transferApi } from '../../src/core/api/transferApi';
import {
  deleteProfileAvatar,
  getAvatarReadUrl,
  resolveAvatarMimeType,
  uploadProfileAvatar,
} from '../../src/core/user/actions/avatar.actions';
import {
  AvatarError,
  MAX_AVATAR_SIZE_BYTES,
} from '../../src/core/user/interface/avatar.interface';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('avatar.actions (S3 presigned upload flow)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('resolveAvatarMimeType', () => {
    it('normalizes allowed mime types and falls back to file extension', () => {
      expect(resolveAvatarMimeType('image/jpeg')).toBe('image/jpeg');
      expect(resolveAvatarMimeType('image/jpg')).toBe('image/jpeg');
      expect(resolveAvatarMimeType('IMAGE/PNG; charset=utf-8')).toBe('image/png');
      expect(resolveAvatarMimeType('image/webp')).toBe('image/webp');
      expect(resolveAvatarMimeType(null, 'file:///tmp/photo.webp?v=1')).toBe('image/webp');
      expect(resolveAvatarMimeType(undefined, 'file:///tmp/photo.jpeg')).toBe('image/jpeg');
    });

    it('rejects unsupported formats', () => {
      expect(resolveAvatarMimeType('image/gif')).toBeNull();
      expect(resolveAvatarMimeType('application/pdf', 'file:///tmp/doc.pdf')).toBeNull();
      expect(resolveAvatarMimeType(null, 'file:///tmp/photo.bmp')).toBeNull();
    });
  });

  describe('uploadProfileAvatar', () => {
    it('executes presign -> PUT S3 with Content-Type -> confirm', async () => {
      const key =
        'profiles/drivers/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg';

      vi.mocked(transferApi.post)
        .mockResolvedValueOnce({
          data: {
            data: {
              key,
              upload_url: 'https://s3.example.com/presigned-put',
              method: 'PUT',
              headers: { 'Content-Type': 'image/jpeg' },
              expires_in: 300,
              expires_at: '2026-11-19T22:45:00.000Z',
              max_bytes: MAX_AVATAR_SIZE_BYTES,
            },
          },
        } as never)
        .mockResolvedValueOnce({
          data: {
            data: {
              id: '11111111-1111-4111-8111-111111111111',
              avatar_url: 'https://s3.example.com/presigned-get',
              avatar_url_expires_at: '2026-11-19T23:00:00.000Z',
            },
          },
        } as never);

      const mockBlob = { size: 120_000 } as Blob;
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({ blob: async () => mockBlob } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response);
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const result = await uploadProfileAvatar({
        fileUri: 'file:///cache/avatar.jpg',
        mimeType: 'image/jpg',
        fileSize: 120_000,
      });

      expect(transferApi.post).toHaveBeenNthCalledWith(1, '/users/me/avatar/upload-url', {
        content_type: 'image/jpeg',
        content_length: 120_000,
      });
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'file:///cache/avatar.jpg');
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://s3.example.com/presigned-put',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: mockBlob,
        }),
      );
      expect(transferApi.post).toHaveBeenNthCalledWith(2, '/users/me/avatar/confirm', { key });
      expect(result.data.avatar_url).toBe('https://s3.example.com/presigned-get');
    });

    it('rejects unsupported file formats before calling backend', async () => {
      await expect(
        uploadProfileAvatar({
          fileUri: 'file:///cache/avatar.gif',
          mimeType: 'image/gif',
          fileSize: 50_000,
        }),
      ).rejects.toMatchObject({
        name: 'AvatarError',
        code: 'INVALID_FILE_TYPE',
      });

      expect(transferApi.post).not.toHaveBeenCalled();
    });

    it('rejects files larger than 5 MB before requesting upload URL', async () => {
      await expect(
        uploadProfileAvatar({
          fileUri: 'file:///cache/large.png',
          mimeType: 'image/png',
          fileSize: MAX_AVATAR_SIZE_BYTES + 1,
        }),
      ).rejects.toMatchObject({
        name: 'AvatarError',
        code: 'FILE_TOO_LARGE',
      });

      expect(transferApi.post).not.toHaveBeenCalled();
    });

    it('rejects if actual blob size exceeds 5 MB and does not upload to S3', async () => {
      vi.mocked(transferApi.post).mockResolvedValueOnce({
        data: {
          data: {
            key: 'profiles/drivers/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png',
            upload_url: 'https://s3.example.com/presigned-put',
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            expires_in: 300,
            expires_at: '2026-11-19T22:45:00.000Z',
            max_bytes: MAX_AVATAR_SIZE_BYTES,
          },
        },
      } as never);

      const mockFetch = vi.fn().mockResolvedValueOnce({
        blob: async () => ({ size: MAX_AVATAR_SIZE_BYTES + 500 } as Blob),
      } as Response);
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(
        uploadProfileAvatar({
          fileUri: 'file:///cache/large.png',
          mimeType: 'image/png',
        }),
      ).rejects.toMatchObject({
        name: 'AvatarError',
        code: 'FILE_TOO_LARGE',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(transferApi.post).toHaveBeenCalledTimes(1);
    });

    it('does not call confirm when direct PUT to S3 fails', async () => {
      vi.mocked(transferApi.post).mockResolvedValueOnce({
        data: {
          data: {
            key: 'profiles/drivers/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp',
            upload_url: 'https://s3.example.com/presigned-put',
            method: 'PUT',
            headers: { 'Content-Type': 'image/webp' },
            expires_in: 300,
            expires_at: '2026-11-19T22:45:00.000Z',
            max_bytes: MAX_AVATAR_SIZE_BYTES,
          },
        },
      } as never);

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({ blob: async () => ({ size: 20_000 } as Blob) } as Response)
        .mockResolvedValueOnce({ ok: false, status: 403 } as Response);
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      await expect(
        uploadProfileAvatar({
          fileUri: 'file:///cache/avatar.webp',
          mimeType: 'image/webp',
          fileSize: 20_000,
        }),
      ).rejects.toMatchObject({
        name: 'AvatarError',
        code: 'S3_UPLOAD_FAILED',
        status: 403,
      });

      expect(transferApi.post).toHaveBeenCalledTimes(1);
    });

    it('maps aborted upload to UPLOAD_CANCELLED', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        uploadProfileAvatar(
          {
            fileUri: 'file:///cache/avatar.jpg',
            mimeType: 'image/jpeg',
            fileSize: 10_000,
          },
          controller.signal,
        ),
      ).rejects.toBeInstanceOf(AvatarError);

      await expect(
        uploadProfileAvatar(
          {
            fileUri: 'file:///cache/avatar.jpg',
            mimeType: 'image/jpeg',
            fileSize: 10_000,
          },
          controller.signal,
        ),
      ).rejects.toMatchObject({ code: 'UPLOAD_CANCELLED' });

      expect(transferApi.post).not.toHaveBeenCalled();
    });
  });

  describe('getAvatarReadUrl & deleteProfileAvatar', () => {
    it('renews temporary read URL via GET /users/me/avatar', async () => {
      vi.mocked(transferApi.get).mockResolvedValueOnce({
        data: {
          data: {
            avatar_url: 'https://s3.example.com/fresh-read-url',
            expires_at: '2026-11-19T23:15:00.000Z',
            expires_in: 900,
          },
        },
      } as never);

      const res = await getAvatarReadUrl();
      expect(transferApi.get).toHaveBeenCalledWith('/users/me/avatar');
      expect(res.avatar_url).toBe('https://s3.example.com/fresh-read-url');
      expect(res.expires_in).toBe(900);
    });

    it('deletes avatar via DELETE /users/me/avatar', async () => {
      vi.mocked(transferApi.delete).mockResolvedValueOnce({
        data: {
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            avatar_url: null,
            avatar_url_expires_at: null,
          },
        },
      } as never);

      const res = await deleteProfileAvatar();
      expect(transferApi.delete).toHaveBeenCalledWith('/users/me/avatar');
      expect(res.data.avatar_url).toBeNull();
    });
  });
});
