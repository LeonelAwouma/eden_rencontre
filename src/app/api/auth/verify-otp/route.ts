// ── POST /auth/verify-otp ───────────────────────────────────
// Verifies the OTP submitted by the user.
// On success, returns a temporary reset token for password reset.

import { NextRequest, NextResponse } from "next/server";
import {
  verifyOTP,
  generateResetToken,
  checkRateLimit,
  recordRateLimit,
} from "@/lib/otp";

// ── Input validation ────────────────────────────────────────
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

export async function POST(request: NextRequest) {
  try {
    // ── Parse and validate input ───────────────────────────
    let body: { email?: string; otp?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Requête invalide." },
        { status: 400 }
      );
    }

    const rawEmail = body.email;
    const rawOTP = body.otp;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, message: "Adresse email requise." },
        { status: 400 }
      );
    }

    if (!rawOTP || typeof rawOTP !== "string") {
      return NextResponse.json(
        { success: false, message: "Code de vérification requis." },
        { status: 400 }
      );
    }

    // Normalize
    const email = rawEmail.trim().toLowerCase();
    const otp = rawOTP.trim();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Adresse email invalide." },
        { status: 400 }
      );
    }

    if (!isValidOTP(otp)) {
      return NextResponse.json(
        { success: false, message: "Le code doit contenir 6 chiffres." },
        { status: 400 }
      );
    }

    // ── Rate limiting (per IP) ─────────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const isAllowed = await checkRateLimit(
      ip,
      "verify_otp",
      10,     // max 10 verification attempts
      3600    // per hour
    );

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
        },
        { status: 429 }
      );
    }

    // Record this request for rate limiting
    await recordRateLimit(ip, "verify_otp");

    // ── Verify OTP ─────────────────────────────────────────
    const result = await verifyOTP(email, otp);

    if (!result.success) {
      return NextResponse.json(
        {
          verified: false,
          message: result.error || "Échec de la vérification.",
        },
        { status: 400 }
      );
    }

    // ── Generate temporary reset token ─────────────────────
    if (!result.otpRecord) {
      return NextResponse.json(
        { verified: false, message: "Erreur interne." },
        { status: 500 }
      );
    }

    const temporaryResetToken = generateResetToken(result.otpRecord.user_id);

    return NextResponse.json({
      verified: true,
      temporaryResetToken,
    });
  } catch (error) {
    console.error("[VerifyOTP] Unexpected error:", error);
    return NextResponse.json(
      {
        verified: false,
        message: "Une erreur est survenue. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}