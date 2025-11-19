'use client';

import React from 'react';
import { useSession, signOut as clientSignOut } from 'next-auth/react';
import { LogOut, User, LogIn, Activity, CreditCard, Settings, Download, FileText } from "lucide-react";
import Link from "next/link";
import { isOwner, isCoach } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

function UserAvatar({ name, email, image }: { name?: string | null; email?: string | null; image?: string | null }) {
  const displayName = name || email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  if (image) {
    return (
      <img
        src={image}
        alt={displayName}
        className="w-9 h-9 rounded-full hover:opacity-90 transition-opacity"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
      {initial}
    </div>
  );
}

export function UserMenu() {
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  React.useEffect(() => {
    console.log('[CLIENT] UserMenu session state:', session);
  }, [session]);

  const handleSignOut = async () => {
    console.log('[CLIENT] Sign out button clicked');
    setIsSigningOut(true);
    try {
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
  };

  // Not logged in - show simple login button
  if (!session?.user) {
    return (
      <Link href="/login">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
          <User className="w-5 h-5" />
        </div>
      </Link>
    );
  }

  const userName = session.user.name || session.user.email || 'User';
  const isSubscribed = session.user.hasSubscriberRole;
  const isAdmin = isOwner(session);
  const isCoachOrOwner = isCoach(session);

  return (
    <DropdownMenu
      trigger={<UserAvatar name={session.user.name} email={session.user.email} image={session.user.image} />}
      align="right"
    >
      <DropdownMenuLabel>
        <div className="flex flex-col">
          <span className="font-semibold">{userName}</span>
          {session.user.email && session.user.name && (
            <span className="text-xs text-muted-foreground font-normal">{session.user.email}</span>
          )}
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      {!isSubscribed && (
        <>
          <Link href="/subscribe">
            <DropdownMenuItem>
              <CreditCard className="w-4 h-4 mr-2" />
              Subscribe
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
        </>
      )}

      {isAdmin && (
        <>
          <Link href="/admin/checkup">
            <DropdownMenuItem>
              <Activity className="w-4 h-4 mr-2" />
              Checkup
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
        </>
      )}

      {isCoachOrOwner && (
        <>
          <Link href="/my-replays">
            <DropdownMenuItem>
              <FileText className="w-4 h-4 mr-2" />
              My Replays
            </DropdownMenuItem>
          </Link>
          <Link href="/download">
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
        </>
      )}

      <Link href="/settings">
        <DropdownMenuItem>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
      </Link>
      <DropdownMenuSeparator />

      <DropdownMenuItem onClick={handleSignOut} className={isSigningOut ? 'opacity-50' : ''}>
        <LogOut className="w-4 h-4 mr-2" />
        {isSigningOut ? 'Signing out...' : 'Sign out'}
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
