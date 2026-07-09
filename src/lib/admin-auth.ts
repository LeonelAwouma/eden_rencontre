import crypto from "crypto";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "./supabase-admin";

// ── Constants ────────────────────────────────────────────────
const ADMIN_SESSION_COOKIE = "eden_admin_session";
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

// ── Types ────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AdminSession {
  adminId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export type AdminAuthResult =
  | { ok: true; admin: AdminUser }
  | { ok: false; error: string };

// ── Password Hashing (PBKDF2 — no external dependency) ──────
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(verifyHash, "hex")
  );
}

// ── Session Token ────────────────────────────────────────────
function createSessionToken(session: AdminSession): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "eden-admin-secret-change-me";
  const payload = JSON.stringify(session);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return Buffer.from(
    JSON.stringify({ payload, signature })
  ).toString("base64");
}

function verifySessionToken(token: string): AdminSession | null {
  try {
    const secret =
      process.env.ADMIN_SESSION_SECRET || "eden-admin-secret-change-me";
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const { payload, signature } = decoded;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    if (signature !== expectedSignature) return null;
    const session: AdminSession = JSON.parse(payload);
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// ── Environment-based Admin Credentials ──────────────────────
// Admin credentials can be predefined via environment variables.
// No registration is possible — only these credentials allow login.
function getEnvAdminCredentials(): { email: string; password: string; name: string } | null {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return {
    email: email.toLowerCase().trim(),
    password,
    name: process.env.ADMIN_NAME || "Administrateur",
  };
}

// ── Admin Login ──────────────────────────────────────────────
// Supports TWO modes:
// 1. Environment variables (ADMIN_EMAIL + ADMIN_PASSWORD) — simplest setup
// 2. Database (admin_users table) — for multiple admins
export async function loginAdmin(
  email: string,
  password: string
): Promise<AdminAuthResult> {
  const cleanEmail = email.toLowerCase().trim();

  // ── Mode 1: Check environment variable credentials first ──
  const envAdmin = getEnvAdminCredentials();
  if (envAdmin && cleanEmail === envAdmin.email && password === envAdmin.password) {
    const session: AdminSession = {
      adminId: "env-admin",
      email: envAdmin.email,
      role: "super_admin",
      iat: Date.now(),
      exp: Date.now() + SESSION_MAX_AGE * 1000,
    };

    const token = createSessionToken(session);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return {
      ok: true,
      admin: {
        id: "env-admin",
        email: envAdmin.email,
        name: envAdmin.name,
        role: "super_admin",
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      },
    };
  }

  // ── Mode 2: Check database admin_users table ──
  const db = getSupabaseAdmin();

  const { data: admin, error } = await db
    .from("admin_users")
    .select("*")
    .eq("email", cleanEmail)
    .eq("is_active", true)
    .single();

  if (error || !admin) {
    return { ok: false, error: "Identifiants incorrects." };
  }

  const valid = await verifyPassword(password, admin.password_hash);
  if (!valid) {
    return { ok: false, error: "Identifiants incorrects." };
  }

  // Update last_login
  await db
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", admin.id);

  // Set session cookie
  const session: AdminSession = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };

  const token = createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return {
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      is_active: admin.is_active,
      created_at: admin.created_at,
      last_login: admin.last_login,
    },
  };
}

// ── Admin Logout ─────────────────────────────────────────────
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

// ── Get Current Admin Session ────────────────────────────────
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ── Require Admin (throws if not authenticated) ──────────────
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

// ── Log Admin Action ─────────────────────────────────────────
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetType: "user" | "event" | "system",
  targetId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("admin_audit_log").insert({
    admin_id: adminId,
    admin_email: adminEmail,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || null,
    ip_address: ipAddress || null,
  });
}