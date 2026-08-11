/**
 * POST /api/google-meet/disconnect
 *
 * Removes the stored Google Meet credentials for the authenticated user.
 * This effectively revokes the application's access to create Meet spaces
 * on behalf of the user.
 *
 * The user can reconnect at any time by going through the OAuth flow again.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { deleteCredentials } from "@/lib/google-meet";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Session expirée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    const result = await deleteCredentials(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de la déconnexion Google Meet." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Google Meet déconnecté avec succès.",
    });
  } catch (err: any) {
    console.error("[API /google-meet/disconnect] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}