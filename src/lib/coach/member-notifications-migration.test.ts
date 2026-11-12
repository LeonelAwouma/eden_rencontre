import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/** Contrôles STATIQUES de 20261112_coach_member_notifications.sql (aucune base interrogée). */
const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261112_coach_member_notifications.sql"), "utf8");
const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
const assign = code.slice(code.indexOf("function public.coach_assign_member"), code.indexOf("alter table public.push_log"));
const trig = code.slice(code.indexOf("function public.push_on_coach_notification"));

describe("20261112_coach_member_notifications.sql", () => {
  test("réaffectation atomique : tout se passe dans la seule fonction coach_assign_member", () => {
    expect(assign).toContain("language plpgsql security definer set search_path = public, pg_temp");
    expect(assign).toContain("pg_advisory_xact_lock");
    expect(assign).toMatch(/set status = 'ended', ended_at = now\(\), end_reason = 'reassigned'/);
    expect(assign).toMatch(/update public\.coach_notifications set read_at = now\(\)[\s\S]*kind = 'coach_assignment_proposed' and read_at is null/);
    expect(assign).toMatch(/insert into public\.coach_member_assignments[\s\S]*'pending', 'pending'/);
    expect(assign).toMatch(/insert into public\.coach_notifications[\s\S]*'coach_assignment_proposed'/);
  });
  test("l'ancien coach n'est prévenu que si l'ancien dossier était ACTIF", () => {
    expect(assign).toMatch(/if v_old\.status = 'active' then[\s\S]*insert into public\.coach_notifications \(recipient_id[\s\S]*v_old\.coach_id[\s\S]*end if;/);
  });
  test("le lien de la proposition mène à l'onglet Home et à la carte de validation", () => {
    expect(assign).toContain("'/dashboard?tab=Home#coach-proposal'");
  });
  test("la nouvelle proposition reste « pending » : jamais d'activation sans consentement", () => {
    expect(assign).not.toMatch(/consent_status = 'accepted'/);
    expect(assign).not.toMatch(/'active'\s*,\s*'accepted'/);
  });
  test("textes fixes sans champ d'identité", () => {
    for (const stmt of code.match(/insert into public\.coach_notifications[\s\S]*?;/g) ?? []) {
      expect(stmt).not.toMatch(/\b(pseudo|first_name|last_name|email|phone)\b/i);
      expect(stmt).not.toMatch(/\bfrom public\.profiles\b/);
    }
  });
  test("push_log : colonnes additives, anciens événements conservés comme « sent »", () => {
    expect(code).toContain("add column if not exists status text not null default 'sent'");
    expect(code).toContain("add column if not exists claimed_at timestamptz");
  });
  test("trigger push : destinataire membre approuvé vérifié dans profiles, jamais déduit du seul « kind »", () => {
    expect(trig).toMatch(/p\.account_type = 'member' and p\.status = 'approved'/);
    expect(trig).toContain("push_dispatch('coach_notification'");
    expect(code).toContain("drop trigger if exists push_on_coach_notification");
  });
  test("non destructive, sans secret, n'utilise pas meeting_notifications", () => {
    expect(code).not.toMatch(/\bdrop table\b|\btruncate\b|\bdelete from\b|\bdrop column\b/i);
    expect(code).not.toContain("meeting_notifications");
    expect(sql).not.toMatch(/sb_secret_|service_role_key|eyJ[A-Za-z0-9_-]{20,}/);
  });
});
