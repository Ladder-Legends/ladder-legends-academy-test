import { NextResponse } from 'next/server';

/**
 * Standardized API error response format
 */
export interface ApiErrorResponse {
  error: string;  // User-friendly message
  code?: string;  // Machine-readable error code
  details?: string;  // Technical details
  retryable?: boolean;  // Whether the client should retry
}

/**
 * Known error codes for different services
 */
export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Validation
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_GONE: 'RESOURCE_GONE',

  // External Services
  GITHUB_ERROR: 'GITHUB_ERROR',
  MUX_ERROR: 'MUX_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Server
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Parse Mux API errors and return appropriate status + message
 */
export function handleMuxError(error: unknown, context: string): { status: number; response: ApiErrorResponse } {
  console.error(`[MUX ERROR] ${context}:`, {
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Type guard for fetch response errors
  if (error && typeof error === 'object' && 'status' in error) {
    const fetchError = error as { status: number; statusText?: string; body?: unknown };

    switch (fetchError.status) {
      case 400:
        return {
          status: 400,
          response: {
            error: 'Invalid request to video service. Please check your input.',
            code: ErrorCodes.INVALID_REQUEST,
            details: error instanceof Error ? error.message : 'Bad request',
            retryable: false,
          },
        };

      case 401:
      case 403:
        return {
          status: 502,
          response: {
            error: 'Video service authentication failed. Please contact support.',
            code: ErrorCodes.MUX_ERROR,
            details: 'Authentication or authorization failed with Mux',
            retryable: false,
          },
        };

      case 404:
        return {
          status: 404,
          response: {
            error: 'Video not found in video service.',
            code: ErrorCodes.RESOURCE_NOT_FOUND,
            details: error instanceof Error ? error.message : 'Resource not found',
            retryable: false,
          },
        };

      case 429:
        return {
          status: 429,
          response: {
            error: 'Too many requests to video service. Please try again in a few minutes.',
            code: ErrorCodes.RATE_LIMIT_EXCEEDED,
            details: 'Rate limit exceeded',
            retryable: true,
          },
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          status: 503,
          response: {
            error: 'Video service is temporarily unavailable. Please try again later.',
            code: ErrorCodes.SERVICE_UNAVAILABLE,
            details: error instanceof Error ? error.message : 'Service unavailable',
            retryable: true,
          },
        };
    }
  }

  // Check for specific Mux error messages
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (errorMessage.includes('passthrough') && errorMessage.includes('255')) {
    return {
      status: 400,
      response: {
        error: 'Video title is too long. Please use a shorter title.',
        code: ErrorCodes.INVALID_PARAMETER,
        details: 'Video title exceeds maximum length',
        retryable: false,
      },
    };
  }

  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return {
      status: 429,
      response: {
        error: 'Video upload quota exceeded. Please contact support.',
        code: ErrorCodes.QUOTA_EXCEEDED,
        details: error instanceof Error ? error.message : 'Quota exceeded',
        retryable: false,
      },
    };
  }

  // Generic Mux error
  return {
    status: 502,
    response: {
      error: 'Video service error. Please try again or contact support.',
      code: ErrorCodes.MUX_ERROR,
      details: error instanceof Error ? error.message : 'Unknown Mux error',
      retryable: true,
    },
  };
}

/**
 * Parse GitHub API errors and return appropriate status + message
 */
export function handleGitHubError(error: unknown, context: string): { status: number; response: ApiErrorResponse } {
  console.error(`[GITHUB ERROR] ${context}:`, {
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Type guard for fetch response errors
  if (error && typeof error === 'object' && 'status' in error) {
    const fetchError = error as { status: number; statusText?: string };

    switch (fetchError.status) {
      case 401:
      case 403:
        return {
          status: 502,
          response: {
            error: 'GitHub authentication failed. Please contact support.',
            code: ErrorCodes.GITHUB_ERROR,
            details: 'Failed to authenticate with GitHub API',
            retryable: false,
          },
        };

      case 404:
        return {
          status: 404,
          response: {
            error: 'Content not found in repository.',
            code: ErrorCodes.RESOURCE_NOT_FOUND,
            details: error instanceof Error ? error.message : 'Resource not found',
            retryable: false,
          },
        };

      case 409:
      case 422:
        return {
          status: 409,
          response: {
            error: 'Merge conflict detected. Your changes conflict with recent updates. Please try again.',
            code: ErrorCodes.RESOURCE_CONFLICT,
            details: error instanceof Error ? error.message : 'Conflict detected',
            retryable: true,
          },
        };

      case 429:
        return {
          status: 429,
          response: {
            error: 'GitHub rate limit exceeded. Please try again in a few minutes.',
            code: ErrorCodes.RATE_LIMIT_EXCEEDED,
            details: 'Rate limit exceeded',
            retryable: true,
          },
        };
    }
  }

  // Check for specific GitHub error patterns
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (errorMessage.includes('conflict') || errorMessage === 'conflict') {
    return {
      status: 409,
      response: {
        error: 'Your changes conflict with recent updates. Please try again.',
        code: ErrorCodes.RESOURCE_CONFLICT,
        details: 'Merge conflict detected',
        retryable: true,
      },
    };
  }

  if (errorMessage.includes('rate limit')) {
    return {
      status: 429,
      response: {
        error: 'Too many requests to GitHub. Please wait a few minutes and try again.',
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        details: 'GitHub API rate limit exceeded',
        retryable: true,
      },
    };
  }

  // Generic GitHub error
  return {
    status: 502,
    response: {
      error: 'Failed to save changes. Please try again or contact support.',
      code: ErrorCodes.GITHUB_ERROR,
      details: error instanceof Error ? error.message : 'Unknown GitHub error',
      retryable: true,
    },
  };
}

/**
 * Create a standardized error response with browser console logging
 */
export function createErrorResponse(
  status: number,
  response: ApiErrorResponse
): NextResponse<ApiErrorResponse> {
  // Log for server-side debugging
  console.error(`[API ERROR] ${status}:`, response);

  return NextResponse.json(response, { status });
}
