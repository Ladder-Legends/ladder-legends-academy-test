import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`🛡️ Middleware running for: ${pathname}`);

  // Allow access to login page and auth routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    console.log(`⏭️ Allowing access to auth route: ${pathname}`);
    return NextResponse.next();
  }

  // Get the session
  const session = await auth();
  console.log(`🔐 Session check: ${session ? 'authenticated' : 'not authenticated'}`);

  // Check if user is authenticated
  if (!session) {
    console.log("❌ No auth session found, redirecting to login");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Development bypass - skip role checking if SKIP_ROLE_CHECK is true
  if (process.env.SKIP_ROLE_CHECK === "true") {
    console.log("🔓 SKIP_ROLE_CHECK enabled - user authenticated, bypassing role check");
    return NextResponse.next();
  }

  // Check if user has the required role
  console.log(`🔍 Checking role for user. hasSubscriberRole: ${session.user?.hasSubscriberRole}`);

  if (!session.user?.hasSubscriberRole) {
    console.log("❌ User authenticated but missing required role, redirecting to /login");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "no_role");
    return NextResponse.redirect(loginUrl);
  }

  console.log("✅ User authenticated with required role");
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
