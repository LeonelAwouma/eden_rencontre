// ── OTP Service for Password Reset ──────────────────────────
// Handles cryptographically secure OTP generation, hashing, storage, and verification.
// Uses SHA-256 for OTP hashing and Supabase for persistence.

import crypto from "crypto";
import { getSupabaseAdmin } from "./supabase-admin";

// ── Constants ───────────────────────────────────────────────
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_HOUR = 3;

// ── Types ───────────────────────────────────────────────────
export interface OTPRecord {
  id: string;
  user_id: string;
  otp_hash: string;
  expires_at: string;
  attempts: number;
  used: boolean;
  created_at: string;
}

export interface OTPResult {
  success: boolean;
  error?: string;
  otpRecord?: OTPRecord;
}

export interface VerifyResult {
  success: boolean;
  error?: string;
  otpRecord?: OTPRecord;
}

// ── Logging (audit-safe — never logs OTP values or passwords) ──
function auditLog(action: string, details: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[OTP-AUDIT] ${timestamp} | ${action} |`, JSON.stringify(details));
}

// ── OTP Generation ──────────────────────────────────────────
/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Uses crypto.randomInt() which is CSPRNG-based.
 */
export function generateOTP(): string {
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

// ── OTP Hashing ─────────────────────────────────────────────
/**
 * Hashes an OTP using SHA-256 with a random salt.
 * Returns a string in format: salt:hash
 */
export function hashOTP(otp: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHash("sha256")
    .update(salt + otp)
    .digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies an OTP against its stored hash.
 * Hash format: salt:hash
 */
export function verifyOTPHash(otp: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computedHash = crypto
      .createHash("sha256")
      .update(salt + otp)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computedHash, "hex"));
  } catch {
    return false;
  }
}

// ── Rate Limiting ───────────────────────────────────────────
/**
 * Checks rate limits for a given identifier and action.
 * Returns true if the request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const db = getSupabaseAdmin();
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count, error } = await db
      .from("password_reset_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("action", action)
      .gte("created_at", windowStart);

    if (error) {
      console.error("[OTP] Rate limit check error:", error);
      // Fail open — allow request if rate limit check fails (but log it)
      return true;
    }

    return (count || 0) < maxRequests;
  } catch (err) {
    console.error("[OTP] Rate limit check exception:", err);
    return true;
  }
}

/**
 * Records a rate limit entry for the given identifier and action.
 */
export async function recordRateLimit(identifier: string, action: string): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    await db.from("password_reset_rate_limits").insert({
      identifier,
      action,
    });
  } catch (err) {
    console.error("[OTP] Rate limit recording error:", err);
  }
}

// ── OTP Repository Operations ───────────────────────────────

/**
 * Creates a new OTP for a user.
 * Invalidates any previous unused OTPs for the same user.
 */
export async function createOTP(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<OTPResult> {
  try {
    const db = getSupabaseAdmin();

    // Invalidate previous unused OTPs for this user
    const { error: invalidateError } = await db
      .from("password_reset_otps")
      .update({ used: true })
      .eq("user_id", userId)
      .eq("used", false);

    if (invalidateError) {
      console.error("[OTP] Error invalidating previous OTPs:", invalidateError);
    }

    // Generate and hash new OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Store the hashed OTP
    const { data: record, error: insertError } = await db
      .from("password_reset_otps")
      .insert({
        user_id: userId,
        otp_hash: otpHash,
        expires_at: expiresAt,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[OTP] Error creating OTP record:", insertError);
      return { success: false, error: "Failed to create OTP." };
    }

    auditLog("OTP_GENERATED", {
      userId,
      expiresAt,
      ipAddress: ipAddress ? "present" : "absent",
    });

    // Return the OTP record with the plaintext OTP temporarily attached
    // (The caller is responsible for sending it via email and discarding the plaintext)
    return {
      success: true,
      otpRecord: { ...record, otp_hash: otp } as unknown as OTPRecord & { otp: string },
    };
  } catch (err) {
    console.error("[OTP] createOTP exception:", err);
    return { success: false, error: "Internal error creating OTP." };
  }
}

/**
 * Retrieves the active OTP record for a user (not used, not expired).
 */
export async function getActiveOTP(userId: string): Promise<OTPRecord | null> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("password_reset_otps")
      .select("*")
      .eq("user_id", userId)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Verifies an OTP for a given email.
 * Returns the OTP record if verification succeeds.
 */
export async function verifyOTP(email: string, otp: string): Promise<VerifyResult> {
  try {
    const db = getSupabaseAdmin();

    // Look up user by email using Supabase Admin
    const { data: userData, error: userError } = await db.auth.admin.listUsers();
    if (userError) {
      console.error("[OTP] Error listing users:", userError);
      return { success: false, error: "Verification failed." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = userData.users.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!user) {
      // Don't reveal whether user exists — return same generic error
      auditLog("OTP_VERIFY_NO_USER", { email: cleanEmail });
      return { success: false, error: "Code de vérification invalide." };
    }

    // Get active OTP
    const otpRecord = await getActiveOTP(user.id);
    if (!otpRecord) {
      auditLog("OTP_VERIFY_NO_ACTIVE_OTP", { userId: user.id });
      return { success: false, error: "Code de vérification invalide ou expiré." };
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      // Mark as used (invalidated)
      await db
        .from("password_reset_otps")
        .update({ used: true })
        .eq("id", otpRecord.id);

      auditLog("OTP_VERIFY_MAX_ATTEMPTS", { userId: user.id, otpId: otpRecord.id });
      return {
        success: false,
        error: "Ce code de vérification n'est plus valide. Veuillez en demander un nouveau.",
      };
    }

    // Verify the OTP hash
    const isValid = verifyOTPHash(otp, otpRecord.otp_hash);
    if (!isValid) {
      // Increment attempts
      await db
        .from("password_reset_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      auditLog("OTP_VERIFY_FAILED", {
        userId: user.id,
        otpId: otpRecord.id,
        attempts: otpRecord.attempts + 1,
      });

      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts - 1;
      if (remainingAttempts <= 0) {
        return {
          success: false,
          error: "Ce code de vérification n'est plus valide. Veuillez en demander un nouveau.",
        };
      }

      return {
        success: false,
        error: `Code incorrect. Il vous reste ${remainingAttempts} tentative${remainingAttempts > 1 ? "s" : ""}.`,
      };
    }

    // OTP is valid — mark as used
    await db
      .from("password_reset_otps")
      .update({ used: true })
      .eq("id", otpRecord.id);

    auditLog("OTP_VERIFY_SUCCESS", { userId: user.id, otpId: otpRecord.id });

    return { success: true, otpRecord: { ...otpRecord, used: true } };
  } catch (err) {
    console.error("[OTP] verifyOTP exception:", err);
    return { success: false, error: "Erreur lors de la vérification." };
  }
}

// ── Temporary Reset Token ───────────────────────────────────
/**
 * Generates a cryptographically signed temporary reset token.
 * This token is short-lived and required for the password reset request.
 * Format: base64(JSON({userId, expiresAt, signature}))
 */
export function generateResetToken(userId: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || "eden-reset-secret";
  const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

  const payload = JSON.stringify({ userId, expiresAt });
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const token = JSON.stringify({ payload, signature });
  return Buffer.from(token).toString("base64url");
}

/**
 * Verifies a temporary reset token and returns the userId if valid.
 */
export function verifyResetToken(token: string): { valid: boolean; userId?: string; error?: string } {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || "eden-reset-secret";
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    const { payload, signature } = decoded;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: "Invalid token signature." };
    }

    const { userId, expiresAt } = JSON.parse(payload);

    // Check expiration
    if (Date.now() > expiresAt) {
      return { valid: false, error: "Token expired." };
    }

    return { valid: true, userId };
  } catch {
    return { valid: false, error: "Invalid token format." };
  }
}

// ── Cleanup ─────────────────────────────────────────────────
/**
 * Removes expired OTP records (older than 1 hour past expiry).
 * Should be called periodically or as a maintenance task.
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  try {
    const db = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from("password_reset_otps")
      .delete()
      .lt("expires_at", cutoff)
      .select("id");

    if (error) {
      console.error("[OTP] Cleanup error:", error);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      auditLog("OTP_CLEANUP", { deletedCount: count });
    }
    return count;
  } catch (err) {
    console.error("[OTP] Cleanup exception:", err);
    return 0;
  }
}

/**
 * Cleans up old rate limit records (older than 2 hours).
 */
export async function cleanupOldRateLimits(): Promise<number> {
  try {
    const db = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from("password_reset_rate_limits")
      .delete()
      .lt("created_at", cutoff)
      .select("id");

    if (error) {
      console.error("[OTP] Rate limit cleanup error:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (err) {
    console.error("[OTP] Rate limit cleanup exception:", err);
    return 0;
  }
}

// ── Constants Export ─────────────────────────────────────────
export const OTP_CONFIG = {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  MAX_RESENDS_PER_HOUR,
} as const;