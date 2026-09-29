import { NextRequest, NextResponse } from "next/server";
import { changeAdminPassword, logAdminAction } from "@/lib/admin-auth";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";

// Changement du mot de passe administrateur depuis la page de connexion
// (sans session : l'email et le mot de passe actuel font foi). Comme un
// formulaire de connexion, il permet de tester un mot de passe : il partage
// donc la même limite de tentatives que /api/admin/auth/login.
const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await request.json().catch(() => ({}));
    if (typeof email !== "string" || typeof currentPassword !== "string" || typeof newPassword !== "string" || !email || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const limiterKey = `admin:${ip}`;
    if (!(await checkRateLimit(limiterKey, "admin_auth_failure", MAX_FAILURES, WINDOW_SECONDS))) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, { status: 429 });
    }

    const result = await changeAdminPassword(email, currentPassword, newPassword);
    if (!result.ok) {
      if (result.badCredentials) await recordRateLimit(limiterKey, "admin_auth_failure");
      return NextResponse.json({ error: result.error }, { status: result.badCredentials ? 401 : 400 });
    }

    await logAdminAction(result.adminId, email.toLowerCase().trim(), "admin_password_changed", "system", undefined, { ip }, ip);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin change-password error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
