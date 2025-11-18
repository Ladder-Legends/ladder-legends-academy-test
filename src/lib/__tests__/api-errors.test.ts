/**
 * Tests for API error handling utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleMuxError, handleGitHubError, ErrorCodes } from '../api-errors';

describe('ErrorCodes', () => {
  it('should have authentication error codes', () => {
    expect(ErrorCodes.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
    expect(ErrorCodes.AUTH_INVALID).toBe('AUTH_INVALID');
    expect(ErrorCodes.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
  });

  it('should have rate limiting error codes', () => {
    expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    expect(ErrorCodes.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
  });

  it('should have validation error codes', () => {
    expect(ErrorCodes.INVALID_REQUEST).toBe('INVALID_REQUEST');
    expect(ErrorCodes.MISSING_PARAMETER).toBe('MISSING_PARAMETER');
    expect(ErrorCodes.INVALID_PARAMETER).toBe('INVALID_PARAMETER');
  });

  it('should have resource error codes', () => {
    expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
    expect(ErrorCodes.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
    expect(ErrorCodes.RESOURCE_GONE).toBe('RESOURCE_GONE');
  });

  it('should have service error codes', () => {
    expect(ErrorCodes.GITHUB_ERROR).toBe('GITHUB_ERROR');
    expect(ErrorCodes.MUX_ERROR).toBe('MUX_ERROR');
    expect(ErrorCodes.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
    expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR');
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
  });
});

describe('handleMuxError', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should handle 400 bad request error', () => {
    const error = { status: 400, statusText: 'Bad Request' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(400);
    expect(result.response.error).toContain('Invalid request');
    expect(result.response.code).toBe(ErrorCodes.INVALID_REQUEST);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle 401 authentication error', () => {
    const error = { status: 401, statusText: 'Unauthorized' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(502);
    expect(result.response.error).toContain('authentication failed');
    expect(result.response.code).toBe(ErrorCodes.MUX_ERROR);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle 403 forbidden error', () => {
    const error = { status: 403, statusText: 'Forbidden' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(502);
    expect(result.response.error).toContain('authentication failed');
    expect(result.response.code).toBe(ErrorCodes.MUX_ERROR);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle 404 not found error', () => {
    const error = { status: 404, statusText: 'Not Found' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(404);
    expect(result.response.error).toContain('Video not found');
    expect(result.response.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle 429 rate limit error', () => {
    const error = { status: 429, statusText: 'Too Many Requests' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(429);
    expect(result.response.error).toContain('Too many requests');
    expect(result.response.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle 500 server error', () => {
    const error = { status: 500, statusText: 'Internal Server Error' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(503);
    expect(result.response.error).toContain('temporarily unavailable');
    expect(result.response.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle 502 bad gateway error', () => {
    const error = { status: 502, statusText: 'Bad Gateway' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(503);
    expect(result.response.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle 503 service unavailable error', () => {
    const error = { status: 503, statusText: 'Service Unavailable' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(503);
    expect(result.response.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle 504 gateway timeout error', () => {
    const error = { status: 504, statusText: 'Gateway Timeout' };
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(503);
    expect(result.response.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle passthrough 255 character limit error', () => {
    const error = new Error('Passthrough field exceeds 255 characters');
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(400);
    expect(result.response.error).toContain('title is too long');
    expect(result.response.code).toBe(ErrorCodes.INVALID_PARAMETER);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle quota exceeded error', () => {
    const error = new Error('Quota limit exceeded for video uploads');
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(429);
    expect(result.response.error).toContain('quota exceeded');
    expect(result.response.code).toBe(ErrorCodes.QUOTA_EXCEEDED);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle generic Mux error', () => {
    const error = new Error('Unknown Mux error');
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(502);
    expect(result.response.error).toContain('Video service error');
    expect(result.response.code).toBe(ErrorCodes.MUX_ERROR);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle non-Error objects', () => {
    const error = 'string error';
    const result = handleMuxError(error, 'test context');

    expect(result.status).toBe(502);
    expect(result.response.code).toBe(ErrorCodes.MUX_ERROR);
    expect(result.response.retryable).toBe(true);
  });

  it('should log error details', () => {
    const error = new Error('Test error');
    handleMuxError(error, 'test context');

    expect(console.error).toHaveBeenCalledWith(
      '[MUX ERROR] test context:',
      expect.objectContaining({
        error,
        message: 'Test error',
      })
    );
  });
});

describe('handleGitHubError', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should handle 401 authentication error', () => {
    const error = { status: 401, message: 'Bad credentials' };
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(502);
    expect(result.response.error).toContain('GitHub authentication failed');
    expect(result.response.code).toBe(ErrorCodes.GITHUB_ERROR);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle 403 permission denied error', () => {
    const error = { status: 403, message: 'Permission denied' };
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(502);
    expect(result.response.error).toContain('GitHub authentication failed');
    expect(result.response.code).toBe(ErrorCodes.GITHUB_ERROR);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle 404 not found error', () => {
    const error = { status: 404, message: 'Not Found' };
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(404);
    expect(result.response.error).toContain('not found');
    expect(result.response.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(result.response.retryable).toBe(false);
  });

  it('should handle 409 conflict error', () => {
    const error = { status: 409, message: 'Conflict' };
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(409);
    expect(result.response.error).toContain('conflict');
    expect(result.response.code).toBe(ErrorCodes.RESOURCE_CONFLICT);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle 422 validation error', () => {
    const error = { status: 422, message: 'Validation failed' };
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(409);
    expect(result.response.error).toContain('conflict');
    expect(result.response.code).toBe(ErrorCodes.RESOURCE_CONFLICT);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle 429 rate limit error', () => {
    const error = { status: 429, message: 'Rate limit exceeded' };
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(429);
    expect(result.response.error).toContain('GitHub rate limit');
    expect(result.response.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle merge conflict error message', () => {
    const error = new Error('merge conflict detected in files');
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(409);
    expect(result.response.error).toContain('conflict');
    expect(result.response.code).toBe(ErrorCodes.RESOURCE_CONFLICT);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle rate limit error message', () => {
    const error = new Error('rate limit exceeded for this resource');
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(429);
    expect(result.response.error).toContain('Too many requests to GitHub');
    expect(result.response.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    expect(result.response.retryable).toBe(true);
  });

  it('should handle generic GitHub error', () => {
    const error = new Error('Unknown GitHub error');
    const result = handleGitHubError(error, 'test operation');

    expect(result.status).toBe(502);
    expect(result.response.error).toContain('Failed to save changes');
    expect(result.response.code).toBe(ErrorCodes.GITHUB_ERROR);
    expect(result.response.retryable).toBe(true);
  });

  it('should log error details', () => {
    const error = new Error('Test error');
    handleGitHubError(error, 'test operation');

    expect(console.error).toHaveBeenCalledWith(
      '[GITHUB ERROR] test operation:',
      expect.objectContaining({
        error,
        message: 'Test error',
      })
    );
  });
});
