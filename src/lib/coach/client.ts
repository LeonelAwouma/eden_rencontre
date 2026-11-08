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

/** `code` / `candidates` : code d'erreur stable de l'API (jamais un message technique) ; heures proposées si l'heure locale est ambiguë. */
export type CoachApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code?: string; candidates?: [string, string] };

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
    if (!res.ok) {
      let code: string | undefined;
      let candidates: [string, string] | undefined;
      try {
        const j = (await res.json()) as { code?: unknown; candidates?: unknown };
        if (typeof j.code === "string") code = j.code;
        if (Array.isArray(j.candidates) && j.candidates.length === 2 && j.candidates.every((c) => typeof c === "string")) candidates = [j.candidates[0], j.candidates[1]] as [string, string];
      } catch { /* corps absent ou illisible */ }
      return { ok: false, status: res.status, code, candidates };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}
