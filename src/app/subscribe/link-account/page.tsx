import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function LinkAccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full">
        <div className="border border-border/40 rounded-lg p-8 md:p-12 bg-background/95 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Link Your Account
            </h1>
            <p className="text-lg text-muted-foreground">
              Follow these steps to connect your Whop subscription to Discord and access the site
            </p>
          </div>

          {/* Step-by-step instructions */}
          <div className="space-y-8 mb-8">
            {/* Step 1 */}
            <div className="border border-border/40 rounded-lg p-6 bg-card/50">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Subscribe on Whop</h2>
                  <p className="text-muted-foreground mb-4">
                    Purchase your subscription through Whop if you haven&apos;t already.
                  </p>
                  <Link
                    href="https://whop.com/ladder-legends/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Go to Whop
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border border-border/40 rounded-lg p-6 bg-card/50">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Link Your Discord Account to Whop</h2>
                  <p className="text-muted-foreground mb-3">
                    After purchasing, Whop will prompt you to connect your Discord account. This is required to access the Ladder Legends Academy Discord server.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Click &quot;Connect Discord&quot; in your Whop dashboard</li>
                    <li>Authorize Whop to access your Discord account</li>
                    <li>You&apos;ll automatically be added to the Ladder Legends Academy Discord server</li>
                    <li>You&apos;ll receive the &quot;Subscriber&quot; role in Discord</li>
                  </ul>
                  <Link
                    href="https://discord.gg/kpA3RZeg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Join Discord Server
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border border-border/40 rounded-lg p-6 bg-card/50">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Sign In to This Website</h2>
                  <p className="text-muted-foreground mb-4">
                    Once your Discord is linked to Whop and you have the Subscriber role, sign in to this website using Discord OAuth.
                  </p>
                  <Link href="/login">
                    <Button size="sm" className="gap-2">
                      Sign in with Discord
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border border-border/40 rounded-lg p-6 bg-card/50">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                  4
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Access Premium Content</h2>
                  <p className="text-muted-foreground">
                    Once signed in, you&apos;ll have full access to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mt-3">
                    <li>Exclusive VOD library with coaching videos</li>
                    <li>Build order database with video tutorials</li>
                    <li>Professional replay analysis and downloads</li>
                    <li>Masterclass series from top coaches</li>
                    <li>And all the Discord community features!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="border-t border-border/40 pt-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Troubleshooting</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Can&apos;t see content after signing in?</strong>
                <br />
                Make sure you&apos;ve linked your Discord account to Whop and have the &quot;Subscriber&quot; role in the Ladder Legends Academy Discord server. Try signing out and signing back in.
              </p>
              <p>
                <strong className="text-foreground">Discord not linked to Whop?</strong>
                <br />
                Visit your Whop dashboard and look for the Discord connection option. You may need to disconnect and reconnect if it&apos;s not working.
              </p>
              <p>
                <strong className="text-foreground">Still having issues?</strong>
                <br />
                Reach out in the{" "}
                <a
                  href="https://discord.gg/kpA3RZeg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-400 transition-colors underline"
                >
                  Discord server
                </a>
                {" "}for support from the community or coaches.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link href="/subscribe" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Subscribe
            </Link>
            <span className="text-muted-foreground hidden sm:block">•</span>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
