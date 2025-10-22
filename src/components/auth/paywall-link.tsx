'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, MouseEvent } from 'react';

interface PaywallLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}

/**
 * Link component that enforces subscriber-only access.
 *
 * For non-subscribers:
 * - Internal links (/build-orders/123) → redirect to /subscribe
 * - External links (YouTube, etc.) → redirect to /subscribe
 *
 * For subscribers:
 * - Links work normally
 *
 * @example
 * ```tsx
 * <PaywallLink href="/build-orders/bo-1">View Build Order</PaywallLink>
 * ```
 *
 * @example
 * ```tsx
 * <PaywallLink href="https://youtube.com/..." external>Watch on YouTube</PaywallLink>
 * ```
 */
export function PaywallLink({ href, children, className, external = false }: PaywallLinkProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const hasAccess = session?.user?.hasSubscriberRole ?? false;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hasAccess) {
      e.preventDefault();
      router.push('/subscribe');
    }
  };

  // For external links (YouTube, etc.)
  if (external) {
    return (
      <a
        href={hasAccess ? href : '/subscribe'}
        onClick={handleClick}
        className={className}
        target={hasAccess ? "_blank" : undefined}
        rel={hasAccess ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }

  // For internal Next.js links
  return (
    <Link
      href={hasAccess ? href : '/subscribe'}
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}
