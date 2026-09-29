import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, logAdminAction } from "@/lib/admin-auth";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";

// 5 tentatives échouées par adresse IP sur 15 minutes, puis blocage temporaire.
const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const limiterKey = `admin:${ip}`;
    if (!(await checkRateLimit(limiterKey, "admin_auth_failure", MAX_FAILURES, WINDOW_SECONDS))) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 15 minutes." },
        { status: 429 }
      );
    }

    const result = await loginAdmin(email, password);

    if (!result.ok) {
      await recordRateLimit(limiterKey, "admin_auth_failure");
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Log the login action
    await logAdminAction(
      result.admin.id,
      result.admin.email,
      "admin_login",
      "system",
      undefined,
      { ip },
      ip
    );

    return NextResponse.json({
      ok: true,
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
        role: result.admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
