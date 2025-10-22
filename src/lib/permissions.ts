import { Session } from "next-auth";

// Discord role IDs
export const ROLE_IDS = {
  OWNER: "1386739785283928124",
  MODERATOR: "1386739850731851817",
  COACH: "1387372036665643188",
  SUBSCRIBER: "1387076312878813337",
  MEMBER: "1386740453264724068",
} as const;

/**
 * Permission levels for different operations
 */
export type PermissionLevel = "owners" | "coaches" | "subscribers";

/**
 * Role emulation for development only
 * Returns emulated role IDs if EMULATE_ROLE is set and we're in development
 */
function getEmulatedRoles(): string[] | null {
  // Only allow emulation in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Check both server-side and client-side env vars
  // NEXT_PUBLIC_ prefix makes it available on client side
  const emulateRole = (
    process.env.EMULATE_ROLE ||
    process.env.NEXT_PUBLIC_EMULATE_ROLE
  )?.toLowerCase();

  if (!emulateRole) {
    return null;
  }

  switch (emulateRole) {
    case 'owner':
      return [ROLE_IDS.OWNER];
    case 'coach':
      return [ROLE_IDS.COACH];
    case 'subscriber':
      return [ROLE_IDS.SUBSCRIBER];
    default:
      return null;
  }
}

/**
 * Helper to get roles with emulation support
 */
function getRoles(session: Session | null): string[] {
  const emulatedRoles = getEmulatedRoles();
  if (emulatedRoles) {
    return emulatedRoles;
  }
  return session?.user?.roles || [];
}

/**
 * Check if user has owner role
 */
export function isOwner(session: Session | null): boolean {
  const roles = getRoles(session);
  return roles.includes(ROLE_IDS.OWNER);
}

/**
 * Check if user has coach role (includes owners)
 */
export function isCoach(session: Session | null): boolean {
  const roles = getRoles(session);
  return (
    roles.includes(ROLE_IDS.COACH) ||
    roles.includes(ROLE_IDS.OWNER)
  );
}

/**
 * Check if user has subscriber access (includes coaches and owners)
 */
export function isSubscriber(session: Session | null): boolean {
  const roles = getRoles(session);
  return (
    roles.includes(ROLE_IDS.SUBSCRIBER) ||
    roles.includes(ROLE_IDS.COACH) ||
    roles.includes(ROLE_IDS.OWNER)
  );
}

/**
 * Check if user has required permission level
 */
export function hasPermission(
  session: Session | null,
  requiredPermission: PermissionLevel | PermissionLevel[]
): boolean {
  // Allow emulated roles even without a session (development only)
  const emulatedRoles = getEmulatedRoles();
  if (!emulatedRoles && !session) return false;

  const permissions = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  for (const permission of permissions) {
    switch (permission) {
      case "owners":
        if (isOwner(session)) return true;
        break;
      case "coaches":
        if (isCoach(session)) return true;
        break;
      case "subscribers":
        if (isSubscriber(session)) return true;
        break;
    }
  }

  return false;
}

/**
 * Get user's highest permission level
 */
export function getUserPermissionLevel(
  session: Session | null
): PermissionLevel | null {
  if (!session) return null;

  if (isOwner(session)) return "owners";
  if (isCoach(session)) return "coaches";
  if (isSubscriber(session)) return "subscribers";

  return null;
}
