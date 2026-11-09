import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const ID = "11111111-1111-4111-8111-111111111111";
const OLD = `avatars/coach-${ID}-1.png`;
const w = vi.hoisted(() => ({
  admin: true,
  account: true,
  profile: null as Row | null,
  updateFails: false,
  uploadFails: false,
  files: new Set<string>(),
  removed: [] as string[],
  order: [] as string[],
  audit: [] as unknown[][],
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => { if (!w.admin) throw new Error("UNAUTHORIZED"); return { adminId: "a1", email: "admin@x.fr", role: "admin" }; },
  logAdminAction: async (...a: unknown[]) => { w.audit.push(a); },
}));
vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      let op = "select";
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        update: (p: Row) => { op = "update"; if (!w.updateFails) w.profile = { ...w.profile, ...p }; w.order.push("update"); return q; },
        maybeSingle: () => q,
        then: (res: (v: unknown) => unknown) => {
          if (op === "update") return Promise.resolve({ error: w.updateFails ? { message: "x" } : null }).then(res);
          const data = table === "coach_accounts" ? (w.account ? { user_id: ID } : null) : w.profile;
          return Promise.resolve({ data, error: null }).then(res);
        },
      };
      return q;
    },
    storage: {
      from: () => ({
        upload: async (path: string) => { if (w.uploadFails) return { error: { message: "x" } }; w.files.add(path); w.order.push("upload"); return { error: null }; },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://p.supabase.co/storage/v1/object/public/chat-images/${path}` } }),
        remove: async (paths: string[]) => { for (const p of paths) { w.files.delete(p); w.removed.push(p); w.order.push("remove"); } return { error: null }; },
      }),
    },
  }),
}));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const put = (blob?: Blob, id = ID) => {
  const f = new FormData();
  if (blob) f.append("photo", blob, "p.png");
  return import("./route").then((m) => m.PUT(new NextRequest(`http://x/api/admin/coaches/${id}/avatar`, { method: "PUT", body: f }), { params: Promise.resolve({ id }) }));
};

beforeEach(() => {
  w.admin = true; w.account = true; w.updateFails = false; w.uploadFails = false;
  w.profile = { account_type: "coach", avatar_url: `https://p.supabase.co/storage/v1/object/public/chat-images/${OLD}` };
  w.files = new Set([OLD]); w.removed.length = 0; w.order.length = 0; w.audit.length = 0;
});

describe("remplacement de la photo d'un coach (administrateur uniquement)", () => {
  test("non-administrateur (coach, membre, anonyme) : 401 et rien n'est écrit", async () => {
    w.admin = false;
    expect((await put(new Blob([PNG]))).status).toBe(401);
    expect(w.files.has(OLD)).toBe(true);
    expect(w.order).toEqual([]);
  });
  test("remplace : le nouveau fichier est enregistré AVANT la suppression de l'ancien", async () => {
    const res = await put(new Blob([PNG]));
    expect(res.status).toBe(200);
    expect(w.order).toEqual(["upload", "update", "remove"]);
    expect(w.removed).toEqual([OLD]);
    expect(String(w.profile?.avatar_url)).toMatch(/coach-1111.*\.png$/);
    expect(w.audit[0][2]).toBe("coach_avatar_updated");
  });
  test("échec de l'enregistrement : l'ancien fichier est conservé, le nouveau supprimé", async () => {
    w.updateFails = true;
    expect((await put(new Blob([PNG]))).status).toBe(500);
    expect(w.files.has(OLD)).toBe(true);
    expect(w.files.size).toBe(1);
  });
  test("image invalide : 400, rien envoyé ; cible qui n'est pas un coach : 404", async () => {
    expect((await put(new Blob([new TextEncoder().encode("<html>")]))).status).toBe(400);
    expect(w.order).toEqual([]);
    w.profile = { account_type: "member", avatar_url: null };
    expect((await put(new Blob([PNG]))).status).toBe(404);
    w.profile = { account_type: "coach", avatar_url: null };
    w.account = false;
    expect((await put(new Blob([PNG]))).status).toBe(404);
    expect((await put(new Blob([PNG]), "pas-un-uuid")).status).toBe(400);
  });
});
