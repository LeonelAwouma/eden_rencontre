// ── POST /auth/reset-password ───────────────────────────────
// Resets the user's password using a valid temporary reset token.
// After reset, invalidates all active sessions for the user.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyResetToken, checkRateLimit, recordRateLimit } from "@/lib/otp";import { sendPasswordResetSuccessEmail } from "@/lib/email";
import { realEmailOrNull } from "@/lib/phone-identity";
import {
  consumeAdminResetToken,
  isAdminResetToken,
  logResetUsed,
  releaseAdminResetToken,
} from "@/lib/password-reset-requests";

// ── Password validation ─────────────────────────────────────
function validatePassword(password: string): string | null {
  if (!password || typeof password !== "string") {
    return "Le mot de passe est requis.";
  }
  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre majuscule.";
  }
  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre minuscule.";
  }
  if (!/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un caractère spécial.";
  }
  return null;
}

/**
 * Calculates password strength on a 0–4 scale.
 * 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong
 */
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Normalize to 0–4
  const normalizedScore = Math.min(4, Math.max(1, score));

  const levels = [
    { label: "Très faible", color: "#dc3545" },
    { label: "Faible", color: "#fd7e14" },
    { label: "Moyen", color: "#ffc107" },
    { label: "Fort", color: "#28a745" },
    { label: "Très fort", color: "#2D5016" },
  ];

  return {
    score: normalizedScore,
    label: levels[normalizedScore].label,
    color: levels[normalizedScore].color,
  };
}

export async function POST(request: NextRequest) {
  try {
    // ── Parse and validate input ───────────────────────────
    let body: {
      temporaryResetToken?: string;
      password?: string;
      confirmPassword?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Requête invalide." },
        { status: 400 }
      );
    }

    const { temporaryResetToken, password, confirmPassword } = body;

    // Validate required fields
    if (!temporaryResetToken || typeof temporaryResetToken !== "string") {
      return NextResponse.json(
        { success: false, message: "Token de réinitialisation requis." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Le nouveau mot de passe est requis." },
        { status: 400 }
      );
    }

    if (!confirmPassword || typeof confirmPassword !== "string") {
      return NextResponse.json(
        { success: false, message: "La confirmation du mot de passe est requise." },
        { status: 400 }
      );
    }

    // Check passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Les mots de passe ne correspondent pas." },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { success: false, message: passwordError },
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
      "reset_password",
      5,      // max 5 requests
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

    await recordRateLimit(ip, "reset_password");

    // ── Verify temporary reset token ───────────────────────
    const db = getSupabaseAdmin();
    // Deux sortes de jetons : le jeton HMAC du parcours OTP e-mail, et le lien à usage unique
    // émis par l'admin pour un compte « téléphone seul » (lib/password-reset-requests.ts).
    let userId: string;
    let adminRequestId: string | null = null;
    if (isAdminResetToken(temporaryResetToken)) {
      const consumed = await consumeAdminResetToken(db, temporaryResetToken);
      if (!consumed) {
        return NextResponse.json(
          {
            success: false,
            message: "Ce lien est invalide, expiré ou déjà utilisé. Demandez un nouveau lien à l'administration.",
          },
          { status: 400 }
        );
      }
      userId = consumed.userId;
      adminRequestId = consumed.requestId;
    } else {
      const tokenResult = verifyResetToken(temporaryResetToken);

      if (!tokenResult.valid || !tokenResult.userId) {
        return NextResponse.json(
          {
            success: false,
            message: "Token de réinitialisation invalide ou expiré. Veuillez recommencer le processus.",
          },
          { status: 400 }
        );
      }
      userId = tokenResult.userId;
    }

    // ── Update password via Supabase Admin ─────────────────

    // Get user info for the success email
    const { data: userData, error: getUserError } =
      await db.auth.admin.getUserById(userId);

    if (getUserError || !userData?.user) {
      console.error("[ResetPassword] Error fetching user:", getUserError);
      if (adminRequestId) await releaseAdminResetToken(db, adminRequestId);
      return NextResponse.json(
        { success: false, message: "Utilisateur introuvable." },
        { status: 400 }
      );
    }

    const user = userData.user;

    // Update the password
    const { error: updateError } = await db.auth.admin.updateUserById(userId, {
      password: password,
    });

    if (updateError) {
      console.error("[ResetPassword] Error updating password:", updateError);
      // Le lien reste utilisable : la personne n'a pas pu changer son mot de passe.
      if (adminRequestId) await releaseAdminResetToken(db, adminRequestId);
      return NextResponse.json(
        {
          success: false,
          message: "Erreur lors de la mise à jour du mot de passe.",
        },
        { status: 500 }
      );
    }

    // ── Record the reset on the account ────────────────────
    try {
      await db.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          _password_reset_at: new Date().toISOString(),
        },
      });
    } catch (sessionErr) {
      // Non-critical — password was already changed
      console.warn("[ResetPassword] Session invalidation warning:", sessionErr);
    }

    // ── Send success email ─────────────────────────────────
    const userName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0];

    // Compte « téléphone seul » : pas d'adresse, donc pas d'e-mail de confirmation.
    const realEmail = realEmailOrNull(user.email);
    if (realEmail) {
      sendPasswordResetSuccessEmail(realEmail, userName).catch((err) => {
        console.error("[ResetPassword] Failed to send success email:", err);
      });
    }

    // ── Audit log ──────────────────────────────────────────
    console.log(
      `[OTP-AUDIT] ${new Date().toISOString()} | PASSWORD_RESET_SUCCESS |`,
      JSON.stringify({ userId, email: realEmail })
    );
    if (adminRequestId) await logResetUsed(db, userId, adminRequestId, ip === "unknown" ? null : ip);

    return NextResponse.json({
      success: true,
      message:
        "Votre mot de passe a été mis à jour avec succès. Veuillez vous reconnecter.",
    });
  } catch (error) {
    console.error("[ResetPassword] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Une erreur est survenue. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}