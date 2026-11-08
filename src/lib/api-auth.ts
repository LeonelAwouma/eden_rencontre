/**
 * Server-side authentication helper for API routes.
 *
 * Extracts the current Supabase user from the request.
 * Compatible with the existing project architecture where
 * the frontend sends the Supabase access token.
 *
 * IMPORTANT: This module should ONLY be used server-side (API routes).
 */

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Extract the authenticated user from a Next.js API request.
 *
 * Strategy 1: Authorization: Bearer <supabase_access_token>
 *   → Used by the GoogleMeetConnect component which sends the token explicitly.
 *
 * Strategy 2: Supabase cookies (split or simple)
 *   → Fallback for any direct browser requests with Supabase cookies.
 *
 * @returns The authenticated user or null if not found/invalid.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const db = getSupabaseAdmin();

  // ── Strategy 1: Authorization header ──────────────────────
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const {
          data: { user },
        } = await db.auth.getUser(token);
        if (user?.id && user?.email) {
          return { id: user.id, email: user.email };
        }
      } catch {
        // Invalid token — continue to next strategy
      }
    }
  }

  // ── Strategy 2: Supabase split cookies ────────────────────
  // Supabase stores auth in cookies named like: sb-<project-ref>-auth-token
  // The value may be split across multiple cookies (.0, .1) or stored as JSON.
  const allCookies = request.cookies.getAll();
  const authTokenCookies = allCookies.filter(
    (c) =>
      c.name.includes("-auth-token") &&
      !c.name.includes("-auth-token-code-verifier")
  );

  for (const cookie of authTokenCookies) {
    try {
      // Try to get the full value from split cookies
      const baseName = cookie.name.replace(/\.\d+$/, "");
      const part0 = request.cookies.get(`${baseName}.0`)?.value;
      const part1 = request.cookies.get(`${baseName}.1`)?.value;
      const fullValue = [part0, part1].filter(Boolean).join("") || cookie.value;

      if (!fullValue) continue;

      // Try parsing as JSON (Supabase v2 format)
      let accessToken: string | null = null;
      try {
        const parsed = JSON.parse(decodeURIComponent(fullValue));
        accessToken = parsed.access_token || null;
      } catch {
        // Not JSON — try as raw JWT token
        if (fullValue.startsWith("eyJ")) {
          accessToken = fullValue;
        }
      }

      if (accessToken) {
        const {
          data: { user },
        } = await db.auth.getUser(accessToken);
        if (user?.id && user?.email) {
          return { id: user.id, email: user.email };
        }
      }
    } catch {
      // Continue to next cookie
    }
  }

  // ── Strategy 3: Simple named cookies ─────────────────────
  const simpleToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("supabase-auth-token")?.value;

  if (simpleToken) {
    try {
      const {
        data: { user },
      } = await db.auth.getUser(simpleToken);
      if (user?.id && user?.email) {
        return { id: user.id, email: user.email };
      }
    } catch {
      // Invalid token
    }
  }

  return null;
}
/**
 * Rôles de l'espace connecté.
 *
 * Les routes API utilisent la clé de service, qui contourne la RLS : la règle
 * « qui peut faire quoi » doit donc y être revérifiée, à partir des données
 * serveur (jamais d'un rôle envoyé par le navigateur).
 *
 *  - member : profil approuvé, account_type = 'member'  → fonctions matrimoniales
 *  - coach  : profil approuvé, account_type = 'coach' ET ligne coach_accounts active
 *             → espace professionnel et fonctions explicitement partagées
 *
 * Un statut « approved » ne suffit donc JAMAIS à prouver qu'on est un membre.
 */
export type AccountKind = "member" | "coach";

export interface ProfileRoleRow {
  status: string | null;
  account_type: string | null;
}

/** Fonction pure (testée) : déduit le rôle à partir des lignes lues en base. Toute incohérence = null. */
export function classifyAccount(
  profile: ProfileRoleRow | null | undefined,
  coach: { active: boolean | null } | null | undefined
): AccountKind | null {
  if (!profile || profile.status !== "approved") return null;
  if (profile.account_type === "coach") return coach?.active === true ? "coach" : null;
  if (profile.account_type === "member") return "member";
  return null;
}

/** Lit le rôle d'un compte. Aucune exception : en cas d'erreur de lecture, on refuse. */
export async function getAccountKind(userId: string): Promise<AccountKind | null> {
  const db = getSupabaseAdmin();
  let { data, error } = await db.from("profiles").select("status, account_type").eq("id", userId).maybeSingle();
  if (error && (error as { code?: string }).code === "42703") {
    // Colonne account_type absente (migration coachs non exécutée) : seuls des membres peuvent exister.
    // Garde-fou : si une ligne coach_accounts existe malgré tout, le type est INCONNU → refus
    // (jamais de repli « membre » pour un compte qui pourrait être un coach).
    const [legacy, coachRow] = await Promise.all([
      db.from("profiles").select("status").eq("id", userId).maybeSingle(),
      db.from("coach_accounts").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);
    const coachTableMissing = (coachRow.error as { code?: string } | null)?.code === "42P01"; // table absente : aucun coach possible
    if (coachRow.data || (coachRow.error && !coachTableMissing)) return null;
    data = legacy.data ? { ...legacy.data, account_type: "member" } : null;
    error = legacy.error;
  }
  if (error || !data) return null;
  if (data.account_type !== "coach") return classifyAccount(data as ProfileRoleRow, null);
  const { data: coach } = await db.from("coach_accounts").select("active").eq("user_id", userId).maybeSingle();
  return classifyAccount(data as ProfileRoleRow, coach);
}

/**
 * Membre connecté ET approuvé par l'admin, sinon null. Les coachs sont REFUSÉS :
 * c'est la garde de toutes les fonctions matrimoniales (alliances, messages privés,
 * parrainage, activité, etc.). Depuis que la page d'attente garde la session des
 * comptes en attente, un jeton valide ne suffit pas non plus à prouver l'accès.
 */
export async function getApprovedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;
  return (await getAccountKind(user.id)) === "member" ? user : null;
}

/** Alias explicite de getApprovedUser. */
export const getApprovedMember = getApprovedUser;

/**
 * Garde des routes réservées aux membres : fine enveloppe de getApprovedUser (mêmes règles,
 * aucune duplication) — profil approuvé ET account_type = 'member'. Type inconnu, coach,
 * erreur de lecture : refus (null).
 */
export async function requireApprovedMember(request: NextRequest): Promise<AuthenticatedUser | null> {
  return getApprovedUser(request);
}

/**
 * Membre approuvé OU coach actif. À réserver aux fonctions EXPLICITEMENT partagées
 * (formation, annonces) — jamais aux opérations matrimoniales.
 */
export async function getMemberOrCoach(
  request: NextRequest
): Promise<(AuthenticatedUser & { kind: AccountKind }) | null> {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;
  const kind = await getAccountKind(user.id);
  return kind ? { ...user, kind } : null;
}

/** Adresse IP du client (Vercel renseigne x-forwarded-for), pour les limites de tentatives. */
export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}
