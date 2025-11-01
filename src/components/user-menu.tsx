'use client';

import { useSession } from 'next-auth/react';
import { handleSignOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, LogIn, Activity } from "lucide-react";
import Link from "next/link";
import { isOwner } from "@/lib/permissions";

export function UserMenu() {
  const { data: session } = useSession();

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
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {session.user.name || session.user.email}
          </span>
        </div>
        <form action={handleSignOut}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </form>
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
      <div className="flex items-center gap-2 text-sm">
        <User className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground">
          {session.user.name || session.user.email}
        </span>
      </div>
      <form action={handleSignOut}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
