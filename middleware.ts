import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/api/auth", "/api/mcp"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public and API auth paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes require either session or Bearer token — handled in resolveUserId
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // App routes require session
  if (!req.auth?.user) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|.*\\.svg).*)"],
};
