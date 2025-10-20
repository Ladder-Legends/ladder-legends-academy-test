'use client';

import { useSession } from 'next-auth/react';
import { handleSignOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
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
