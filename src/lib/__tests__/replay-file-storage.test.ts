/**
 * Tests for Replay File Storage utility
 * Tests the Vercel Blob storage functions for replay files
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  list: vi.fn(),
  del: vi.fn(),
  getDownloadUrl: vi.fn(),
}));

import { put, list, del, getDownloadUrl } from '@vercel/blob';
import {
  storeReplayFile,
  getReplayDownloadUrl,
  deleteReplayFile,
  replayFileExists,
  listUserReplayFiles,
  deleteAllUserReplayFiles,
} from '../replay-file-storage';

describe('replay-file-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeReplayFile', () => {
    it('should store a replay file and return the blob URL', async () => {
      const mockUrl = 'https://blob.vercel-storage.com/user-replays/123/abc/test.SC2Replay';
      (put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ url: mockUrl });

      const buffer = Buffer.from('fake replay content');
      const result = await storeReplayFile('123', 'abc', 'test.SC2Replay', buffer);

      expect(result).toBe(mockUrl);
      expect(put).toHaveBeenCalledWith(
        'user-replays/123/abc/test.SC2Replay',
        buffer,
        {
          access: 'public',
          contentType: 'application/octet-stream',
          addRandomSuffix: false,
        }
      );
    });

    it('should sanitize filename with special characters', async () => {
      const mockUrl = 'https://blob.vercel-storage.com/test';
      (put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ url: mockUrl });

      const buffer = Buffer.from('fake replay content');
      await storeReplayFile('123', 'abc', 'Tokamak LE (32).SC2Replay', buffer);

      expect(put).toHaveBeenCalledWith(
        'user-replays/123/abc/Tokamak_LE__32_.SC2Replay',
        buffer,
        expect.any(Object)
      );
    });

    it('should handle filenames with Unicode characters', async () => {
      const mockUrl = 'https://blob.vercel-storage.com/test';
      (put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ url: mockUrl });

      const buffer = Buffer.from('fake replay content');
      await storeReplayFile('123', 'abc', '한글맵.SC2Replay', buffer);

      // Unicode characters get replaced with underscores
      expect(put).toHaveBeenCalledWith(
        'user-replays/123/abc/___.SC2Replay',
        buffer,
        expect.any(Object)
      );
    });
  });

  describe('getReplayDownloadUrl', () => {
    it('should return the download URL from blob', () => {
      const blobUrl = 'https://blob.vercel-storage.com/test.SC2Replay';
      const downloadUrl = 'https://download.blob.vercel-storage.com/test.SC2Replay';
      (getDownloadUrl as ReturnType<typeof vi.fn>).mockReturnValueOnce(downloadUrl);

      const result = getReplayDownloadUrl(blobUrl);

      expect(result).toBe(downloadUrl);
      expect(getDownloadUrl).toHaveBeenCalledWith(blobUrl);
    });
  });

  describe('deleteReplayFile', () => {
    it('should delete a replay file by URL', async () => {
      (del as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const blobUrl = 'https://blob.vercel-storage.com/test.SC2Replay';
      await deleteReplayFile(blobUrl);

      expect(del).toHaveBeenCalledWith(blobUrl);
    });

    it('should not throw on delete error', async () => {
      (del as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Delete failed'));

      const blobUrl = 'https://blob.vercel-storage.com/test.SC2Replay';

      // Should not throw
      await expect(deleteReplayFile(blobUrl)).resolves.toBeUndefined();
    });
  });

  describe('replayFileExists', () => {
    it('should return true when file exists', async () => {
      (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        blobs: [{ url: 'https://blob.vercel-storage.com/test' }],
      });

      const result = await replayFileExists('123', 'abc');

      expect(result).toBe(true);
      expect(list).toHaveBeenCalledWith({
        prefix: 'user-replays/123/abc/',
        limit: 1,
      });
    });

    it('should return false when file does not exist', async () => {
      (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        blobs: [],
      });

      const result = await replayFileExists('123', 'abc');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (list as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('List failed'));

      const result = await replayFileExists('123', 'abc');

      expect(result).toBe(false);
    });
  });

  describe('listUserReplayFiles', () => {
    it('should list all replay files for a user', async () => {
      const mockBlobs = [
        { url: 'https://blob.vercel-storage.com/file1', pathname: 'user-replays/123/a/test1.SC2Replay', size: 100 },
        { url: 'https://blob.vercel-storage.com/file2', pathname: 'user-replays/123/b/test2.SC2Replay', size: 200 },
      ];
      (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ blobs: mockBlobs });

      const result = await listUserReplayFiles('123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        url: 'https://blob.vercel-storage.com/file1',
        pathname: 'user-replays/123/a/test1.SC2Replay',
        size: 100,
      });
      expect(list).toHaveBeenCalledWith({ prefix: 'user-replays/123/' });
    });

    it('should return empty array on error', async () => {
      (list as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('List failed'));

      const result = await listUserReplayFiles('123');

      expect(result).toEqual([]);
    });

    it('should return empty array when no files exist', async () => {
      (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ blobs: [] });

      const result = await listUserReplayFiles('123');

      expect(result).toEqual([]);
    });
  });

  describe('deleteAllUserReplayFiles', () => {
    it('should delete all replay files for a user', async () => {
      const mockBlobs = [
        { url: 'https://blob.vercel-storage.com/file1', pathname: 'test1', size: 100 },
        { url: 'https://blob.vercel-storage.com/file2', pathname: 'test2', size: 200 },
      ];
      (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ blobs: mockBlobs });
      (del as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await deleteAllUserReplayFiles('123');

      expect(result).toBe(2);
      expect(del).toHaveBeenCalledTimes(2);
      expect(del).toHaveBeenCalledWith('https://blob.vercel-storage.com/file1');
      expect(del).toHaveBeenCalledWith('https://blob.vercel-storage.com/file2');
    });

    it('should return 0 when no files exist', async () => {
      (list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ blobs: [] });

      const result = await deleteAllUserReplayFiles('123');

      expect(result).toBe(0);
      expect(del).not.toHaveBeenCalled();
    });
  });
});
