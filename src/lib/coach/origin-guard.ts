/**
 * Protection CSRF de `DELETE /api/auth/session` (module PUR).
 *
 * Les origines de confiance viennent de la CONFIGURATION serveur seule (`SITE_URL`, dérivée de NEXT_PUBLIC_SITE_URL,
 * + localhost hors production). `Host`, `X-Forwarded-Host` et `req.nextUrl.origin` ne deviennent JAMAIS une source de
 * confiance : ils servent uniquement à refuser une requête incohérente. Aucun `*.vercel.app` n'est autorisé
 * automatiquement : une préproduction doit définir NEXT_PUBLIC_SITE_URL.
 *
 * Doit s'exécuter AVANT toute lecture de cookie, tout appel Auth et toute révocation.
 */
import { SITE_URL } from "@/lib/site";

export type OriginVerdict = { ok: true } | { ok: false; reason: "origin_not_allowed" | "host_mismatch" | "origin_missing" };

const LOCAL_DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

/** Origines de confiance : configuration seule. `localhost` n'existe que hors production. */
export function trustedOrigins(env: { siteUrl?: string; nodeEnv?: string } = {}): string[] {
  const siteUrl = env.siteUrl ?? SITE_URL;
  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV;
  const list: string[] = [];
  try { list.push(new URL(siteUrl).origin); } catch { /* configuration illisible : aucune origine de production */ }
  if (nodeEnv !== "production") list.push(...LOCAL_DEV_ORIGINS);
  return list;
}

const hostOf = (value: string | null | undefined): string | null => {
  if (!value) return null;
  // `X-Forwarded-Host` peut contenir plusieurs valeurs : la première est celle vue par le premier proxy.
  const first = value.split(",")[0].trim().toLowerCase();
  return first || null;
};

export interface OriginInput {
  origin: string | null;
  secFetchSite: string | null;
  host: string | null;
  forwardedHost: string | null;
}

/**
 * - `Origin` présent : égalité STRICTE avec une origine de confiance ; puis l'hôte annoncé (X-Forwarded-Host, sinon
 *   Host) doit correspondre à celui de l'Origin (cohérence uniquement) ;
 * - `Origin` absent : refus, SAUF `Sec-Fetch-Site: same-origin` (en-tête qu'une page tierce ne peut pas forger) ET hôte
 *   d'une origine de confiance. Un `fetch` DELETE d'un navigateur moderne envoie toujours `Origin`.
 */
export function checkLogoutOrigin(input: OriginInput, trusted: string[] = trustedOrigins()): OriginVerdict {
  const announced = hostOf(input.forwardedHost) ?? hostOf(input.host);
  const trustedHosts = trusted.map((o) => new URL(o).host.toLowerCase());

  if (input.origin) {
    if (!trusted.includes(input.origin)) return { ok: false, reason: "origin_not_allowed" };
    if (announced && announced !== new URL(input.origin).host.toLowerCase()) return { ok: false, reason: "host_mismatch" };
    return { ok: true };
  }
  if (input.secFetchSite === "same-origin" && announced && trustedHosts.includes(announced)) return { ok: true };
  return { ok: false, reason: "origin_missing" };
}
