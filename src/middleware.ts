import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`🛡️ Middleware running for: ${pathname}`);

  // Allow access to public routes
  const publicRoutes = [
    "/login",
    "/subscribe",
    "/api/auth",
    "/",
    "/library",
    "/build-orders",
    "/replays",
    "/masterclasses",
    "/coaches",
  ];

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`) || pathname.startsWith(route)
  );

  // Define detail page patterns that require subscription
  const detailPagePatterns = [
    /^\/build-orders\/[^/]+$/,  // /build-orders/:id
    /^\/replays\/[^/]+$/,         // /replays/:id
    /^\/masterclasses\/[^/]+$/,   // /masterclasses/:id
  ];

  const isDetailPage = detailPagePatterns.some(pattern => pattern.test(pathname));

  // Allow access to auth routes and subscribe page
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname === "/subscribe") {
    console.log(`⏭️ Allowing access to public route: ${pathname}`);
    return NextResponse.next();
  }

  // Get the session
  const session = await auth();
  console.log(`🔐 Session check: ${session ? 'authenticated' : 'not authenticated'}`);

  // Allow browse pages for everyone (authenticated or not)
  if (isPublicRoute && !isDetailPage) {
    console.log(`👀 Allowing browse access to: ${pathname}`);
    return NextResponse.next();
  }

  // For detail pages, require subscriber role
  if (isDetailPage) {
    console.log(`🔒 Detail page detected: ${pathname}`);

    if (!session) {
      console.log("❌ No session, redirecting to /subscribe");
      return NextResponse.redirect(new URL("/subscribe", request.url));
    }

    // Development bypass - skip role checking if SKIP_ROLE_CHECK is true
    // Only applies to authenticated users on detail pages
    if (process.env.SKIP_ROLE_CHECK === "true") {
      console.log("🔓 SKIP_ROLE_CHECK enabled - granting subscriber access to authenticated user");
      console.log("✅ Dev bypass: allowing access to detail page");
      return NextResponse.next();
    }

    if (!session.user?.hasSubscriberRole) {
      console.log("❌ User authenticated but not a subscriber, redirecting to /subscribe");
      return NextResponse.redirect(new URL("/subscribe", request.url));
    }

    console.log("✅ User is subscriber, allowing access to detail page");
    return NextResponse.next();
  }

  // For admin routes (future), require authentication
  if (pathname.startsWith("/admin")) {
    if (!session) {
      console.log("❌ Admin route requires authentication, redirecting to login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  console.log("✅ Allowing access");
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
