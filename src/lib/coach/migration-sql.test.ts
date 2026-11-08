import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Contrôles STATIQUES de la migration (aucune base n'est interrogée ni modifiée) :
 * ils verrouillent les garanties de sécurité décrites dans le fichier SQL.
 */
const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261108_coach_assignments.sql"), "utf8");
const hardening = readFileSync(join(process.cwd(), "supabase/migrations/20261107_coach_hardening.sql"), "utf8");
const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

describe("20261108_coach_assignments.sql", () => {
  test("le fichier de durcissement 20261107 n'est pas réécrit (toujours la politique à 3 conditions)", () => {
    expect(hardening).toContain("public.is_approved(auth.uid())");
    expect(hardening).not.toContain("is_active_coach(auth.uid())\n  )");
  });

  test("machine à états : CHECK sur les combinaisons, unicité partielle, pas d'auto-attribution", () => {
    expect(code).toContain("coach_assignment_state_chk");
    expect(code).toMatch(/status = 'active'\s+and consent_status = 'accepted'/);
    expect(code).toMatch(/status = 'revoked'\s+and consent_status = 'withdrawn'/);
    expect(code).toMatch(/status = 'declined' and consent_status = 'declined'/);
    expect(code).toContain("check (coach_id <> member_id)");
    expect(code).toMatch(/create unique index if not exists coach_assignment_one_open_per_member[\s\S]*where status in \('pending','active'\)/);
  });

  test("déclencheur : transitions limitées, états terminaux figés", () => {
    expect(code).toContain("old.status in ('declined','ended','revoked')");
    expect(code).toMatch(/old\.status = 'pending' and new\.status in \('active','declined','ended'\)/);
    expect(code).toMatch(/old\.status = 'active'\s+and new\.status in \('revoked','ended'\)/);
  });

  test("chaque fonction de mutation sérialise par membre et verrouille le coach", () => {
    expect(code.match(/pg_advisory_xact_lock\(hashtext\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(code).toContain("for update");
  });

  test("toutes les fonctions sont SECURITY DEFINER avec search_path figé", () => {
    const fns = code.match(/create or replace function public\.coach_\w+/g) ?? [];
    expect(fns.length).toBeGreaterThanOrEqual(7);
    for (const name of ["coach_is_usable", "coach_assign_member", "coach_respond_assignment", "coach_end_assignment", "coach_set_active", "coach_can_access_member"]) {
      const block = code.slice(code.indexOf(`function public.${name}`), code.indexOf(`function public.${name}`) + 400);
      expect(block, name).toContain("security definer set search_path = public");
    }
  });

  test("exécution réservée à service_role : aucune autorisation pour anon / authenticated / public", () => {
    expect(code).not.toMatch(/grant execute[^;]*\bto\s+[^;]*\b(authenticated|anon|public)\b/i);
    const grants = code.match(/grant execute on function public\.coach_\w+\([^)]*\)\s+to service_role;/g) ?? [];
    expect(grants.length).toBe(6);
    expect(code).toMatch(/revoke all on function public\.coach_assign_member\(uuid, uuid, text\)\s+from public, anon, authenticated/);
  });

  test("tables réservées au serveur : RLS activée, droits retirés, aucune politique permissive", () => {
    for (const t of ["coach_member_assignments", "coach_audit_logs", "coach_notifications"]) {
      expect(code).toContain(`alter table public.${t}`);
      expect(code).toMatch(new RegExp(`revoke all on public\\.${t}\\s+from anon, authenticated`));
      expect(code).toMatch(new RegExp(`create policy ${t}_service_only on public\\.${t}\\s+for all to authenticated using \\(false\\) with check \\(false\\)`));
    }
    expect(code).not.toMatch(/create policy [^;]* using \(true\)/i);
  });

  test("les notifications Coach n'utilisent pas meeting_notifications", () => {
    expect(code).not.toContain("meeting_notifications");
  });

  test("la désactivation d'un coach termine ses attributions et suspend le profil dans la même fonction", () => {
    const body = code.slice(code.indexOf("function public.coach_set_active"));
    expect(body).toContain("set active = false");
    expect(body).toContain("set status = 'suspended'");
    expect(body).toContain("end_reason = 'coach_deactivated'");
  });

  test("un dossier ne peut être inséré qu'en « pending » (aucun contournement du consentement par insertion directe)", () => {
    expect(code).toMatch(/tg_op = 'INSERT' and \(new\.status <> 'pending' or new\.consent_status <> 'pending'\)/);
  });

  test("clés étrangères : le coach est protégé (RESTRICT, historique conservé), le membre en cascade", () => {
    expect(code).toMatch(/coach_id\s+uuid not null references auth\.users\(id\) on delete restrict/);
    expect(code).toMatch(/member_id\s+uuid not null references auth\.users\(id\) on delete cascade/);
  });

  test("search_path figé avec pg_temp en dernier sur toutes les fonctions SECURITY DEFINER", () => {
    expect(code).not.toMatch(/set search_path = public as/);
    expect(code.match(/set search_path = public, pg_temp as/g)?.length).toBe(6);
  });

  test("is_active_coach n'est plus exécutable par les utilisateurs connectés (bloc conditionnel)", () => {
    expect(code).toMatch(/to_regprocedure\('public\.is_active_coach\(uuid\)'\) is not null[\s\S]*revoke execute on function public\.is_active_coach\(uuid\) from anon, authenticated/);
  });

  test("les notifications Coach n'incorporent aucun champ d'identité (pseudo, nom, e-mail, téléphone) : textes fixes seulement", () => {
    const inserts = code.match(/insert into public\.coach_notifications[\s\S]*?;/g) ?? [];
    expect(inserts.length).toBeGreaterThanOrEqual(4);
    for (const stmt of inserts) {
      expect(stmt).not.toMatch(/\b(pseudo|first_name|last_name|email|phone|name)\b/i);
      expect(stmt).not.toMatch(/\bfrom public\.profiles\b/);
    }
  });

  test("aucune instruction destructive", () => {
    expect(code).not.toMatch(/\bdrop table\b|\btruncate\b|\bdelete from\b|\bdrop column\b/i);
  });

  test("aucune clé ni secret dans le fichier", () => {
    expect(sql).not.toMatch(/sb_secret_|service_role_key|eyJ[A-Za-z0-9_-]{20,}/);
  });
});
