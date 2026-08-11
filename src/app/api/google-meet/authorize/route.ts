/**
 * POST /api/google-meet/authorize
 *
 * Generates a Google OAuth authorization URL for Google Meet.
 * Returns the URL that the frontend should redirect the user to.
 *
 * This is a SEPARATE OAuth flow from Supabase auth — it only requests
 * the Google Meet scope and stores tokens per-user.
 *
 * Requires an authenticated Supabase session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import {
  generateMeetAuthUrl,
  createOAuthState,
} from "@/lib/google-meet";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Session expirée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // 2. Generate a CSRF state parameter containing the user ID
    const state = createOAuthState(user.id);

    // 3. Build the callback URL
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const redirectUri = `${origin}/api/google-meet/callback`;

    // 4. Generate the Google OAuth URL
    let authUrl: string;
    try {
      authUrl = generateMeetAuthUrl(redirectUri, state);
    } catch (err: any) {
      console.error("[API /google-meet/authorize] Failed to generate auth URL:", err.message);
      return NextResponse.json(
        { error: "Configuration OAuth manquante. Contactez l'administrateur." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (err: any) {
    console.error("[API /google-meet/authorize] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}