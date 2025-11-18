import { POST } from '../verify/route';
import { NextRequest } from 'next/server';
import { sign } from 'jsonwebtoken';

describe('/api/auth/device/verify', () => {
  const mockJwtSecret = 'test-secret-key';

  beforeAll(() => {
    process.env.AUTH_SECRET = mockJwtSecret;
  });

  it('should return valid=true for valid uploader token', async () => {
    const validToken = sign(
      {
        userId: '123456',
        type: 'uploader',
      },
      mockJwtSecret,
      { expiresIn: '1h' }
    );

    const request = new NextRequest('http://localhost:3000/api/auth/device/verify', {
      method: 'POST',
      body: JSON.stringify({ access_token: validToken }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.userId).toBe('123456');
    expect(data.expires_at).toBeDefined();
  });

  it('should return valid=false for expired token', async () => {
    const expiredToken = sign(
      {
        userId: '123456',
        type: 'uploader',
      },
      mockJwtSecret,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const request = new NextRequest('http://localhost:3000/api/auth/device/verify', {
      method: 'POST',
      body: JSON.stringify({ access_token: expiredToken }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
    expect(data.error).toBe('token_expired');
  });

  it('should return valid=false for invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/device/verify', {
      method: 'POST',
      body: JSON.stringify({ access_token: 'invalid-token-string' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
    expect(data.error).toBe('invalid_token');
  });

  it('should return valid=false for wrong token type', async () => {
    const wrongTypeToken = sign(
      {
        userId: '123456',
        type: 'refresh', // Wrong type
      },
      mockJwtSecret,
      { expiresIn: '1h' }
    );

    const request = new NextRequest('http://localhost:3000/api/auth/device/verify', {
      method: 'POST',
      body: JSON.stringify({ access_token: wrongTypeToken }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
    expect(data.error).toBe('invalid_token_type');
  });

  it('should return error for missing access_token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/device/verify', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.valid).toBe(false);
    expect(data.error).toBe('missing_token');
  });

  it('should return error for malformed JWT', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/device/verify', {
      method: 'POST',
      body: JSON.stringify({ access_token: 'not.a.valid.jwt.format' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
    expect(data.error).toBe('invalid_token');
  });

  it('should return error for token signed with wrong secret', async () => {
    const wrongSecretToken = sign(
      {
        userId: '123456',
        type: 'uploader',
      },
      'wrong-secret-key',
      { expiresIn: '1h' }
    );

    const request = new NextRequest('http://localhost:3000/api/auth/device/verify', {
      method: 'POST',
      body: JSON.stringify({ access_token: wrongSecretToken }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.valid).toBe(false);
    expect(data.error).toBe('invalid_token');
  });
});
