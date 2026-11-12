import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/** Contrôles STATIQUES de 20261112_member_reactivation_auto.sql et du retrait de l'opt-in individuel. */
const root = process.cwd();
const sql = readFileSync(join(root, "supabase/migrations/20261112_member_reactivation_auto.sql"), "utf8");
const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

describe("20261112_member_reactivation_auto.sql", () => {
  test("additive et non destructive : aucune suppression, aucune écriture sur les données existantes", () => {
    expect(code).not.toMatch(/\bdrop table\b|\btruncate\b|\bdelete from\b|\bdrop column\b/i);
    expect(code).not.toMatch(/\bupdate\s+public\.(profiles|member_reactivation_preferences|member_reactivation_sends)\b/i);
    expect(code).not.toMatch(/\binsert\s+into\s+public\.member_reactivation_preferences\b/i);
  });
  test("ne réinitialise jamais last_member_visit_at des membres existants (seulement NULL, à l'approbation)", () => {
    const fn = code.slice(code.indexOf("function public.member_reactivation_init_visit"));
    expect(fn).toContain("new.last_member_visit_at is null");
    expect(fn).toMatch(/tg_op = 'INSERT' or old\.status is distinct from 'approved'/);
    expect(code).not.toMatch(/set\s+last_member_visit_at\s*=/i); // aucun UPDATE de masse
  });
  test("idempotente : colonne conditionnelle, déclencheur recréé proprement", () => {
    expect(code).toContain("add column if not exists attempts");
    expect(code).toContain("create or replace function public.member_reactivation_init_visit");
    expect(code).toContain("drop trigger if exists member_reactivation_init_visit");
  });
  test("couvre l'insertion directe d'un profil approuvé comme le passage à « approved »", () => {
    expect(code).toMatch(/before insert or update of status on public\.profiles/);
  });
  test("fonction SECURITY DEFINER avec search_path figé", () => {
    expect(code).toContain("security definer set search_path = public, pg_temp");
  });
});

describe("retrait de l'activation individuelle", () => {
  test("le composant et l'API de préférences n'existent plus", () => {
    expect(existsSync(join(root, "src/components/reactivation-email-preference.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/app/api/member/reactivation/preferences"))).toBe(false);
  });
  test("la page profil n'affiche plus le composant ; la route de désinscription existe toujours", () => {
    expect(readFileSync(join(root, "src/app/dashboard/profile/page.tsx"), "utf8")).not.toMatch(/ReactivationEmailPreference|reactivation-email-preference/);
    expect(existsSync(join(root, "src/app/api/member/reactivation/unsubscribe/route.ts"))).toBe(true);
  });
  test("le cron ne sélectionne plus les seuls membres « email_opt_in = true »", () => {
    const cron = readFileSync(join(root, "src/lib/member-reactivation-run.ts"), "utf8");
    expect(cron).not.toMatch(/eq\("email_opt_in",\s*true\)/);
    expect(cron).toMatch(/eq\("email_opt_in",\s*false\)/); // liste d'opposition
  });
});
