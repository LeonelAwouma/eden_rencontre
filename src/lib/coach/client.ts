/**
 * Vérité serveur de l'accès Coach, côté navigateur : GET /api/coach/me
 * (getActiveCoach : coach_accounts actif + profil coach approuvé).
 *   true  → coach actif ;  false → refusé (401/403) ;  null → erreur technique (réseau, 5xx).
 * Le statut « approved » du profil, lu côté client, ne suffit JAMAIS à autoriser un coach.
 */
export async function fetchActiveCoach(): Promise<boolean | null> {
  try {
    const { authHeaders } = await import("@/lib/auth");
    const res = await fetch("/api/coach/me", { headers: await authHeaders(), cache: "no-store" });
    if (res.ok) return true;
    if (res.status === 401 || res.status === 403) return false;
    return null;
  } catch {
    return null;
  }
}

/** Identité du coach, fournie par la garde serveur du layout `/coach` (jamais déduite côté navigateur). */
export interface CoachMe { id: string; email: string; name: string }

export type CoachApiResult<T> = { ok: true; data: T } | { ok: false; status: number };

/** Appel d'une route `/api/coach/*` avec le jeton de session. `status` 0 = erreur réseau. */
export async function coachApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<CoachApiResult<T>> {
  try {
    const { authHeaders } = await import("@/lib/auth");
    const res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: { ...(await authHeaders()), ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}
