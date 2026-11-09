import { describe, expect, test } from "vitest";
import { avatarStoragePath, checkAvatarFile, COACH_AVATAR_MAX_BYTES, sniffImageType } from "./avatar";

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const blob = (bytes: number[], pad = 0) => new Blob([new Uint8Array([...bytes, ...new Array(pad).fill(0)])]);

describe("sniffImageType", () => {
  test("reconnaît JPEG, PNG et WebP d'après les octets", () => {
    expect(sniffImageType(new Uint8Array(JPEG))?.mime).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array(PNG))?.mime).toBe("image/png");
    expect(sniffImageType(new Uint8Array(WEBP))?.mime).toBe("image/webp");
  });
  test("refuse GIF, SVG, HTML et fichiers courts", () => {
    expect(sniffImageType(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='x'></svg>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<html></html>"))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff]))).toBeNull();
  });
});

describe("checkAvatarFile", () => {
  test("accepte une image valide", async () => {
    const r = await checkAvatarFile(blob(PNG, 10));
    expect(r.ok).toBe(true);
  });
  test("refuse : absent, vide, trop lourd, type faux même avec un MIME d'image annoncé", async () => {
    expect((await checkAvatarFile(null)).ok).toBe(false);
    expect((await checkAvatarFile(new Blob([]))).ok).toBe(false);
    const big = await checkAvatarFile(blob(PNG, COACH_AVATAR_MAX_BYTES));
    expect(big).toMatchObject({ ok: false, code: "avatar_too_large" });
    const fake = await checkAvatarFile(new Blob([new TextEncoder().encode("not an image")], { type: "image/png" }));
    expect(fake).toMatchObject({ ok: false, code: "avatar_invalid_type" });
  });
});

describe("avatarStoragePath", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  test("ne retient que les photos de coach du bucket", () => {
    expect(avatarStoragePath(`https://p.supabase.co/storage/v1/object/public/chat-images/avatars/coach-${id}-123.png`)).toBe(`avatars/coach-${id}-123.png`);
  });
  test("ignore les autres avatars et valeurs (jamais de suppression hors périmètre)", () => {
    expect(avatarStoragePath("https://p.supabase.co/storage/v1/object/public/chat-images/avatars/reg-abc.jpg")).toBeNull();
    expect(avatarStoragePath("/avatars/femme-1.webp")).toBeNull();
    expect(avatarStoragePath("https://api.dicebear.com/9.x/x/svg")).toBeNull();
    expect(avatarStoragePath(null)).toBeNull();
    expect(avatarStoragePath(`https://p.supabase.co/storage/v1/object/public/chat-images/avatars/coach-${id}-1.png/../../x`)).toBeNull();
  });
});
