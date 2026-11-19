// Authentification serveur-à-serveur de /api/push/dispatch.
// Les triggers de la base envoient l'en-tête « x-push-secret » (push_settings.dispatch_secret,
// voir supabase/migrations/20261119_push_hardening.sql) ; le site le compare à PUSH_DISPATCH_SECRET.

import { createHash, timingSafeEqual } from "node:crypto";

export const DISPATCH_SECRET_HEADER = "x-push-secret";

export type DispatchAuth = "ok" | "unconfigured" | "denied";

let warned = false;

/**
 * - « ok » : secret configuré et identique.
 * - « unconfigured » : PUSH_DISPATCH_SECRET absent (transition : la migration a pu être exécutée avant la
 *   variable Vercel). L'appel est accepté — l'événement est de toute façon relu en base et dédoublonné.
 * - « denied » : secret configuré mais en-tête absent ou différent → 401.
 */
export function checkDispatchSecret(received: string | null, expected: string | undefined = process.env.PUSH_DISPATCH_SECRET): DispatchAuth {
  if (!expected) {
    if (!warned) {
      warned = true;
      console.warn("[push/dispatch] PUSH_DISPATCH_SECRET non défini : appels acceptés sans authentification (voir docs/push-notifications.md).");
    }
    return "unconfigured";
  }
  if (!received) return "denied";
  // Empreintes de longueur fixe : timingSafeEqual exige deux tampons de même taille.
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) ? "ok" : "denied";
}
