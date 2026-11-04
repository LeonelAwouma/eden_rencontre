import { describe, expect, it, vi } from "vitest";
import { bumpStat, isMissingRelation, readStates, writeState } from "./whats-new-store";

/** Le code doit pouvoir être déployé avant la migration : table ou fonction absente = dégradation silencieuse. */

describe("isMissingRelation", () => {
  it("reconnaît une table ou une fonction absente", () => {
    expect(isMissingRelation({ code: "42P01" })).toBe(true);
    expect(isMissingRelation({ code: "42883" })).toBe(true);
    expect(isMissingRelation({ code: "PGRST205" })).toBe(true);
    expect(isMissingRelation({ code: "PGRST202" })).toBe(true);
    expect(isMissingRelation({ message: 'relation "announcement_states" does not exist' })).toBe(true);
  });

  it("ne confond pas avec une autre erreur", () => {
    expect(isMissingRelation({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingRelation(null)).toBe(false);
    expect(isMissingRelation(undefined)).toBe(false);
  });
});

describe("dégradation sans migration", () => {
  const missing = { code: "42P01", message: 'relation "announcement_states" does not exist' };

  it("readStates renvoie un état vide", async () => {
    const db = { from: () => ({ select: () => ({ eq: async () => ({ data: null, error: missing }) }) }) } as never;
    expect(await readStates(db, "u1")).toEqual({});
  });

  it("writeState et bumpStat renvoient false sans lever d'exception", async () => {
    const db = {
      from: () => ({ upsert: async () => ({ error: missing }) }),
      rpc: async () => ({ error: { code: "PGRST202", message: "bump_announcement_stat introuvable" } }),
    } as never;
    expect(await writeState(db, "u1", "x", "dismiss")).toBe(false);
    expect(await bumpStat(db, "x", "view")).toBe(false);
  });
});

describe("écriture partielle", () => {
  it("n'écrit que la colonne concernée, l'autre garde sa valeur", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const db = { from: () => ({ upsert }) } as never;
    await writeState(db, "u1", "a", "dismiss");
    await writeState(db, "u1", "a", "discover");
    const [dismissRow] = upsert.mock.calls[0] as unknown as [Record<string, string>];
    const [discoverRow] = upsert.mock.calls[1] as unknown as [Record<string, string>];
    expect(Object.keys(dismissRow)).toContain("dismissed_at");
    expect(Object.keys(dismissRow)).not.toContain("discovered_at");
    expect(Object.keys(discoverRow)).toContain("discovered_at");
    expect(Object.keys(discoverRow)).not.toContain("dismissed_at");
  });
});
