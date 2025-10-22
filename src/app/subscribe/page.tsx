import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function SubscribePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="border border-border/40 rounded-lg p-8 md:p-12 bg-background/95 backdrop-blur-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Join Ladder Legends Academy
            </h1>
            <p className="text-lg text-muted-foreground">
              Unlock premium content and master StarCraft II with expert coaching
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4 mb-8">
            <FeatureItem>
              1-on-1 Coaching Bookings with Top Players
            </FeatureItem>
            <FeatureItem>
              Coach Diaries & Strategy Insights
            </FeatureItem>
            <FeatureItem>
              Replay Reviews & Personalized Feedback
            </FeatureItem>
            <FeatureItem>
              Exclusive VOD Library with Premium Content
            </FeatureItem>
            <FeatureItem>
              Private Race-Specific Chatrooms (Zerg / Protoss / Terran)
            </FeatureItem>
            <FeatureItem>
              GM-Only Lounges & Direct Coach Q&A
            </FeatureItem>
            <FeatureItem>
              Tournament Entry & Role-Based Shoutouts
            </FeatureItem>
            <FeatureItem>
              Build Order Database with Video Tutorials
            </FeatureItem>
            <FeatureItem>
              Professional Replay Analysis & Masterclasses
            </FeatureItem>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-4">
            <Link
              href="https://whop.com/ladder-legends/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button
                size="xl"
                className="w-full bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-700 hover:via-orange-700 hover:to-red-700 text-white font-bold text-lg shadow-lg shadow-red-500/20"
              >
                Subscribe Now
              </Button>
            </Link>

            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-border/40 text-center">
            <div className="text-sm text-muted-foreground mb-2">
              Already subscribed?{" "}
              <Link href="/subscribe/link-account" className="text-orange-500 hover:text-orange-400 transition-colors">
                Learn how to link your account
              </Link>
            </div>
            <div className="text-sm text-muted-foreground">
              Already linked?{" "}
              <Link href="/login" className="text-orange-500 hover:text-orange-400 transition-colors">
                Sign in with Discord
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
      <span className="text-foreground">{children}</span>
    </div>
  );
}
