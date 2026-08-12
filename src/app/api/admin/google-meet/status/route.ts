/**
 * GET /api/admin/google-meet/status
 *
 * Returns the current Google Meet authorization status for the admin.
 * Does NOT expose any tokens or sensitive credentials.
 *
 * Uses admin cookie-based authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getMeetAuthStatus } from "@/lib/google-meet";

export async function GET(request: NextRequest) {
  try {
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json(
        { error: "Session administrateur expirée." },
        { status: 401 }
      );
    }

    const status = await getMeetAuthStatus(admin.adminId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    console.error("[API /admin/google-meet/status] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}