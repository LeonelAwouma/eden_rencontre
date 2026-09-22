// ── POST /auth/forgot-password ──────────────────────────────
// Initiates password reset by generating and sending an OTP via email.
// Always returns the same message to prevent user enumeration attacks.

import { NextRequest, NextResponse } from "next/server";
import {
  createOTP,
  findAuthUserByEmail,
  checkRateLimit,
  recordRateLimit,
  cleanupExpiredOTPs,
  cleanupOldRateLimits,
} from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";

// ── Input validation ────────────────────────────────────────
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Generic response — never reveals whether account exists
const GENERIC_RESPONSE = {
  success: true,
  message:
    "Si un compte existe avec cette adresse email, un code de vérification a été envoyé.",
};

export async function POST(request: NextRequest) {
  try {
    // ── Parse and validate input ───────────────────────────
    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Requête invalide." },
        { status: 400 }
      );
    }

    const rawEmail = body.email;
    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, message: "Adresse email requise." },
        { status: 400 }
      );
    }

    // Normalize email: trim and lowercase
    const email = rawEmail.trim().toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Adresse email invalide." },
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
      "forgot_password",
      5,      // max 5 requests
      3600    // per hour
    );

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trop de demandes. Veuillez réessayer dans quelques minutes.",
        },
        { status: 429 }
      );
    }

    // Record this request for rate limiting
    await recordRateLimit(ip, "forgot_password");

    // ── Look up user by email ──────────────────────────────
    let user;
    try {
      user = await findAuthUserByEmail(email);
    } catch (userError) {
      console.error("[ForgotPassword] Error listing users:", userError);
      // Return generic response — don't reveal error
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // ── If user not found, return same generic response ────
    if (!user) {
      // Trigger cleanup in background (fire and forget)
      cleanupExpiredOTPs().catch(() => {});
      cleanupOldRateLimits().catch(() => {});

      return NextResponse.json(GENERIC_RESPONSE);
    }

    // ── Generate and send OTP ──────────────────────────────
    const userAgent = request.headers.get("user-agent") || undefined;

    const otpResult = await createOTP(user.id, ip, userAgent);

    if (!otpResult.success || !otpResult.otpRecord) {
      console.error("[ForgotPassword] Failed to create OTP:", otpResult.error);
      // Return generic response — don't reveal internal error
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // The plaintext OTP is temporarily in otp_hash field (see createOTP implementation)
    // We need to extract it before it's discarded
    const plaintextOTP = (otpResult.otpRecord as any).otp || otpResult.otpRecord.otp_hash;

    // Send OTP email
    const emailSent = await sendOTPEmail(email, plaintextOTP);

    if (!emailSent) {
      console.error("[ForgotPassword] Failed to send OTP email to:", email);
      // Still return generic response — don't reveal email sending failure
    }

    // Trigger cleanup in background (fire and forget)
    cleanupExpiredOTPs().catch(() => {});
    cleanupOldRateLimits().catch(() => {});

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[ForgotPassword] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}