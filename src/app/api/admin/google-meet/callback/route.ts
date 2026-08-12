/**
 * GET /api/admin/google-meet/callback
 *
 * This endpoint is no longer used directly — the admin OAuth flow now goes
 * through the shared /api/google-meet/callback endpoint with a `returnTo`
 * field in the OAuth state to redirect back to /admin/meets.
 *
 * This file is kept as a fallback that redirects to the admin meets page.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/admin/meets`);
}