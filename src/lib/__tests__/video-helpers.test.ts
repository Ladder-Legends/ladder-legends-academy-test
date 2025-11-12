/**
 * Tests for video helper functions
 */

import {
  getVideoIds,
  isPlaylist,
  hasVideos,
  getFirstVideoId,
  getVideoUrl,
  getContentVideoUrl,
} from '../video-helpers';
import type { VideoReference } from '../video-helpers';

describe('getVideoIds', () => {
  it('should return video IDs from content', () => {
    const content: VideoReference = { videoIds: ['abc', 'def'] };
    expect(getVideoIds(content)).toEqual(['abc', 'def']);
  });

  it('should return empty array for content without videoIds', () => {
    const content: VideoReference = { videoIds: [] };
    expect(getVideoIds(content)).toEqual([]);
  });

  it('should return empty array when videoIds is undefined', () => {
    const content = {} as VideoReference;
    expect(getVideoIds(content)).toEqual([]);
  });
});

describe('isPlaylist', () => {
  it('should return true for content with multiple videos', () => {
    const content: VideoReference = { videoIds: ['a', 'b'] };
    expect(isPlaylist(content)).toBe(true);
  });

  it('should return false for content with single video', () => {
    const content: VideoReference = { videoIds: ['a'] };
    expect(isPlaylist(content)).toBe(false);
  });

  it('should return false for content with no videos', () => {
    const content: VideoReference = { videoIds: [] };
    expect(isPlaylist(content)).toBe(false);
  });

  it('should return true for content with many videos', () => {
    const content: VideoReference = { videoIds: ['a', 'b', 'c', 'd', 'e'] };
    expect(isPlaylist(content)).toBe(true);
  });
});

describe('hasVideos', () => {
  it('should return true for content with videos', () => {
    const content: VideoReference = { videoIds: ['a', 'b'] };
    expect(hasVideos(content)).toBe(true);
  });

  it('should return true for content with single video', () => {
    const content: VideoReference = { videoIds: ['a'] };
    expect(hasVideos(content)).toBe(true);
  });

  it('should return false for content without videos', () => {
    const content: VideoReference = { videoIds: [] };
    expect(hasVideos(content)).toBe(false);
  });
});

describe('getFirstVideoId', () => {
  it('should return first video ID', () => {
    const content: VideoReference = { videoIds: ['a', 'b', 'c'] };
    expect(getFirstVideoId(content)).toBe('a');
  });

  it('should return only video ID for single video', () => {
    const content: VideoReference = { videoIds: ['xyz'] };
    expect(getFirstVideoId(content)).toBe('xyz');
  });

  it('should return undefined for empty videoIds', () => {
    const content: VideoReference = { videoIds: [] };
    expect(getFirstVideoId(content)).toBeUndefined();
  });
});

describe('getVideoUrl', () => {
  it('should return library URL for video ID', () => {
    expect(getVideoUrl('abc123', true)).toBe('/library/abc123');
  });

  it('should return same URL regardless of isFree flag', () => {
    expect(getVideoUrl('abc123', true)).toBe('/library/abc123');
    expect(getVideoUrl('abc123', false)).toBe('/library/abc123');
  });

  it('should handle special characters in video ID', () => {
    expect(getVideoUrl('abc-123_xyz', false)).toBe('/library/abc-123_xyz');
  });
});

describe('getContentVideoUrl', () => {
  const mockVideos = [
    { id: 'video-1', source: 'youtube' },
    { id: 'video-2', source: 'mux' },
    { id: 'playlist-1', source: 'playlist', videoIds: ['video-1', 'video-2'] },
    { id: 'playlist-2', source: 'playlist', videoIds: ['video-3', 'video-4'] },
  ];

  it('should return undefined for content without videos', () => {
    const content: VideoReference & { isFree?: boolean } = { videoIds: [] };
    expect(getContentVideoUrl(content, mockVideos)).toBeUndefined();
  });

  it('should return undefined for content with undefined videoIds', () => {
    const content = {} as VideoReference & { isFree?: boolean };
    expect(getContentVideoUrl(content, mockVideos)).toBeUndefined();
  });

  it('should find playlist containing the video ID', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['video-1'],
      isFree: true,
    };
    const result = getContentVideoUrl(content, mockVideos);
    expect(result).toBe('/library/playlist-1');
  });

  it('should find standalone video when not in playlist', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['video-1'],
      isFree: false,
    };
    // Remove playlists for this test
    const videosWithoutPlaylists = mockVideos.filter(v => v.source !== 'playlist');
    const result = getContentVideoUrl(content, videosWithoutPlaylists);
    expect(result).toBe('/library/video-1');
  });

  it('should prioritize playlists over standalone videos', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['video-1'],
      isFree: true,
    };
    const result = getContentVideoUrl(content, mockVideos);
    // Should find the playlist, not the standalone video
    expect(result).toBe('/library/playlist-1');
  });

  it('should try multiple videoIds until finding a valid one', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['invalid-1', 'invalid-2', 'video-2'],
      isFree: false,
    };
    const result = getContentVideoUrl(content, mockVideos);
    // video-2 is in playlist-1, so playlist should be found first
    expect(result).toBe('/library/playlist-1');
  });

  it('should return undefined when no valid videos found', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['invalid-1', 'invalid-2'],
      isFree: true,
    };
    const result = getContentVideoUrl(content, mockVideos);
    expect(result).toBeUndefined();
  });

  it('should use legacy behavior when allVideos not provided', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['some-video-id'],
      isFree: true,
    };
    const result = getContentVideoUrl(content);
    expect(result).toBe('/library/some-video-id');
  });

  it('should default isFree to false when not provided', () => {
    const content: VideoReference = {
      videoIds: ['video-1'],
    };
    const result = getContentVideoUrl(content, mockVideos);
    expect(result).toBe('/library/playlist-1');
  });

  it('should handle empty allVideos array', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['video-1'],
      isFree: false,
    };
    const result = getContentVideoUrl(content, []);
    expect(result).toBeUndefined();
  });

  it('should find first matching video in playlist', () => {
    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['video-3', 'video-1'],
      isFree: true,
    };
    const result = getContentVideoUrl(content, mockVideos);
    // video-3 is in playlist-2, should be found first
    expect(result).toBe('/library/playlist-2');
  });

  it('should handle playlist with missing videoIds array', () => {
    const videosWithInvalidPlaylist = [
      { id: 'video-1', source: 'youtube' },
      { id: 'playlist-broken', source: 'playlist' },
    ];

    const content: VideoReference & { isFree?: boolean } = {
      videoIds: ['video-1'],
      isFree: false,
    };

    const result = getContentVideoUrl(content, videosWithInvalidPlaylist);
    expect(result).toBe('/library/video-1');
  });
});
