import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { COACH_AVATAR_MAX_BYTES } from "@/lib/coach/avatar";
import { AVATAR_ERROR_KEYS, AVATAR_MAX_BYTES_CLIENT, avatarErrorKey, precheckAvatarFile } from "@/lib/coach/avatar-client";
import { applyAvatar, syncCoachFromServer } from "@/lib/coach/chrome-state";

/**
 * PUT /api/coach/profile/avatar — vraie pile d'authentification Coach (api-auth, coach-auth) contre un faux client
 * Supabase étendu d'un faux stockage. Vérifie que la cible est TOUJOURS le coach de la session, que le fichier est
 * validé côté serveur, et que ni la base ni le stockage ne perdent l'ancienne photo en cas d'échec.
 */
const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  failWhen: undefined as undefined | ((q: { table: string; op: string; columns: string; filters: [string, string, unknown][] }) => { code?: string; message: string } | null),
  log: [] as { table: string; op: string; columns: string; filters: [string, string, unknown][] }[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  files: new Map<string, { bytes: number; contentType: string }>(),
  storageOps: [] as string[],
  uploadFails: false,
}));
const limiter = vi.hoisted(() => ({ allow: true }));

vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return {
    getSupabaseAdmin: () => {
      const db = createFakeDb(world as never) as unknown as Record<string, unknown>;
      const from = db.from as (table: string) => Record<string, unknown>;
      // Les écritures de la base sont tracées dans le même fil que le stockage, pour vérifier l'ORDRE des opérations.
      db.from = (table: string) => {
        const q = from(table);
        const update = q.update as (p: Row) => unknown;
        q.update = (p: Row) => { if (table === "profiles") world.storageOps.push("db:update"); return update(p); };
        return q;
      };
      db.storage = {
        from: (bucket: string) => ({
          upload: async (path: string, bytes: Buffer, opts: { contentType: string }) => {
            if (world.uploadFails) return { error: { message: "stockage indisponible" } };
            world.files.set(`${bucket}/${path}`, { bytes: bytes.length, contentType: opts.contentType });
            world.storageOps.push("storage:upload");
            return { error: null };
          },
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://p.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
          remove: async (paths: string[]) => {
            for (const p of paths) { world.files.delete(`${bucket}/${p}`); world.storageOps.push(`storage:remove:${p}`); }
            return { error: null };
          },
        }),
      };
      return db;
    },
  };
});
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => limiter.allow, recordRateLimit: async () => {} }));

import { PUT } from "./route";
import * as routeModule from "./route";

const COACH = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH = "c0000000-0000-4000-8000-000000000002";
const MEMBER = "a0000001-0000-4000-8000-000000000000";
const OLD_PATH = `avatars/coach-${COACH}-1.png`;
const OTHER_PATH = `avatars/coach-${OTHER_COACH}-1.png`;
const publicUrl = (path: string) => `https://p.supabase.co/storage/v1/object/public/chat-images/${path}`;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

type Caller = "coach" | "coach_suspended" | "member" | "anonymous";
function seed(caller: Caller = "coach", avatar: string | null = publicUrl(OLD_PATH)) {
  world.log.length = 0; world.storageOps.length = 0; world.failWhen = undefined; world.uploadFails = false; limiter.allow = true;
  world.files = new Map([[`chat-images/${OLD_PATH}`, { bytes: 10, contentType: "image/png" }], [`chat-images/${OTHER_PATH}`, { bytes: 10, contentType: "image/png" }]]);
  world.tables = {
    coach_accounts: [
      { user_id: COACH, email: "coach@x.fr", display_name: "Coach Awa", active: caller !== "coach_suspended" },
      { user_id: OTHER_COACH, email: "autre@x.fr", display_name: "Autre Coach", active: true },
    ],
    profiles: [
      { id: COACH, status: caller === "coach_suspended" ? "suspended" : "approved", account_type: "coach", email: "coach@x.fr", avatar_url: avatar },
      { id: OTHER_COACH, status: "approved", account_type: "coach", email: "autre@x.fr", avatar_url: publicUrl(OTHER_PATH) },
      { id: MEMBER, status: "approved", account_type: "member", email: "membre@x.fr", avatar_url: "/avatars/femme-1.webp" },
    ],
    coach_audit_logs: [],
  };
  world.user = caller === "anonymous" ? null : caller === "member" ? { id: MEMBER, email: "membre@x.fr" } : { id: COACH, email: "coach@x.fr" };
}
const row = (id: string) => world.tables.profiles.find((p) => p.id === id)!;

function put(blob: Blob | null, extra: Record<string, string> = {}, url = "/api/coach/profile/avatar") {
  const form = new FormData();
  if (blob) form.append("photo", blob, "photo.png");
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return PUT(new NextRequest(`http://localhost${url}`, { method: "PUT", headers: { authorization: "Bearer t" }, body: form }));
}

beforeEach(() => seed());

describe("PUT /api/coach/profile/avatar", () => {
  it("le coach connecté remplace sa photo : nouvelle URL sur SON profil, réponse non mise en cache", async () => {
    const res = await put(new Blob([PNG]));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const { avatarUrl } = await res.json();
    expect(avatarUrl).toMatch(new RegExp(`/chat-images/avatars/coach-${COACH}-\\d+\\.png$`));
    expect(row(COACH).avatar_url).toBe(avatarUrl);
    // Nouvelle adresse à chaque envoi : aucune ancienne image en cache ne peut masquer la nouvelle.
    expect(avatarUrl).not.toBe(publicUrl(OLD_PATH));
  });

  it("ordre des opérations : dépôt, enregistrement en base, PUIS suppression de l'ancien fichier", async () => {
    await put(new Blob([PNG]));
    expect(world.storageOps).toEqual(["storage:upload", "db:update", `storage:remove:${OLD_PATH}`]);
    expect(world.files.has(`chat-images/${OLD_PATH}`)).toBe(false);
    expect([...world.files.keys()].filter((k) => k.includes(COACH))).toHaveLength(1);
  });

  it("type réel détecté par signature : JPEG et WebP acceptés, extension et type MIME fixés par le serveur", async () => {
    expect((await put(new Blob([JPEG], { type: "image/png" }))).status).toBe(200);
    expect(String(row(COACH).avatar_url)).toMatch(/\.jpg$/);
    seed();
    expect((await put(new Blob([WEBP], { type: "text/plain" }))).status).toBe(200);
    expect(String(row(COACH).avatar_url)).toMatch(/\.webp$/);
    expect([...world.files.values()].some((f) => f.contentType === "image/webp")).toBe(true);
  });

  it("IMPOSSIBLE de viser un autre coach : coach_id / id / user_id envoyés par le navigateur sont ignorés", async () => {
    const res = await put(new Blob([PNG]), { coach_id: OTHER_COACH, id: OTHER_COACH, user_id: OTHER_COACH, target: OTHER_COACH }, `/api/coach/profile/avatar?coach_id=${OTHER_COACH}&id=${OTHER_COACH}`);
    expect(res.status).toBe(200);
    expect(row(OTHER_COACH).avatar_url).toBe(publicUrl(OTHER_PATH));
    expect(world.files.has(`chat-images/${OTHER_PATH}`)).toBe(true);
    expect(String(row(COACH).avatar_url)).toContain(`coach-${COACH}-`);
    // Toutes les écritures de profil portent sur l'identité de la session, et le fichier est rangé sous son identifiant.
    for (const q of world.log.filter((l) => l.table === "profiles" && l.op === "update")) expect(q.filters).toEqual([["eq", "id", COACH]]);
    expect([...world.files.keys()].some((k) => k.includes(`coach-${OTHER_COACH}-`) && k !== `chat-images/${OTHER_PATH}`)).toBe(false);
  });

  it.each(["coach_suspended", "member", "anonymous"] as const)("%s : 403, rien n'est lu du fichier ni écrit", async (caller) => {
    seed(caller);
    const res = await put(new Blob([PNG]));
    expect(res.status).toBe(403);
    expect(world.storageOps).toEqual([]);
    expect(row(COACH).avatar_url).toBe(publicUrl(OLD_PATH));
    expect(row(MEMBER).avatar_url).toBe("/avatars/femme-1.webp");
  });

  it("fichier invalide : faux PNG, HTML, SVG, fichier vide, champ absent → 400 avec code, rien envoyé", async () => {
    const cases: [Blob | null, string][] = [
      [new Blob([new TextEncoder().encode("<html><script>alert(1)</script>")], { type: "image/png" }), "avatar_invalid_type"],
      [new Blob([new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")], { type: "image/svg+xml" }), "avatar_invalid_type"],
      [new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])], { type: "image/gif" }), "avatar_invalid_type"],
      [new Blob([]), "avatar_missing"],
      [null, "avatar_missing"],
    ];
    for (const [blob, code] of cases) {
      const res = await put(blob);
      expect(res.status, code).toBe(400);
      expect((await res.json()).code).toBe(code);
    }
    expect(world.storageOps).toEqual([]);
    expect(row(COACH).avatar_url).toBe(publicUrl(OLD_PATH));
  });

  it("fichier supérieur à 3 Mo : 413, rien envoyé ; exactement 3 Mo : accepté", async () => {
    const big = new Uint8Array(COACH_AVATAR_MAX_BYTES + 1); big.set(PNG);
    const res = await put(new Blob([big]));
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe("avatar_too_large");
    expect(world.storageOps).toEqual([]);

    const limit = new Uint8Array(COACH_AVATAR_MAX_BYTES); limit.set(PNG);
    expect((await put(new Blob([limit]))).status).toBe(200);
  });

  it("taille annoncée démesurée : refus avant même de lire le corps", async () => {
    const res = await PUT(new NextRequest("http://localhost/api/coach/profile/avatar", {
      method: "PUT", headers: { authorization: "Bearer t", "content-length": String(50 * 1024 * 1024), "content-type": "multipart/form-data; boundary=x" }, body: "--x--",
    }));
    expect(res.status).toBe(413);
    expect(world.storageOps).toEqual([]);
  });

  it("échec du STOCKAGE : 500 avec code, ancienne photo intacte en base et dans le bucket", async () => {
    world.uploadFails = true;
    const res = await put(new Blob([PNG]));
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe("avatar_upload_failed");
    expect(row(COACH).avatar_url).toBe(publicUrl(OLD_PATH));
    expect(world.files.has(`chat-images/${OLD_PATH}`)).toBe(true);
    expect(world.storageOps).toEqual([]);
  });

  it("échec de la BASE : 500, ancienne photo conservée, nouveau fichier nettoyé (aucun orphelin)", async () => {
    world.failWhen = (q) => (q.table === "profiles" && q.op === "update" ? { message: "détail interne secret" } : null);
    const res = await put(new Blob([PNG]));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.code).toBe("avatar_save_failed");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(row(COACH).avatar_url).toBe(publicUrl(OLD_PATH));
    expect(world.files.has(`chat-images/${OLD_PATH}`)).toBe(true);
    expect([...world.files.keys()].filter((k) => k.includes(`coach-${COACH}-`))).toEqual([`chat-images/${OLD_PATH}`]);
    expect(world.storageOps.at(-1)).toMatch(/^storage:remove:avatars\/coach-c0000000.*-\d+\.png$/);
    expect(world.storageOps.at(-1)).not.toBe(`storage:remove:${OLD_PATH}`);
  });

  it("panne de lecture du profil : 500 générique, rien envoyé", async () => {
    world.failWhen = (q) => (q.table === "profiles" && q.op === "select" && q.columns === "avatar_url" ? { message: "x" } : null);
    expect((await put(new Blob([PNG]))).status).toBe(500);
    expect(world.storageOps).toEqual([]);
  });

  it("ancienne photo hors du dossier des photos de coach (avatar du catalogue, lien externe) : jamais supprimée", async () => {
    seed("coach", "/avatars/homme-2.webp");
    expect((await put(new Blob([PNG]))).status).toBe(200);
    expect(world.storageOps.filter((o) => o.startsWith("storage:remove"))).toEqual([]);
    seed("coach", null);
    expect((await put(new Blob([PNG]))).status).toBe(200);
    expect(world.storageOps).toEqual(["storage:upload", "db:update"]);
  });

  it("limiteur d'écriture dépassé : 429, rien envoyé", async () => {
    limiter.allow = false;
    const res = await put(new Blob([PNG]));
    expect(res.status).toBe(429);
    expect(world.storageOps).toEqual([]);
  });

  it("journal : une entrée sans URL, nom de fichier ni contenu ; aucune entrée sur un refus", async () => {
    await put(new Blob([PNG]));
    const logs = world.tables.coach_audit_logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ actor_id: COACH, actor_kind: "coach", action: "coach_avatar_updated", target_type: "coach", target_id: COACH });
    expect(logs[0].metadata).toEqual({ format: "png", bytes: PNG.length });
    expect(JSON.stringify(logs[0])).not.toMatch(/https?:|supabase|photo\.png|avatars\//);
    seed();
    await put(new Blob([new TextEncoder().encode("pas une image")]));
    expect(world.tables.coach_audit_logs).toHaveLength(0);
  });

  it("la route n'expose que PUT : aucun moyen de retirer ou de lire la photo d'un tiers par cette adresse", () => {
    expect(Object.keys(routeModule).filter((k) => /^(GET|POST|PATCH|DELETE|PUT)$/.test(k))).toEqual(["PUT"]);
  });
});

describe("synchronisation avec l'administration", () => {
  it("après le remplacement par le coach, la lecture utilisée par l'administration voit la nouvelle valeur (une seule colonne)", async () => {
    const { avatarUrl } = await (await put(new Blob([PNG]))).json();
    // L'administration lit `profiles.avatar_url` : même colonne, aucune seconde colonne de photo.
    expect(world.tables.profiles.find((p) => p.id === COACH)!.avatar_url).toBe(avatarUrl);
    expect(Object.keys(row(COACH)).filter((k) => /avatar|photo/i.test(k))).toEqual(["avatar_url"]);
  });
});

describe("contexte de l'espace Coach : source unique de la photo", () => {
  const coach = { id: COACH, email: "coach@x.fr", name: "Coach Awa", avatarUrl: "https://x/old.png" };

  it("mise à jour immédiate après un envoi réussi", () => {
    const next = applyAvatar(coach, "https://x/new.png");
    expect(next).toEqual({ ...coach, avatarUrl: "https://x/new.png" });
    expect(next).not.toBe(coach);
    expect(applyAvatar(coach, "https://x/old.png")).toBe(coach);
  });

  it("les nouvelles propriétés du layout serveur font foi (après router.refresh) et réalignent l'état", () => {
    const local = applyAvatar(coach, "https://x/new.png");
    // Le serveur confirme la nouvelle photo : rien ne change, aucun rendu inutile.
    expect(syncCoachFromServer(local, { ...coach, avatarUrl: "https://x/new.png" })).toBe(local);
    // Le serveur renvoie autre chose (photo retirée ou remplacée par l'administration) : il a raison.
    expect(syncCoachFromServer(local, { ...coach, avatarUrl: null }).avatarUrl).toBeNull();
    expect(syncCoachFromServer(local, { ...coach, avatarUrl: "https://x/admin.png" }).avatarUrl).toBe("https://x/admin.png");
    expect(syncCoachFromServer(local, { ...coach, name: "Nouveau nom", avatarUrl: "https://x/new.png" }).name).toBe("Nouveau nom");
    // `undefined` et `null` désignent la même absence de photo.
    const none = { id: COACH, email: "coach@x.fr", name: "Coach Awa", avatarUrl: null };
    expect(syncCoachFromServer(none, { id: COACH, email: "coach@x.fr", name: "Coach Awa" })).toBe(none);
  });
});

describe("contrôle côté navigateur et messages", () => {
  const resolve = (dict: unknown, key: string): unknown =>
    key.split(".").reduce<unknown>((acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined), dict);

  it("même limite que le serveur ; refuse fichier vide, trop lourd, mauvais type", () => {
    expect(AVATAR_MAX_BYTES_CLIENT).toBe(COACH_AVATAR_MAX_BYTES);
    expect(precheckAvatarFile({ size: 1000, type: "image/png" })).toBeNull();
    expect(precheckAvatarFile({ size: 0, type: "image/png" })).toBe("avatar_missing");
    expect(precheckAvatarFile({ size: AVATAR_MAX_BYTES_CLIENT + 1, type: "image/jpeg" })).toBe("avatar_too_large");
    expect(precheckAvatarFile({ size: 1000, type: "image/gif" })).toBe("avatar_invalid_type");
    expect(precheckAvatarFile({ size: 1000, type: "application/pdf" })).toBe("avatar_invalid_type");
  });

  it("chaque code d'erreur a un message en français et en anglais", () => {
    for (const key of [...AVATAR_ERROR_KEYS, "coachProfile.photoSaved", "coachProfile.photoAdd", "coachProfile.photoChange", "coachProfile.photoConfirm", "coachProfile.photoCancel", "coachProfile.photoSaving", "coachProfile.photoHint", "coachProfile.photoPreviewHint", "coachProfile.photoPreviewAlt"]) {
      expect(resolve(fr, key), `fr.${key}`).toEqual(expect.any(String));
      expect(resolve(en, key), `en.${key}`).toEqual(expect.any(String));
    }
    expect(avatarErrorKey("avatar_save_failed")).toBe("coachProfile.photoErrors.saveFailed");
    expect(avatarErrorKey(undefined, 413)).toBe("coachProfile.photoErrors.tooLarge");
    expect(avatarErrorKey(undefined, 0)).toBe("coachProfile.photoErrors.network");
    expect(avatarErrorKey(undefined, 403)).toBe("coachProfile.photoErrors.denied");
    expect(avatarErrorKey("code_inconnu", 500)).toBe("coachProfile.photoErrors.generic");
  });
});
