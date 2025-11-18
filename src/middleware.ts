import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

// Use Edge Runtime for faster, cheaper execution
export const runtime = 'experimental-edge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow bots and crawlers to access content for SEO/social sharing
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|crawl|slurp|spider|facebook|twitter|whatsapp|linkedin|telegram|discord/i.test(userAgent);

  if (isBot) {
    return NextResponse.next();
  }

  // Early return for public routes - no auth check needed
  // This saves compute by not calling auth() unnecessarily
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/free/") || // Free content routes (no auth required)
    pathname === "/subscribe" ||
    pathname === "/" ||
    pathname === "/library" ||
    pathname === "/build-orders" ||
    pathname === "/replays" ||
    pathname === "/masterclasses" ||
    pathname === "/events" ||
    pathname === "/coaches"
  ) {
    return NextResponse.next();
  }

  // Admin routes require authentication
  // Detail pages now use soft paywall (no redirect, handled client-side)
  if (pathname.startsWith("/admin")) {
    const session = await auth();

    if (!session) {
      return NextResponse.redirect(new URL("/subscribe", request.url));
    }

    // Development bypass - skip role checking if SKIP_ROLE_CHECK is true
    if (process.env.SKIP_ROLE_CHECK === "true") {
      return NextResponse.next();
    }

    if (!session.user?.hasSubscriberRole) {
      return NextResponse.redirect(new URL("/subscribe", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
