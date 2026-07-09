import { NextRequest, NextResponse } from "next/server";
import { logoutAdmin } from "@/lib/admin-auth";

export async function POST(_request: NextRequest) {
  try {
    await logoutAdmin();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion." },
      { status: 500 }
    );
  }
}