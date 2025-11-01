'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider
      // Optimize session refetching to reduce API calls
      refetchInterval={0} // Disable automatic refetching (only refetch on demand)
      refetchOnWindowFocus={false} // Don't refetch when user switches tabs
      refetchWhenOffline={false} // Don't try to refetch when offline
    >
      {children}
    </NextAuthSessionProvider>
  );
}
