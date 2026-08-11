/**
 * Server-side authentication helper for API routes.
 *
 * Extracts the current Supabase user from the request's cookies
 * or Authorization header. Used to protect API endpoints.
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
 * Checks (in order):
 *  1. Authorization: Bearer <token> header
 *  2. Supabase split cookies (sb-<ref>-auth-token.0 / .1)
 *  3. Simple cookies (sb-access-token / supabase-auth-token)
 *
 * @returns The authenticated user or null if not found/invalid.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const db = getSupabaseAdmin();

  // Strategy 1: Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const {
        data: { user },
      } = await db.auth.getUser(token);
      if (user?.id && user?.email) {
        return { id: user.id, email: user.email };
      }
    } catch {
      // Invalid token
    }
  }

  // Strategy 2: Supabase split cookies
  const allCookies = request.cookies.getAll();
  const authCookiePrefix = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );

  if (authCookiePrefix) {
    const baseName = authCookiePrefix.name.replace(/\.\d+$/, "");
    const part0 = request.cookies.get(`${baseName}.0`)?.value;
    const part1 = request.cookies.get(`${baseName}.1`)?.value;
    const baseValue = request.cookies.get(baseName)?.value;
    const fullValue = [part0, part1].filter(Boolean).join("") || baseValue || "";

    if (fullValue) {
      try {
        const parsed = JSON.parse(fullValue);
        if (parsed.access_token) {
          const {
            data: { user },
          } = await db.auth.getUser(parsed.access_token);
          if (user?.id && user?.email) {
            return { id: user.id, email: user.email };
          }
        }
      } catch {
        // Not JSON — try as raw token
        try {
          const {
            data: { user },
          } = await db.auth.getUser(fullValue);
          if (user?.id && user?.email) {
            return { id: user.id, email: user.email };
          }
        } catch {
          // Not a valid token
        }
      }
    }
  }

  // Strategy 3: Simple cookies
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