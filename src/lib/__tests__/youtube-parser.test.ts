/**
 * Tests for YouTube ID extraction and validation
 */

import { extractYouTubeId, isValidYouTubeId } from '../youtube-parser';

describe('extractYouTubeId', () => {
  describe('URL formats', () => {
    it('should extract ID from youtube.com/watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtu.be short URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtube.com/watch with additional params', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from embed URL with query params', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should handle http protocol', () => {
      const url = 'http://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should handle www-less youtube.com URLs', () => {
      const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Direct ID input', () => {
    it('should accept standard 11-character ID', () => {
      expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should accept ID with hyphens', () => {
      expect(extractYouTubeId('-gHDUWDA-5g')).toBe('-gHDUWDA-5g');
    });

    it('should accept ID with underscores', () => {
      expect(extractYouTubeId('abc_123_xyz')).toBe('abc_123_xyz');
    });

    it('should accept IDs of varying lengths (8-15 chars)', () => {
      expect(extractYouTubeId('abcd1234')).toBe('abcd1234'); // 8 chars
      expect(extractYouTubeId('abcdefghijk')).toBe('abcdefghijk'); // 11 chars
      expect(extractYouTubeId('abcdefghijklmno')).toBe('abcdefghijklmno'); // 15 chars
    });
  });

  describe('Edge cases and invalid input', () => {
    it('should return null for empty string', () => {
      expect(extractYouTubeId('')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(extractYouTubeId(null as unknown as string)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(extractYouTubeId(undefined as unknown as string)).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(extractYouTubeId(123 as unknown as string)).toBeNull();
    });

    it('should handle whitespace by trimming', () => {
      expect(extractYouTubeId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL string that is too short', () => {
      expect(extractYouTubeId('short')).toBeNull();
    });

    it('should return null for too short ID', () => {
      expect(extractYouTubeId('abc123')).toBeNull(); // Only 6 chars
    });

    it('should return null for too long ID', () => {
      expect(extractYouTubeId('abcdefghijklmnop')).toBeNull(); // 16 chars
    });

    it('should return null for ID with invalid characters', () => {
      expect(extractYouTubeId('abc@123$xyz')).toBeNull();
    });

    it('should return null for non-YouTube URL', () => {
      expect(extractYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    });

    it('should return null for youtube.com URL without v parameter', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch')).toBeNull();
    });

    it('should return null for youtu.be URL without path', () => {
      expect(extractYouTubeId('https://youtu.be/')).toBeNull();
    });
  });

  describe('Special YouTube ID formats', () => {
    it('should handle IDs starting with hyphen', () => {
      expect(extractYouTubeId('-gHDUWDA-5g')).toBe('-gHDUWDA-5g');
    });

    it('should handle IDs with consecutive hyphens', () => {
      expect(extractYouTubeId('ab--cd--efg')).toBe('ab--cd--efg');
    });

    it('should handle IDs with consecutive underscores', () => {
      expect(extractYouTubeId('ab__cd__efg')).toBe('ab__cd__efg');
    });

    it('should handle numeric-only IDs', () => {
      expect(extractYouTubeId('12345678901')).toBe('12345678901');
    });

    it('should handle uppercase and lowercase mix', () => {
      expect(extractYouTubeId('AbCdEfGhIjK')).toBe('AbCdEfGhIjK');
    });
  });

  describe('Real-world YouTube URLs', () => {
    it('should extract from typical watch URL', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=jNQXAC9IVRw'))
        .toBe('jNQXAC9IVRw');
    });

    it('should extract from mobile share URL', () => {
      expect(extractYouTubeId('https://youtu.be/jNQXAC9IVRw'))
        .toBe('jNQXAC9IVRw');
    });

    it('should extract from embedded player URL', () => {
      expect(extractYouTubeId('https://www.youtube.com/embed/jNQXAC9IVRw'))
        .toBe('jNQXAC9IVRw');
    });

    it('should handle URL with timestamp', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=jNQXAC9IVRw&t=123s'))
        .toBe('jNQXAC9IVRw');
    });

    it('should handle URL with playlist', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PLxyz'))
        .toBe('jNQXAC9IVRw');
    });
  });
});

describe('isValidYouTubeId', () => {
  it('should validate standard 11-character ID', () => {
    expect(isValidYouTubeId('dQw4w9WgXcQ')).toBe(true);
  });

  it('should validate ID with hyphens', () => {
    expect(isValidYouTubeId('-gHDUWDA-5g')).toBe(true);
  });

  it('should validate ID with underscores', () => {
    expect(isValidYouTubeId('abc_123_xyz')).toBe(true);
  });

  it('should validate 8-character ID', () => {
    expect(isValidYouTubeId('abcd1234')).toBe(true);
  });

  it('should validate 15-character ID', () => {
    expect(isValidYouTubeId('abcdefghijklmno')).toBe(true);
  });

  it('should reject too short ID', () => {
    expect(isValidYouTubeId('abc123')).toBe(false); // 6 chars
  });

  it('should reject too long ID', () => {
    expect(isValidYouTubeId('abcdefghijklmnop')).toBe(false); // 16 chars
  });

  it('should reject ID with invalid characters', () => {
    expect(isValidYouTubeId('abc@123$xyz')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidYouTubeId('')).toBe(false);
  });

  it('should reject ID with spaces', () => {
    expect(isValidYouTubeId('abc 123 xyz')).toBe(false);
  });

  it('should accept numeric-only ID', () => {
    expect(isValidYouTubeId('12345678901')).toBe(true);
  });

  it('should accept uppercase and lowercase mix', () => {
    expect(isValidYouTubeId('AbCdEfGhIjK')).toBe(true);
  });
});
