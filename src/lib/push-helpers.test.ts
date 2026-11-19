import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { checkDispatchSecret } from "./push-dispatch-auth";
import { messagePreview, genericMessageNotice } from "./push-message";
import { deviceLabel, parseSubscription } from "./push-devices";
import { createFakeDb } from "@/test-utils/fake-supabase";

vi.mock("web-push", () => ({ default: { setVapidDetails: () => {}, sendNotification: async () => {} } }));

describe("checkDispatchSecret", () => {
  test("secret identique : ok ; absent ou différent : refusé", () => {
    expect(checkDispatchSecret("abc", "abc")).toBe("ok");
    expect(checkDispatchSecret(null, "abc")).toBe("denied");
    expect(checkDispatchSecret("", "abc")).toBe("denied");
    expect(checkDispatchSecret("abcd", "abc")).toBe("denied");
  });
  test("variable non définie : transition acceptée", () => {
    expect(checkDispatchSecret(null, undefined)).toBe("unconfigured");
  });
});

describe("messagePreview", () => {
  test("texte, sticker, photo", () => {
    expect(messagePreview({ content: "  Salut  " }, "fr")).toBe("Salut");
    expect(messagePreview({ content: "", sticker: "amen" }, "fr")).toMatch(/^\S+ Sticker$/);
    expect(messagePreview({ content: "", sticker: "retire-du-catalogue" }, "fr")).toBe("Sticker");
    expect(messagePreview({ content: null, image_url: "x.webp" }, "en")).toBe("📷 Photo");
    expect(messagePreview({}, "en")).toBe("New message");
  });
  test("version générique sans nom ni contenu", () => {
    expect(genericMessageNotice("fr")).toEqual({ title: "Garden of Alliance", body: "Vous avez reçu un nouveau message." });
  });
});

describe("deviceLabel / parseSubscription", () => {
  test("libellés lisibles", () => {
    expect(deviceLabel(null)).toBe("Appareil");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0")).toBe("Windows · Edge");
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15")).toBe("Mac · Safari");
  });
  test("validation de l'abonnement", () => {
    expect(parseSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" } })).toEqual({ endpoint: "https://fcm.googleapis.com/x", p256dh: "a", auth: "b" });
    expect(parseSubscription({ endpoint: "http://x", keys: { p256dh: "a", auth: "b" } })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
  });
});

describe("sendPushToUsers — migration 20261119 pas encore exécutée", () => {
  test("sans colonne show_preview : envoi normal, version complète", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    const { sendPushToUsers } = await import("./push-server");
    const db = createFakeDb({
      push_subscriptions: [{ id: "s1", user_id: "u", endpoint: "https://push.example/u", p256dh: "k", auth: "a", locale: "fr" }],
    }, { missingColumns: { push_subscriptions: ["show_preview"] } });
    const res = await sendPushToUsers(db as never, ["u"], () => ({ title: "T", body: "B", url: "/dashboard", generic: { title: "G", body: "g" } }));
    expect(res).toMatchObject({ sent: 1, failed: 0, subscriptions: 1 });
  });
});

describe("20261119_push_hardening.sql (contrôles statiques)", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261119_push_hardening.sql"), "utf8");
  const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  test("idempotente et non destructive", () => {
    expect(code).toContain("add column if not exists dispatch_secret text");
    expect(code).toContain("add column if not exists show_preview boolean not null default true");
    expect(code).toContain("create or replace function public.push_dispatch(p_source text, p_ref text)");
    expect(code).not.toMatch(/\bdrop\s+(table|column)\b/i);
    expect(code).not.toMatch(/\btruncate\b/i);
    expect(code).toMatch(/where id = 1 and \(dispatch_secret is null or dispatch_secret = ''\)/);
  });
  test("le secret part dans l'en-tête attendu par le site, et l'échec ne bloque jamais l'écriture", () => {
    expect(code).toContain("'x-push-secret'");
    expect(code).toContain("exception when others");
  });
});
