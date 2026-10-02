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
 * Membre connecté ET approuvé par l'admin, sinon null.
 *
 * Les routes API utilisent la clé de service, qui contourne la RLS : la règle
 * « espace réservé aux comptes approuvés » doit donc y être revérifiée. Depuis
 * que la page d'attente garde la session des comptes en attente, un jeton
 * valide ne suffit plus à prouver l'accès à l'espace membre.
 */
export async function getApprovedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;
  const { data } = await getSupabaseAdmin().from("profiles").select("status").eq("id", user.id).maybeSingle();
  return data?.status === "approved" ? user : null;
}

/** Adresse IP du client (Vercel renseigne x-forwarded-for), pour les limites de tentatives. */
export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}
