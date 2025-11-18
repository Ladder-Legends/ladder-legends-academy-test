import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json();

    if (!access_token) {
      return NextResponse.json(
        { error: 'missing_token', valid: false },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

    try {
      // Verify the token
      const decoded = verify(access_token, jwtSecret) as {
        userId: string;
        type: string;
        iat: number;
        exp: number;
      };

      // Check if it's an uploader token
      if (decoded.type !== 'uploader') {
        return NextResponse.json(
          { error: 'invalid_token_type', valid: false },
          { status: 401 }
        );
      }

      // Token is valid
      return NextResponse.json({
        valid: true,
        userId: decoded.userId,
        expires_at: decoded.exp,
      });
    } catch (error) {
      // Token is invalid or expired
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          return NextResponse.json(
            { error: 'token_expired', valid: false },
            { status: 401 }
          );
        }
        if (error.name === 'JsonWebTokenError') {
          return NextResponse.json(
            { error: 'invalid_token', valid: false },
            { status: 401 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { error: 'internal_error', valid: false },
      { status: 500 }
    );
  }
}
