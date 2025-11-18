'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Apple, Info, ShieldAlert, ExternalLink } from 'lucide-react';

export default function DownloadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check authentication and authorization - download restricted to Coach/Owner only
    if (status === 'loading') return;

    if (!session) {
      router.push('/login?callbackUrl=/download');
    } else {
      // Check if user is Coach or Owner only
      const isCoachOrOwner = session.user?.role === 'Coach' || session.user?.role === 'Owner';

      if (!isCoachOrOwner) {
        router.push('/subscribe?feature=uploader');
      }
    }
  }, [session, status, router]);

  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Block access if not Coach or Owner
  const isCoachOrOwner = session.user?.role === 'Coach' || session.user?.role === 'Owner';

  if (!session || !isCoachOrOwner) {
    return null;
  }
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Download Ladder Legends Uploader</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Automatically upload your StarCraft 2 replays for instant analysis and improvement tracking
        </p>
      </div>

      {/* Download Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* macOS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Apple className="h-8 w-8" />
              <CardTitle>macOS</CardTitle>
            </div>
            <CardDescription>For macOS 10.13 (High Sierra) and later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link
                href="https://github.com/ladder-legends/ladder-legends-uploader/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-5 w-5" />
                Download for macOS (.dmg)
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold">Installation:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Download the .dmg file</li>
                <li>Open the downloaded file</li>
                <li>Drag the app to your Applications folder</li>
                <li>Right-click the app and select &quot;Open&quot;</li>
                <li>Click &quot;Open&quot; when the security dialog appears</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Windows */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.45v7.35h10.5V0zm11.55 0v7.35H24V0zM0 12.45V24l10.5-1.65V12.45zm11.55 0v9.9L24 24V12.45z"/>
              </svg>
              <CardTitle>Windows</CardTitle>
            </div>
            <CardDescription>For Windows 10 and later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link
                href="https://github.com/ladder-legends/ladder-legends-uploader/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-5 w-5" />
                Download for Windows (.msi)
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold">Installation:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Download the .msi file</li>
                <li>Run the installer</li>
                <li>Click &quot;More info&quot; if Windows SmartScreen appears</li>
                <li>Click &quot;Run anyway&quot;</li>
                <li>Follow the installation wizard</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Warning */}
      <Alert className="mb-8">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>About Security Warnings</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            You may see security warnings when installing the app. This is normal for unsigned applications.
            We currently don&apos;t have code signing certificates because they cost $300-400/year, which we&apos;re
            keeping low during our early phase.
          </p>
          <p className="mt-2">
            <strong>The app is safe to install.</strong> The source code is{' '}
            <Link
              href="https://github.com/ladder-legends/ladder-legends-uploader"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              publicly available on GitHub
              <ExternalLink className="inline h-3 w-3 ml-1" />
            </Link>{' '}
            for anyone to review. We plan to add code signing once we have sustainable revenue.
          </p>
        </AlertDescription>
      </Alert>

      {/* How to Bypass Security Warnings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How to Bypass Security Warnings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* macOS */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Apple className="h-5 w-5" />
              macOS: &quot;Unidentified Developer&quot;
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>If you see &quot;App is damaged and can&apos;t be opened&quot; or &quot;Unidentified developer&quot;:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                <li>
                  <strong>Right-click</strong> (or Control+click) the app in Applications
                </li>
                <li>
                  Select <strong>&quot;Open&quot;</strong> from the menu
                </li>
                <li>
                  Click <strong>&quot;Open&quot;</strong> in the dialog that appears
                </li>
                <li>
                  The app will now open and won&apos;t ask again
                </li>
              </ol>
              <p className="mt-3 italic">
                Note: You must right-click → Open the first time. Double-clicking won&apos;t show the &quot;Open&quot; option.
              </p>
            </div>
          </div>

          {/* Windows */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.45v7.35h10.5V0zm11.55 0v7.35H24V0zM0 12.45V24l10.5-1.65V12.45zm11.55 0v9.9L24 24V12.45z"/>
              </svg>
              Windows: SmartScreen Warning
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>If you see &quot;Windows protected your PC&quot;:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
                <li>
                  Click <strong>&quot;More info&quot;</strong> on the SmartScreen dialog
                </li>
                <li>
                  Click <strong>&quot;Run anyway&quot;</strong>
                </li>
                <li>
                  The installer will proceed normally
                </li>
              </ol>
              <p className="mt-3 italic">
                This warning appears because the app doesn&apos;t have an EV Code Signing certificate ($300/year).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What the Uploader Does</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Automatically detects your StarCraft 2 replay folder</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Uploads new replays instantly after each game</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Runs quietly in the background (menu bar/system tray)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Optional: Start automatically when you log in</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Secure device code authentication (no password needed)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>After Installing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Launch the Ladder Legends Uploader app
            </li>
            <li>
              You&apos;ll see an activation code - keep the app open
            </li>
            <li>
              <Link href="/activate" className="text-primary hover:underline">
                Go to the activation page
              </Link>{' '}
              and enter your code
            </li>
            <li>
              The app will start uploading your replays automatically!
            </li>
          </ol>

          <div className="pt-4 mt-6 border-t">
            <Button asChild variant="outline" className="w-full">
              <Link href="/activate">
                Already installed? Activate your app →
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Source Code Link */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>
          Open source on{' '}
          <Link
            href="https://github.com/ladder-legends/ladder-legends-uploader"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ExternalLink className="inline h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
