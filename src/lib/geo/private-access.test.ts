import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { MEMBER_COLUMNS } from "../admin-users-export";

/**
 * Garde-fous d'architecture : la table privée member_locations n'est lue que par du code serveur explicitement
 * prévu. Ni le moteur de matching, ni l'administration, ni l'export Excel, ni un composant navigateur n'y touchent.
 */
const SRC = join(process.cwd(), "src");
const ALLOWED = [
  "lib/geo/",
  "app/api/member/location/",
  "app/api/auth/register/",
  "app/api/auth/google-onboarding/",
  "app/api/discover/geo/",
  "app/api/geo/",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

describe("accès à la localisation privée", () => {
  const files = walk(SRC).map((p) => ({ path: relative(SRC, p).split(sep).join("/"), text: readFileSync(p, "utf8") }));

  it("member_locations n'est référencée que par le code serveur prévu", () => {
    const offenders = files
      .filter((f) => f.text.includes("member_locations") && !ALLOWED.some((a) => f.path.startsWith(a)))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("aucun composant navigateur ne lit member_locations ni les fonctions geo_* privées", () => {
    const offenders = files
      .filter((f) => /^\s*["']use client["']/m.test(f.text.slice(0, 200)) && /member_locations|geo_candidates_in_scope|geo_zone_counts|geo_admin_overview/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("le moteur de matching n'importe aucun module géographique privé", () => {
    const offenders = files
      .filter((f) => f.path.startsWith("lib/matching/") && !f.path.includes("__tests__") && /lib\/geo\/(?!public-label)|member_locations/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it("l'export Excel des membres n'ajoute aucune colonne géographique détaillée", () => {
    // « Pays / Région / Ville » existent déjà (profiles) ; rien de plus fin ne doit s'y ajouter.
    const keys = JSON.stringify(MEMBER_COLUMNS.map((c) => c.key));
    expect(keys).not.toMatch(/department|departement|arrondissement|place_id|latitude|longitude|nearby|discoverable|display_level/i);
  });
});
