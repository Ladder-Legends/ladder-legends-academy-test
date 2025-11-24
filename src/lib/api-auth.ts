/**
 * Shared authentication utilities for API routes
 * Supports both Bearer token (desktop app) and session cookie (web app)
 */
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';

export interface AuthResult {
  discordId: string;
  roles: string[];
  authMethod: 'bearer' | 'session';
}

export interface AuthError {
  error: string;
  status: number;
}

/**
 * Authenticate a request using either Bearer token or session cookie
 *
 * @param authHeader - The Authorization header value (or null)
 * @returns AuthResult on success, AuthError on failure
 */
export async function authenticateRequest(
  authHeader: string | null
): Promise<AuthResult | AuthError> {
  // Check for bearer token first (for desktop app)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateBearerToken(authHeader.substring(7));
  }

  // Fall back to session cookie (for web app)
  return authenticateSession();
}

/**
 * Authenticate using a Bearer token (JWT)
 */
async function authenticateBearerToken(token: string): Promise<AuthResult | AuthError> {
  const jwtSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!jwtSecret) {
    console.error('[AUTH] No JWT secret configured');
    return { error: 'Server configuration error', status: 500 };
  }

  try {
    const { verify } = await import('jsonwebtoken');
    const decoded = verify(token, jwtSecret) as {
      userId: string;
      type: string;
      roles?: string[];
    };

    if (decoded.type !== 'uploader') {
      return { error: 'Invalid token type', status: 401 };
    }

    return {
      discordId: decoded.userId,
      roles: decoded.roles || [],
      authMethod: 'bearer',
    };
  } catch (error) {
    console.error('[AUTH] JWT verification error:', error);

    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return { error: 'Token expired', status: 401 };
      }
      if (error.name === 'JsonWebTokenError') {
        return { error: 'Invalid token', status: 401 };
      }
    }

    return { error: 'Authentication failed', status: 401 };
  }
}

/**
 * Authenticate using session cookie
 */
async function authenticateSession(): Promise<AuthResult | AuthError> {
  const session = await auth();

  if (!session?.user?.discordId) {
    return { error: 'Unauthorized', status: 401 };
  }

  return {
    discordId: session.user.discordId,
    roles: session.user.roles || [],
    authMethod: 'session',
  };
}

/**
 * Type guard to check if result is an error
 */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'error' in result;
}

/**
 * Check if user has required permission
 * Creates a minimal session object for the permission check
 */
export async function checkPermission(
  roles: string[],
  requiredPermission: 'owners' | 'coaches' | 'subscribers'
): Promise<boolean> {
  const { hasPermission } = await import('@/lib/permissions');

  const permissionCheck: Session = {
    user: { roles }
  } as Session;

  return hasPermission(permissionCheck, requiredPermission);
}
