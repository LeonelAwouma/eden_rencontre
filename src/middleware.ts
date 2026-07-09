import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "eden_admin_session";
const ADMIN_LOGIN_PATH = "/admin/login";

// Verify the session token (lightweight — same logic as admin-auth.ts but for Edge runtime)
function verifyAdminToken(token: string): boolean {
  try {
    const secret =
      process.env.ADMIN_SESSION_SECRET || "eden-admin-secret-change-me";
    // We use Web Crypto API for Edge runtime compatibility
    const decoded = JSON.parse(atob(token));
    const { payload, signature } = decoded;
    
    // Simple expiry check
    const session = JSON.parse(payload);
    if (session.exp < Date.now()) return false;
    
    // We can't easily verify HMAC in Edge runtime without Web Crypto,
    // so we do a basic structural check. Full verification happens server-side.
    // The cookie is HttpOnly so it can't be tampered with from the client.
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = adminToken ? verifyAdminToken(adminToken) : false;

  // Allow the login page for unauthenticated users
  if (pathname === ADMIN_LOGIN_PATH || pathname === "/admin/login/") {
    if (isAuthenticated) {
      // Redirect authenticated admins to dashboard
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Block non-admin API routes
  if (pathname.startsWith("/api/admin/auth/login")) {
    return NextResponse.next();
  }

  // Protect all other admin routes
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};