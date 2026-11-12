import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { ACTIVITY_KINDS, COACH_STATE_FILTERS } from "./members-view";
import { ACTION_STATUSES, NOTE_FIELDS } from "./notes-model";
import { SESSION_ERROR_STATUS, SESSION_STATUSES, SESSION_TYPES } from "./sessions-model";

/**
 * Un libellé absent s'affiche sous forme de clé brute (`t()` renvoie la clé) sans aucune erreur au build :
 * ces tests verrouillent la parité fr/en des nouveaux espaces de noms ET l'existence de chaque clé utilisée.
 */
const NAMESPACES = [
  "coachNav", "coachDashboard", "coachMembers", "coachFormation", "coachProfile", "coachCommon", "coachMember",
  "coachSessions", "coachNotes", "coachReports", "coachActions", "coachFollowUp", "coachMediatheque",
] as const;

const leafKeys = (obj: unknown, prefix = ""): string[] =>
  obj && typeof obj === "object" && !Array.isArray(obj)
    ? Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k))
    : [prefix];

const resolve = (dict: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((acc, part) =>
    acc && typeof acc === "object" && part in (acc as Record<string, unknown>) ? (acc as Record<string, unknown>)[part] : undefined, dict);

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("espaces de noms coach*", () => {
  it.each(NAMESPACES)("%s : mêmes clés exactement en français et en anglais", (ns) => {
    const frKeys = leafKeys((fr as Record<string, unknown>)[ns], ns).sort();
    const enKeys = leafKeys((en as Record<string, unknown>)[ns], ns).sort();
    expect(frKeys.length).toBeGreaterThan(0);
    expect(enKeys).toEqual(frKeys);
  });

  it("chaque texte est non vide et garde les mêmes variables {…} dans les deux langues", () => {
    for (const ns of NAMESPACES) {
      for (const key of leafKeys((fr as Record<string, unknown>)[ns], ns)) {
        const f = resolve(fr, key);
        const e = resolve(en, key);
        expect(f, `fr.${key}`).toEqual(expect.any(String));
        expect(e, `en.${key}`).toEqual(expect.any(String));
        expect((f as string).trim(), `fr.${key} vide`).not.toBe("");
        expect((e as string).trim(), `en.${key} vide`).not.toBe("");
        expect(placeholders(e as string), `variables de ${key}`).toEqual(placeholders(f as string));
      }
    }
  });

  it("les familles de clés dynamiques existent pour chaque valeur possible", () => {
    for (const f of COACH_STATE_FILTERS) expect(resolve(fr, `coachMembers.filter.${f}`), f).toEqual(expect.any(String));
    for (const s of ["completed", "inProgress", "notStarted", "unavailable"]) {
      expect(resolve(fr, `coachMembers.state.${s}`), s).toEqual(expect.any(String));
      expect(resolve(en, `coachMembers.state.${s}`), s).toEqual(expect.any(String));
    }
    for (const k of [...ACTIVITY_KINDS, "other"]) {
      expect(resolve(fr, `coachDashboard.activity.${k}`), k).toEqual(expect.any(String));
      expect(resolve(en, `coachDashboard.activity.${k}`), k).toEqual(expect.any(String));
    }
    for (const s of ["done", "inProgress", "todo", "locked"]) expect(resolve(fr, `coachMembers.pillarStatus.${s}`), s).toEqual(expect.any(String));
    for (const k of ["quiz", "reflections", "readingPositions"]) expect(resolve(fr, `coachMembers.unavailableItems.${k}`), k).toEqual(expect.any(String));
  });

  it("lot 3 : une traduction existe pour chaque statut, type, champ de note et statut d'action", () => {
    for (const dict of [fr, en]) {
      for (const k of SESSION_STATUSES) expect(resolve(dict, `coachSessions.status.${k}`), k).toEqual(expect.any(String));
      for (const k of SESSION_TYPES) expect(resolve(dict, `coachSessions.type.${k}`), k).toEqual(expect.any(String));
      for (const k of NOTE_FIELDS) expect(resolve(dict, `coachNotes.fields.${k}`), k).toEqual(expect.any(String));
      for (const k of ACTION_STATUSES) expect(resolve(dict, `coachActions.status.${k}`), k).toEqual(expect.any(String));
    }
  });

  it("lot 3 : chaque code d'erreur de séance a un message (sauf ambiguë, gérée par un choix) et un message générique existe", () => {
    for (const dict of [fr, en]) {
      expect(resolve(dict, "coachSessions.errors.generic")).toEqual(expect.any(String));
      for (const code of Object.keys(SESSION_ERROR_STATUS)) {
        if (code === "ambiguous_local_time") continue;
        expect(resolve(dict, `coachSessions.errors.${code}`), code).toEqual(expect.any(String));
      }
      for (const ns of ["coachNotes", "coachReports", "coachActions"]) expect(resolve(dict, `${ns}.errors.generic`), ns).toEqual(expect.any(String));
    }
  });
});

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

describe("aucune clé brute dans l'interface", () => {
  it("toute clé coach* littérale utilisée dans le code existe en français et en anglais", () => {
    const root = process.cwd();
    const files = [
      ...sourceFiles(join(root, "src/components/coach")),
      ...sourceFiles(join(root, "src/app/coach")),
      join(root, "src/components/dashboard/coach-proposal-card.tsx"),
      join(root, "src/components/dashboard/coach-follow-up-card.tsx"),
      join(root, "src/lib/coach-nav.ts"),
    ];
    const used = new Set<string>();
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/["'`]((?:coachNav|coachDashboard|coachMembers|coachFormation|coachProfile|coachCommon|coachMember|coachMediatheque)\.[A-Za-z0-9_.]+)["'`]/g)) {
        used.add(m[1]);
      }
    }
    expect(used.size).toBeGreaterThan(20);
    for (const key of used) {
      expect(resolve(fr, key), `fr.${key}`).toEqual(expect.any(String));
      expect(resolve(en, key), `en.${key}`).toEqual(expect.any(String));
    }
  });
});
