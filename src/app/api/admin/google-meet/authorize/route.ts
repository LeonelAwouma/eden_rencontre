/**
 * POST /api/admin/google-meet/authorize
 *
 * Admin-specific Google OAuth authorization for Google Meet.
 * Uses admin cookie-based authentication instead of Supabase auth.
 *
 * Returns the Google OAuth URL that the admin should be redirected to.
 * Uses the SAME callback URL as the user flow (/api/google-meet/callback)
 * to avoid redirect_uri_mismatch errors with Google Cloud Console.
 * The admin destination (/admin/meets) is encoded in the OAuth state.
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

    // 2. Generate a CSRF state with admin ID and return path
    const state = createOAuthState(admin.adminId, "/admin/meets");

    // 3. Use the SAME callback URL as the user flow (already in Google Cloud Console)
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const redirectUri = `${origin}/api/google-meet/callback`;

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