import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_RESET_TOKEN_PREFIX,
  consumeAdminResetToken,
  createResetRequestForPhone,
  effectiveStatus,
  generateAdminResetToken,
  hashResetToken,
  isAdminResetToken,
} from "./password-reset-requests";

/** Faux client Supabase : enregistre les filtres d'une requête et renvoie un résultat fixé. */
function fakeDb(handlers: Record<string, (op: { filters: Record<string, unknown>; payload?: unknown; kind: string }) => { data?: unknown; error?: { code?: string; message: string } | null }>) {
  const calls: { table: string; kind: string; filters: Record<string, unknown>; payload?: unknown }[] = [];
  const from = (table: string) => {
    const op = { kind: "select", filters: {} as Record<string, unknown>, payload: undefined as unknown };
    const run = () => {
      calls.push({ table, ...op });
      const r = handlers[table]?.(op) ?? { data: null, error: null };
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
    };
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (p: unknown) => { op.kind = "insert"; op.payload = p; return run(); },
      update: (p: unknown) => { op.kind = "update"; op.payload = p; return chain; },
      eq: (k: string, v: unknown) => { op.filters[k] = v; return chain; },
      gt: (k: string, v: unknown) => { op.filters[`${k}>`] = v; return chain; },
      maybeSingle: () => run(),
    };
    return chain;
  };
  return { db: { from } as unknown as SupabaseClient, calls };
}

describe("jeton de réinitialisation émis par l'admin", () => {
  test("aléatoire, préfixé, et seul le haché est stockable", () => {
    const a = generateAdminResetToken();
    const b = generateAdminResetToken();
    expect(a.token.startsWith(ADMIN_RESET_TOKEN_PREFIX)).toBe(true);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashResetToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(isAdminResetToken(a.token)).toBe(true);
    expect(isAdminResetToken("eyJhbGciOi.hmac")).toBe(false);
  });

  test("une approbation dont le lien a expiré compte comme expirée", () => {
    const now = Date.now();
    expect(effectiveStatus({ status: "approved", expires_at: new Date(now - 1000).toISOString() }, now)).toBe("expired");
    expect(effectiveStatus({ status: "approved", expires_at: new Date(now + 60000).toISOString() }, now)).toBe("approved");
    expect(effectiveStatus({ status: "pending", expires_at: null }, now)).toBe("pending");
  });
});

describe("consumeAdminResetToken", () => {
  test("ne consomme que par haché, statut approuvé et non expiré", async () => {
    const { token, hash } = generateAdminResetToken();
    const { db, calls } = fakeDb({
      password_reset_requests: () => ({ data: { id: "r1", user_id: "u1" } }),
    });
    const now = new Date("2026-11-10T10:00:00Z");
    const res = await consumeAdminResetToken(db, token, now);
    expect(res).toEqual({ requestId: "r1", userId: "u1" });
    expect(calls[0].kind).toBe("update");
    expect(calls[0].payload).toMatchObject({ status: "used" });
    expect(calls[0].filters).toMatchObject({ token_hash: hash, status: "approved", "expires_at>": now.toISOString() });
  });

  test("lien déjà utilisé, expiré ou inconnu : refusé (aucune ligne mise à jour)", async () => {
    const { token } = generateAdminResetToken();
    const { db } = fakeDb({ password_reset_requests: () => ({ data: null }) });
    expect(await consumeAdminResetToken(db, token)).toBeNull();
  });

  test("un jeton qui n'est pas un jeton admin n'interroge jamais la base", async () => {
    const { db, calls } = fakeDb({});
    expect(await consumeAdminResetToken(db, "jeton-hmac-otp")).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe("createResetRequestForPhone", () => {
  test("crée une demande en attente et prévient l'admin pour un compte sans e-mail", async () => {
    const { db, calls } = fakeDb({
      profiles: () => ({ data: { id: "u1", email: null, name: "Awa", phone: "+237690123456" } }),
      password_reset_requests: () => ({ error: null }),
      admin_notifications: () => ({ error: null }),
    });
    expect(await createResetRequestForPhone(db, "+237690123456")).toBe(true);
    const insert = calls.find((c) => c.table === "password_reset_requests");
    expect(insert?.payload).toMatchObject({ user_id: "u1", phone: "+237690123456", status: "pending" });
    expect(calls.some((c) => c.table === "admin_notifications")).toBe(true);
  });

  test("numéro inconnu ou compte avec e-mail : aucune demande", async () => {
    const unknown = fakeDb({ profiles: () => ({ data: null }) });
    expect(await createResetRequestForPhone(unknown.db, "+237690123456")).toBe(false);
    const withEmail = fakeDb({ profiles: () => ({ data: { id: "u2", email: "a@b.com", name: "B", phone: "+237690123456" } }) });
    expect(await createResetRequestForPhone(withEmail.db, "+237690123456")).toBe(false);
    expect(withEmail.calls.some((c) => c.table === "password_reset_requests")).toBe(false);
  });

  test("demande déjà en attente (index unique) : pas de doublon ni de notification", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, calls } = fakeDb({
      profiles: () => ({ data: { id: "u1", email: null, name: "Awa", phone: "+237690123456" } }),
      password_reset_requests: () => ({ error: { code: "23505", message: "duplicate" } }),
    });
    expect(await createResetRequestForPhone(db, "+237690123456")).toBe(false);
    expect(calls.some((c) => c.table === "admin_notifications")).toBe(false);
  });
});
