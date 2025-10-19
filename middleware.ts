import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow access to login page and auth routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!req.auth) {
    console.log("❌ No auth session found, redirecting to login");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Development bypass - skip role checking if SKIP_ROLE_CHECK is true
  if (process.env.SKIP_ROLE_CHECK === "true") {
    console.log("🔓 SKIP_ROLE_CHECK enabled - user authenticated, bypassing role check");
    return NextResponse.next();
  }

  // Check if user has the required role
  if (!req.auth.user?.hasSubscriberRole) {
    console.log("❌ User authenticated but missing required role");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "no_role");
    return NextResponse.redirect(loginUrl);
  }

  console.log("✅ User authenticated with required role");
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
