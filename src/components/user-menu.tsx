'use client';

import React from 'react';
import { useSession, signOut as clientSignOut } from 'next-auth/react';
import { handleSignOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, LogIn, Activity } from "lucide-react";
import Link from "next/link";
import { isOwner } from "@/lib/permissions";

function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  return (
    <Button
      onClick={async () => {
        console.log('[CLIENT] Sign out button clicked');
        setIsSigningOut(true);
        try {
          // Use NextAuth's client-side signOut which handles everything
          console.log('[CLIENT] Calling clientSignOut with redirect...');
          await clientSignOut({
            callbackUrl: '/',
            redirect: true
          });
          console.log('[CLIENT] clientSignOut completed');
        } catch (error) {
          console.error('[CLIENT] Sign out error:', error);
          setIsSigningOut(false);
        }
      }}
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={isSigningOut}
    >
      <LogOut className="w-4 h-4" />
      {isSigningOut ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}

function UserInfo({ session }: { session: { user: { name?: string | null; email?: string | null } } }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <User className="w-4 h-4 text-primary" />
      <span className="text-muted-foreground">
        {session.user.name || session.user.email}
      </span>
    </div>
  );
}

export function UserMenu() {
  const { data: session } = useSession();

  React.useEffect(() => {
    console.log('[CLIENT] UserMenu session state:', session);
  }, [session]);

  // Not logged in - show login button
  if (!session?.user) {
    return (
      <Link href="/login">
        <Button size="sm" className="gap-2">
          <LogIn className="w-4 h-4" />
          Sign in
        </Button>
      </Link>
    );
  }

  // Logged in but not subscribed - show subscribe CTA + sign out
  if (!session.user.hasSubscriberRole) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/subscribe">
          <Button size="sm" className="gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
            Subscribe
          </Button>
        </Link>
        <UserInfo session={session} />
        <SignOutButton />
      </div>
    );
  }

  // Logged in and subscribed - show user info + sign out
  return (
    <div className="flex items-center gap-4">
      {isOwner(session) && (
        <Link href="/admin/checkup">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Activity className="w-4 h-4" />
            Checkup
          </Button>
        </Link>
      )}
      <UserInfo session={session} />
      <SignOutButton />
    </div>
  );
}
