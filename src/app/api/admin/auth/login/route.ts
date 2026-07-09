import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, logAdminAction } from "@/lib/admin-auth";

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

    const result = await loginAdmin(email, password);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Log the login action
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
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