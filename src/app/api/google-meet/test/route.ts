/**
 * POST /api/google-meet/test
 *
 * Creates a Google Meet space to verify that the authorization works.
 * Returns only safe information (meeting URI, code, space name).
 * Never exposes access tokens, refresh tokens, or client secrets.
 *
 * Requires an authenticated Supabase user with Google Meet credentials.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { createMeetSpace, getMeetAuthStatus } from "@/lib/google-meet";

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

    // 2. Check authorization status first for better error messages
    const status = await getMeetAuthStatus(user.id);

    if (!status.connected) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google Meet n'est pas connecté. Veuillez d'abord autoriser l'application via « Activer les appels vidéo ».",
          errorCode: "NOT_CONNECTED",
        },
        { status: 403 }
      );
    }

    if (!status.hasMeetScope) {
      return NextResponse.json(
        {
          success: false,
          error:
            "L'autorisation Google Meet est requise. Veuillez vous reconnecter avec votre compte Google et accorder la permission Google Meet.",
          errorCode: "MISSING_MEET_SCOPE",
        },
        { status: 403 }
      );
    }

    // 3. Create a Google Meet space
    const result = await createMeetSpace(user.id);

    if (!result.success) {
      // Map error code to HTTP status
      const httpStatus =
        result.errorCode === "UNAUTHENTICATED"
          ? 401
          : result.errorCode === "PERMISSION_DENIED"
          ? 403
          : result.errorCode === "MISSING_CREDENTIALS"
          ? 401
          : result.errorCode === "MISSING_MEET_SCOPE"
          ? 403
          : 500;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        },
        { status: httpStatus }
      );
    }

    // 4. Return only safe information
    return NextResponse.json({
      success: true,
      meetingUri: result.meetingUri,
      meetingCode: result.meetingCode,
      spaceName: result.spaceName,
    });
  } catch (err: any) {
    console.error("[API /google-meet/test] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}