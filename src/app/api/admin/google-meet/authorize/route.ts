/**
 * POST /api/admin/google-meet/authorize
 *
 * Admin-specific Google OAuth authorization for Google Meet.
 * Uses admin cookie-based authentication instead of Supabase auth.
 *
 * Returns the Google OAuth URL that the admin should be redirected to.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  generateMeetAuthUrl,
  createOAuthState,
} from "@/lib/google-meet";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the admin
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json(
        { error: "Session administrateur expirée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // 2. Generate a CSRF state parameter containing the admin user ID
    const state = createOAuthState(admin.adminId);

    // 3. Build the callback URL (admin-specific)
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const redirectUri = `${origin}/api/admin/google-meet/callback`;

    // 4. Generate the Google OAuth URL
    let authUrl: string;
    try {
      authUrl = generateMeetAuthUrl(redirectUri, state);
    } catch (err: any) {
      console.error("[API /admin/google-meet/authorize] Failed to generate auth URL:", err.message);
      return NextResponse.json(
        { error: "Configuration OAuth manquante. Vérifiez GOOGLE_CLIENT_ID dans les variables d'environnement." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (err: any) {
    console.error("[API /admin/google-meet/authorize] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}