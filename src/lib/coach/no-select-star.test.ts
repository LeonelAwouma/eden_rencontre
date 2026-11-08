import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contrôle STATIQUE : aucune lecture Coach ne demande « * » (ni `.select()` sans argument, équivalent à « * »).
 * Les données de membres ne sortent que par des listes blanches de colonnes explicites.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const root = process.cwd();
const files = [
  ...walk(join(root, "src/app/api/coach")),
  ...walk(join(root, "src/app/api/member/coach")),
  ...walk(join(root, "src/lib/coach")),
];

describe("aucun select(\"*\") dans le code Coach", () => {
  it("couvre bien les fichiers visés", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((f) => f.replace(/\\/g, "/").endsWith("src/lib/coach/members-data.ts"))).toBe(true);
    expect(files.some((f) => f.replace(/\\/g, "/").endsWith("src/app/api/coach/members/route.ts"))).toBe(true);
  });

  it.each(files.map((f) => [f.replace(/\\/g, "/").split("/src/")[1], f]))("%s", (_name, file) => {
    const src = readFileSync(file, "utf8");
    expect(src, "select(\"*\")").not.toMatch(/\.select\(\s*["'`]\s*\*\s*["'`]/);
    expect(src, ".select() sans argument").not.toMatch(/\.select\(\s*\)/);
    expect(src, "select(\"…, *\")").not.toMatch(/\.select\(\s*["'`][^"'`]*\*[^"'`]*["'`]/);
  });
});
