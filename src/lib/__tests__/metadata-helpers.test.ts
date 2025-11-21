/**
 * Tests for metadata helper utilities
 */

import { generatePlaylistMetadata } from '../metadata-helpers';
import type { Video } from '@/types/video';

describe('generatePlaylistMetadata', () => {
  const mockVideos: Video[] = [
    {
      id: 'video-1',
      title: 'First Video',
      description: 'First video description',
      date: '2024-01-01',
      youtubeId: 'yt-1',
      tags: ['terran'],
      thumbnail: 'https://example.com/thumb1.jpg',
    },
    {
      id: 'video-2',
      title: 'Second Video',
      description: 'Second video description',
      date: '2024-01-02',
      youtubeId: 'yt-2',
      tags: ['zerg'],
      thumbnail: 'https://example.com/thumb2.jpg',
    },
    {
      id: 'video-3',
      title: 'Third Video',
      description: 'Third video description',
      date: '2024-01-03',
      muxPlaybackId: 'mux-1',
      tags: ['protoss'],
      thumbnail: 'https://example.com/thumb3.jpg',
    },
  ];

  it('should generate metadata for content with single video', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: ['strategy'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.title).toBe('Content Title');
    // When searchParams is empty but content has videos, default videoIndex is 0
    // So it selects the first video and uses its description
    expect(metadata.description).toBe('First video description');
    expect(metadata.alternates?.canonical).toBe('https://www.ladderlegendsacademy.com/library/content-1');
  });

  it('should generate metadata for playlist with first video selected', () => {
    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1', 'video-2', 'video-3'],
      tags: ['playlist'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: { v: '0' },
      basePath: '/library',
    });

    expect(metadata.title).toBe('First Video - Playlist Title');
    expect(metadata.description).toBe('First video description');
    expect(metadata.alternates?.canonical).toBe('https://www.ladderlegendsacademy.com/library/playlist-1?v=0');
  });

  it('should generate metadata for playlist with second video selected', () => {
    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1', 'video-2', 'video-3'],
      tags: ['playlist'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: { v: '1' },
      basePath: '/library',
    });

    expect(metadata.title).toBe('Second Video - Playlist Title');
    expect(metadata.description).toBe('Second video description');
    expect(metadata.alternates?.canonical).toBe('https://www.ladderlegendsacademy.com/library/playlist-1?v=1');
  });

  it('should generate metadata for playlist with third video selected', () => {
    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1', 'video-2', 'video-3'],
      tags: ['playlist'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: { v: '2' },
      basePath: '/library',
    });

    expect(metadata.title).toBe('Third Video - Playlist Title');
    expect(metadata.description).toBe('Third video description');
    expect(metadata.alternates?.canonical).toBe('https://www.ladderlegendsacademy.com/library/playlist-1?v=2');
  });

  it('should handle invalid video index', () => {
    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1', 'video-2'],
      tags: ['playlist'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: { v: '99' },
      basePath: '/library',
    });

    // Should fall back to first video thumbnail
    expect(metadata.title).toBe('Playlist Title');
    expect(metadata.description).toBe('Playlist description');
  });

  it('should handle negative video index', () => {
    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1', 'video-2'],
      tags: ['playlist'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: { v: '-1' },
      basePath: '/library',
    });

    expect(metadata.title).toBe('Playlist Title');
  });

  it('should handle non-numeric video index', () => {
    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1', 'video-2'],
      tags: ['playlist'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: { v: 'invalid' },
      basePath: '/library',
    });

    expect(metadata.title).toBe('Playlist Title');
  });

  it('should handle content with name instead of title', () => {
    const content = {
      id: 'build-order-1',
      name: 'Build Order Name',
      description: 'Build order description',
      videoIds: ['video-1'],
      tags: ['timing'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/build-orders',
    });

    expect(metadata.title).toBe('Build Order Name');
    // With videos present, uses first video's description
    expect(metadata.description).toBe('First video description');
  });

  it('should handle content without videos', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      tags: ['strategy'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.title).toBe('Content Title');
    expect(metadata.description).toBe('Content description');
    // Should use fallback thumbnail
    const images = Array.isArray(metadata.openGraph?.images) ? metadata.openGraph.images : [metadata.openGraph?.images];
    const firstImage = images[0];
    const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage instanceof URL ? firstImage.href : firstImage?.url);
    expect(imageUrl).toBe('https://www.ladderlegendsacademy.com/og-fallback.png');
  });

  it('should handle content with empty videoIds array', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: [],
      tags: ['strategy'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.title).toBe('Content Title');
    const images = Array.isArray(metadata.openGraph?.images) ? metadata.openGraph.images : [metadata.openGraph?.images];
    const firstImage = images[0];
    const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage instanceof URL ? firstImage.href : firstImage?.url);
    expect(imageUrl).toBe('https://www.ladderlegendsacademy.com/og-fallback.png');
  });

  it('should generate absolute thumbnail URLs from relative paths', () => {
    const videosWithRelativePath: Video[] = [
      {
        id: 'video-1',
        title: 'Video Title',
        description: 'Video description',
        date: '2024-01-01',
        muxPlaybackId: 'mux-1',
        tags: [],
        thumbnail: '/thumbnails/video-1.jpg',
      },
    ];

    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: videosWithRelativePath,
      searchParams: {},
      basePath: '/library',
    });

    const images = Array.isArray(metadata.openGraph?.images) ? metadata.openGraph.images : [metadata.openGraph?.images];
    const firstImage = images[0];
    const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage instanceof URL ? firstImage.href : firstImage?.url);
    expect(imageUrl).toBe('https://www.ladderlegendsacademy.com/thumbnails/video-1.jpg');
  });

  it('should keep absolute thumbnail URLs as-is', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    // video-1 has thumbnail: 'https://example.com/thumb1.jpg'
    const images = Array.isArray(metadata.openGraph?.images) ? metadata.openGraph.images : [metadata.openGraph?.images];
    const firstImage = images[0];
    const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage instanceof URL ? firstImage.href : firstImage?.url);
    expect(imageUrl).toContain('https://img.youtube.com/');
  });

  it('should include tags in metadata', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: ['terran', 'strategy', 'timing'],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.other?.['video:tag']).toBe('terran, strategy, timing');
  });

  it('should not include tags field when no tags', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.other?.['video:tag']).toBeUndefined();
  });

  it('should set content type to Playlist for multi-video content', () => {
    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1', 'video-2'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
      contentType: 'Video',
    });

    expect(metadata.other?.['content:type']).toBe('Playlist');
  });

  it('should use provided content type for single-video content', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/masterclasses',
      contentType: 'Masterclass',
    });

    expect(metadata.other?.['content:type']).toBe('Masterclass');
  });

  it('should use default content type when not provided', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.other?.['content:type']).toBe('Content');
  });

  it('should include OpenGraph metadata', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe('Content Title | Ladder Legends Academy');
    // With videos, uses first video's description
    expect(metadata.openGraph?.description).toBe('First video description');
    expect(metadata.openGraph?.siteName).toBe('Ladder Legends Academy');
    expect(metadata.openGraph?.url).toBe('https://www.ladderlegendsacademy.com/library/content-1');
  });

  it('should include Twitter card metadata', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.title).toBe('Content Title | Ladder Legends Academy');
    // With videos, uses first video's description
    expect(metadata.twitter?.description).toBe('First video description');
    expect(metadata.twitter?.images).toBeDefined();
  });

  it('should use default description when content has no description', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    // With videos, uses first video's description
    expect(metadata.description).toBe('First video description');
  });

  it('should handle video selection with selected video having no description', () => {
    const videosNoDesc: Video[] = [
      {
        id: 'video-1',
        title: 'Video Title',
        description: '',
        date: '2024-01-01',
        youtubeId: 'yt-1',
        tags: [],
        thumbnail: 'https://example.com/thumb1.jpg',
      },
    ];

    const content = {
      id: 'playlist-1',
      title: 'Playlist Title',
      description: 'Playlist description',
      videoIds: ['video-1'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: videosNoDesc,
      searchParams: { v: '0' },
      basePath: '/library',
    });

    // Should fall back to content description
    expect(metadata.description).toBe('Playlist description');
  });

  it('should handle video not found in allVideos', () => {
    const content = {
      id: 'content-1',
      title: 'Content Title',
      description: 'Content description',
      videoIds: ['nonexistent-video'],
      tags: [],
    };

    const metadata = generatePlaylistMetadata({
      content,
      allVideos: mockVideos,
      searchParams: {},
      basePath: '/library',
    });

    expect(metadata.title).toBe('Content Title');
    const images = Array.isArray(metadata.openGraph?.images) ? metadata.openGraph.images : [metadata.openGraph?.images];
    const firstImage = images[0];
    const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage instanceof URL ? firstImage.href : firstImage?.url);
    expect(imageUrl).toBe('https://www.ladderlegendsacademy.com/og-fallback.png');
  });
});
