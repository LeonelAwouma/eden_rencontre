/**
 * GET /api/google-meet/status
 *
 * Returns the current Google Meet authorization status for the authenticated user.
 * Does NOT expose any tokens or sensitive credentials.
 *
 * Response includes:
 * - connected: whether the user has Google Meet credentials stored
 * - hasMeetScope: whether the Meet scope is present
 * - tokenExpired: whether the access token has expired
 * - googleEmail: the Google account email (if available)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getMeetAuthStatus } from "@/lib/google-meet";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Session expirée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    const status = await getMeetAuthStatus(user.id);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    console.error("[API /google-meet/status] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}