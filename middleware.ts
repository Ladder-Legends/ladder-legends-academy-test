import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Development bypass - skip all auth checks if SKIP_AUTH is true
  if (process.env.SKIP_AUTH === "true") {
    console.log("🔓 SKIP_AUTH enabled - bypassing authentication");
    return NextResponse.next();
  }

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
