import { createHmac, randomBytes } from 'crypto';

/**
 * Signed URL utility for temporary download links
 * Generates HMAC-signed tokens with expiration
 */

interface SignedTokenPayload {
  replayId: string;
  exp: number; // expiration timestamp
  nonce: string; // random nonce to prevent reuse
}

/**
 * Generate a signed download token
 */
export function generateDownloadToken(
  replayId: string,
  expiresInSeconds: number = 300 // 5 minutes default
): string {
  const payload: SignedTokenPayload = {
    replayId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    nonce: randomBytes(16).toString('hex'),
  };

  const payloadString = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadString).toString('base64url');

  const signature = createHmac('sha256', getSigningSecret())
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a signed download token
 */
export function verifyDownloadToken(token: string): SignedTokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split('.');

    if (!payloadBase64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', getSigningSecret())
      .update(payloadBase64)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payloadString = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload: SignedTokenPayload = JSON.parse(payloadString);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Get the signing secret from environment
 */
function getSigningSecret(): string {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('Missing DOWNLOAD_TOKEN_SECRET or NEXTAUTH_SECRET environment variable');
  }

  return secret;
}
