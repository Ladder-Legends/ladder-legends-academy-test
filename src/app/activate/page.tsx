'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession, signIn } from 'next-auth/react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ActivatePage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-fill code from query params
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      let value = codeParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (value.length > 4) {
        value = value.slice(0, 4) + '-' + value.slice(4, 8);
      }
      setCode(value);
    }
  }, [searchParams]);

  const handleActivate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/device/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: code.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to activate device');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Auto-insert dash after 4 characters
    if (value.length > 4) {
      value = value.slice(0, 4) + '-' + value.slice(4, 8);
    }

    setCode(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && code.length >= 8 && !loading) {
      handleActivate();
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Activate Your Device</h1>
              <p className="text-muted-foreground">
                Sign in with Discord to activate the Ladder Legends Replay Uploader
              </p>
            </div>

            <div className="border rounded-lg p-8 bg-card space-y-4">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-sm text-muted-foreground">
                You need to be logged in to activate your device
              </p>
              <Button
                onClick={() => signIn('discord', { callbackUrl: '/activate' })}
                className="w-full"
                size="lg"
              >
                Sign In with Discord
              </Button>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="border rounded-lg p-8 bg-card space-y-6">
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
              <div>
                <h1 className="text-2xl font-bold mb-2 text-green-500">
                  Device Activated!
                </h1>
                <p className="text-muted-foreground mb-4">
                  Your Ladder Legends Replay Uploader is now connected to your account.
                </p>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    ✓ Next Step
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Return to the app and click <strong>"Check Authorization"</strong> to complete the process.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t flex items-center justify-center gap-3">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Logged in as <span className="font-semibold">{session.user?.name || session.user?.email}</span>
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Activate Your Device</h1>
            <p className="text-muted-foreground">
              Enter the code shown in your Ladder Legends Replay Uploader app
            </p>
          </div>

          <div className="border rounded-lg p-8 bg-card space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Device Code
              </label>
              <Input
                id="code"
                value={code}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                placeholder="ABCD-1234"
                className="text-center text-2xl font-mono tracking-wider"
                maxLength={9}
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
              />
              <p className="text-xs text-muted-foreground mt-2">
                The code is case-insensitive and should be 8 characters (e.g., ABCD-1234)
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/90">{error}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleActivate}
              disabled={loading || code.length < 8}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Activating...
                </>
              ) : (
                'Activate Device'
              )}
            </Button>

            <div className="pt-4 border-t text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Logged in as <span className="font-semibold">{session.user?.name || session.user?.email}</span>
                </p>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => signIn('discord', { callbackUrl: '/activate' })}
                className="text-xs"
              >
                Switch account
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Don't have the app yet?{' '}
              <Link href="/download" className="text-foreground hover:underline">
                Download here
              </Link>
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
