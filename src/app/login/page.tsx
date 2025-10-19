import { signIn } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const session = await auth();

  // If already authenticated and has role, redirect to home
  if (session?.user?.hasSubscriberRole) {
    redirect(searchParams.callbackUrl || "/");
  }

  const errorMessage = searchParams.error === "no_role"
    ? "You need one of the following roles in the Ladder Legends Academy Discord server: Owner, Moderator, Coach, Subscriber, or Member."
    : searchParams.error
    ? "Authentication failed. Please try again."
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md neon-border">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 relative">
              <Image
                src="/logo.svg"
                alt="Ladder Legends Academy"
                width={96}
                height={96}
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-3xl glow-primary">
            Ladder Legends Academy
          </CardTitle>
          <CardDescription className="text-base">
            Sign in with Discord to access exclusive coaching content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive text-center">{errorMessage}</p>
              {searchParams.error === "no_role" && (
                <div className="mt-4 text-center">
                  <a
                    href="https://discord.gg/kpA3RZe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-secondary hover:underline"
                  >
                    Join our Discord server →
                  </a>
                </div>
              )}
            </div>
          )}

          {session && !session.user?.hasSubscriberRole && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm text-center">
                You're signed in but don't have the required role.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Make sure you have one of these roles in the Ladder Legends Academy Discord server:
                <span className="text-primary font-semibold"> Owner, Moderator, Coach, Subscriber, or Member</span>
              </p>
            </div>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("discord", {
                redirectTo: searchParams.callbackUrl || "/",
              });
            }}
          >
            <Button
              type="submit"
              size="lg"
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Sign in with Discord
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              By signing in, you'll get access to:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ Exclusive coaching videos</li>
              <li>✓ Race-specific strategies</li>
              <li>✓ Pro player analysis</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
