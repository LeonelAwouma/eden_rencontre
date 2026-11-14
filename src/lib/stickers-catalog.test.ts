import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { FORUM_STICKERS, STICKER_CATEGORIES, findSticker, twemojiUrl } from "./forum-shared";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

// Identifiants déjà stockés dans forum_messages : ils ne doivent jamais disparaître ni changer d'emoji.
const HISTORICAL: Record<string, string> = {
  bonjour: "☀️", bienvenue: "💐", amen: "🙏", alleluia: "🙌", gloire: "✨", "je-prie": "🕯️", parole: "📖", merci: "🌹",
  "avec-amour": "💚", bravo: "👏", courage: "💪", fete: "🎉", alliance: "💍", rire: "😂", touche: "🥺", "bonne-nuit": "🌙",
};

describe("catalogue commun des stickers", () => {
  it("conserve les 16 identifiants historiques avec le même emoji", () => {
    for (const [id, char] of Object.entries(HISTORICAL)) expect(findSticker(id)?.char, id).toBe(char);
  });

  it("identifiants uniques et compatibles avec la contrainte SQL ^[a-z0-9-]{1,40}$", () => {
    const ids = FORUM_STICKERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it("chaque sticker a une légende FR et EN, et une catégorie traduite", () => {
    for (const loc of ["fr", "en"]) {
      const forum = JSON.parse(read(`src/locales/${loc}.json`)).forum;
      for (const s of FORUM_STICKERS) expect(forum.stickers[s.id], `${loc}:${s.id}`).toBeTruthy();
      for (const c of STICKER_CATEGORIES) expect(forum.stickerCategories[c], `${loc}:${c}`).toBeTruthy();
      expect(forum.stickersAll).toBeTruthy();
    }
    for (const s of FORUM_STICKERS) expect(STICKER_CATEGORIES).toContain(s.category);
  });

  it("illustrations Twemoji : nom de fichier = points de code", () => {
    expect(twemojiUrl("🙏")).toMatch(/twemoji@[\d.]+\/assets\/svg\/1f64f\.svg$/);
    expect(twemojiUrl("❤️")).toMatch(/\/2764\.svg$/); // fe0f omis
    expect(twemojiUrl("✝️")).toMatch(/\/271d\.svg$/);
    expect(twemojiUrl("🕊️")).toMatch(/\/1f54a\.svg$/);
    expect(twemojiUrl("👩‍❤️‍👨")).toMatch(/\/1f469-200d-2764-fe0f-200d-1f468\.svg$/); // séquence ZWJ conservée
    for (const s of FORUM_STICKERS) expect(s.url).toMatch(/\.svg$/);
  });

  it("aucune dépendance restante à Fluent dans le catalogue", () => {
    expect(read("src/lib/forum-shared.ts")).not.toMatch(/fluentui-emoji/);
  });

  it("migration messages : colonne sticker additive avec la même contrainte que le forum", () => {
    const sql = read("supabase/migrations/20261114_messages_sticker.sql");
    expect(sql).toMatch(/add column if not exists sticker text/i);
    expect(sql).toContain("^[a-z0-9-]{1,40}$");
    expect(sql).not.toMatch(/drop |rename /i);
  });
});
