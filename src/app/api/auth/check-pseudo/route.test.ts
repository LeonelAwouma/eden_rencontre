import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let mockUser: { id: string; email: string } | null = null;
let mockExisting: { id: string } | null = null;
const neqSpy = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: async () => mockUser,
  clientIp: () => "test-ip",
}));

vi.mock("@/lib/otp", () => ({
  checkRateLimit: async () => true,
  recordRateLimit: async () => {},
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const builder: any = {
        select: () => builder,
        ilike: () => builder,
        neq: (...args: unknown[]) => { neqSpy(...args); return builder; },
        limit: () => builder,
        maybeSingle: async () => ({ data: mockExisting, error: null }),
      };
      return builder;
    },
  }),
}));

const req = (pseudo: unknown, authHeader?: string) =>
  new NextRequest("http://x/api/auth/check-pseudo", {
    method: "POST",
    body: JSON.stringify({ pseudo }),
    headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
  });

beforeEach(() => {
  mockUser = null;
  mockExisting = null;
  neqSpy.mockReset();
});

describe("POST /api/auth/check-pseudo", () => {
  test("rejects a malformed pseudo", async () => {
    const { POST } = await import("./route");
    const res = await POST(req("a"));
    expect(res.status).toBe(400);
  });

  test("reports available when no profile matches", async () => {
    mockExisting = null;
    const { POST } = await import("./route");
    const res = await POST(req("GraceLumiere"));
    const body = await res.json();
    expect(body.available).toBe(true);
  });

  test("reports unavailable when a profile already has it", async () => {
    mockExisting = { id: "someone-else" };
    const { POST } = await import("./route");
    const res = await POST(req("GraceLumiere"));
    const body = await res.json();
    expect(body.available).toBe(false);
  });

  test("never trusts a client-supplied excludeUserId — only an authenticated session excludes its own pseudo", async () => {
    // Pas de session authentifiée : même avec une tentative de forger l'exclusion dans le corps, aucune exclusion n'est appliquée.
    mockUser = null;
    mockExisting = { id: "someone-else" };
    const { POST } = await import("./route");
    const res = await POST(
      new NextRequest("http://x/api/auth/check-pseudo", {
        method: "POST",
        body: JSON.stringify({ pseudo: "GraceLumiere", excludeUserId: "someone-else" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await res.json();
    expect(body.available).toBe(false); // le champ du corps est ignoré, le conflit est bien signalé
    expect(neqSpy).not.toHaveBeenCalled();
  });

  test("excludes the caller's own id only when derived from a verified session", async () => {
    mockUser = { id: "session-user", email: "a@b.com" };
    mockExisting = null;
    const { POST } = await import("./route");
    await POST(req("GraceLumiere", "Bearer faketoken"));
    expect(neqSpy).toHaveBeenCalledWith("id", "session-user");
  });
});
