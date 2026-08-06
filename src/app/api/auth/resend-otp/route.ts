// ── POST /auth/resend-otp ───────────────────────────────────
// Resends a new OTP to the user's email.
// Rules: max 1 request every 60 seconds, max 3 per hour.
// Always invalidates previous OTP and generates a new one.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  createOTP,
  checkRateLimit,
  recordRateLimit,
  OTP_CONFIG,
} from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";

// ── Input validation ────────────────────────────────────────
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Generic response — same as forgot-password to prevent enumeration
const GENERIC_RESPONSE = {
  success: true,
  message:
    "Si un compte existe avec cette adresse email, un nouveau code de vérification a été envoyé.",
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

    const email = rawEmail.trim().toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Adresse email invalide." },
        { status: 400 }
      );
    }

    // ── Rate limiting ──────────────────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check cooldown: 1 request every 60 seconds per IP+email
    const cooldownKey = `${ip}:${email}`;
    const isCooldownOk = await checkRateLimit(
      cooldownKey,
      "resend_otp_cooldown",
      1,                // max 1 request
      OTP_CONFIG.RESEND_COOLDOWN_SECONDS  // per 60 seconds
    );

    if (!isCooldownOk) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Veuillez attendre avant de demander un nouveau code.",
        },
        { status: 429 }
      );
    }

    // Check hourly limit: max 3 resends per hour per IP
    const isHourlyOk = await checkRateLimit(
      ip,
      "resend_otp_hourly",
      OTP_CONFIG.MAX_RESENDS_PER_HOUR,  // max 3
      3600                               // per hour
    );

    if (!isHourlyOk) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trop de demandes. Veuillez réessayer dans quelques minutes.",
        },
        { status: 429 }
      );
    }

    // Record both rate limits
    await recordRateLimit(cooldownKey, "resend_otp_cooldown");
    await recordRateLimit(ip, "resend_otp_hourly");

    // ── Look up user and generate new OTP ──────────────────
    const db = getSupabaseAdmin();

    const { data: userData, error: userError } =
      await db.auth.admin.listUsers();

    if (userError) {
      console.error("[ResendOTP] Error listing users:", userError);
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const user = userData.users.find(
      (u) => u.email?.toLowerCase() === email
    );

    // If user not found, return same generic response
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Generate new OTP (this also invalidates previous unused OTPs)
    const userAgent = request.headers.get("user-agent") || undefined;

    const otpResult = await createOTP(user.id, ip, userAgent);

    if (!otpResult.success || !otpResult.otpRecord) {
      console.error("[ResendOTP] Failed to create OTP:", otpResult.error);
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Extract plaintext OTP
    const plaintextOTP = (otpResult.otpRecord as any).otp || otpResult.otpRecord.otp_hash;

    // Send new OTP email
    const emailSent = await sendOTPEmail(email, plaintextOTP);

    if (!emailSent) {
      console.error("[ResendOTP] Failed to send OTP email to:", email);
    }

    console.log(
      `[OTP-AUDIT] ${new Date().toISOString()} | OTP_RESENT |`,
      JSON.stringify({ userId: user.id, email })
    );

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[ResendOTP] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}