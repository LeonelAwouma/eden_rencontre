/**
 * POST /api/admin/google-meet/disconnect
 *
 * Removes the stored Google Meet credentials for the admin user.
 * This allows the admin to reconnect with a different Google account.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteCredentials } from "@/lib/google-meet";

export async function POST(_request: NextRequest) {
  try {
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json(
        { error: "Session administrateur expirée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    const result = await deleteCredentials(admin.adminId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de la déconnexion Google Meet." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Google Meet déconnecté. Vous pouvez maintenant connecter un autre compte.",
    });
  } catch (err: any) {
    console.error("[API /admin/google-meet/disconnect] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}