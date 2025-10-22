'use client';

import { useSession } from 'next-auth/react';
import { hasPermission, type PermissionLevel } from '@/lib/permissions';
import { ReactNode } from 'react';

interface PermissionGateProps {
  children: ReactNode;
  require: PermissionLevel | PermissionLevel[];
  fallback?: ReactNode;
}

/**
 * Component that only renders children if the user has the required permission level
 *
 * @example
 * ```tsx
 * <PermissionGate require="coaches">
 *   <button>Edit Content</button>
 * </PermissionGate>
 * ```
 *
 * @example
 * ```tsx
 * <PermissionGate require={["coaches", "owners"]}>
 *   <button>Manage</button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({ children, require, fallback = null }: PermissionGateProps) {
  const { data: session } = useSession();

  if (!hasPermission(session, require)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
