/**
 * Chargement sécurisé des membres d'un coach (service_role : la règle « qui peut voir qui » est ICI).
 *
 * Un membre n'est visible que si son affectation est `active` ET son consentement `accepted`
 * (même prédicat que la fonction SQL `coach_can_access_member`), et si son profil est approuvé et
 * de type « member ». Les colonnes lues sont une liste blanche : jamais `select("*")`, jamais le nom
 * réel, l'e-mail, le téléphone, le questionnaire, le selfie ni les photos d'inscription.
 */
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { COACH_MEMBER_COLUMNS } from "@/lib/coach/dto";
import { summarizeFormation } from "@/lib/formation/admin-summary";
import {
  MAX_MEMBERS_LOADED,
  classifyFormation,
  computeCoverage,
  toCoachFormationSummary,
  type CoachMemberView,
  type Coverage,
} from "@/lib/coach/members-view";

type Db = ReturnType<typeof getSupabaseAdmin>;

/** Colonnes de profil lues : liste blanche + `formation_completed` strictement pour le résumé de progression. */
export const COACH_MEMBER_SELECT = `${COACH_MEMBER_COLUMNS}, formation_completed`;

/** `.in()` encode les identifiants dans l'URL : on charge par lots pour rester sous la limite de longueur. */
const PROFILE_CHUNK = 100;

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/**
 * Ligne de profil + affectation → vue du membre. `formation_completed` non tableau → pas de résumé
 * (`summarizeFormation` le transformerait silencieusement en « rien fait » et le classerait à tort).
 */
export function toCoachMemberView(row: Row | null | undefined, assignment: Row | null | undefined): CoachMemberView | null {
  if (!row || typeof row.id !== "string" || !assignment) return null;
  // Le résumé est converti en DTO explicite tout de suite : « orphans » (texte libre du membre) ne quitte jamais ce module.
  const formation = Array.isArray(row.formation_completed) ? toCoachFormationSummary(summarizeFormation(row.formation_completed)) : null;
  return {
    id: row.id,
    pseudo: str(row.pseudo),
    avatarUrl: str(row.avatar_url),
    country: str(row.country),
    city: str(row.city),
    assignedAt: String(assignment.assigned_at ?? ""),
    consentAt: str(assignment.consent_at),
    formation,
    formationState: classifyFormation(formation),
  };
}

export interface LoadedCoachMembers {
  members: CoachMemberView[];
  coverage: Coverage;
}

/**
 * Les 500 affectations actives et consenties les PLUS RÉCENTES (`consent_at` décroissant, puis `id`),
 * leurs profils exploitables, et la couverture exacte (troncature ≠ profils manquants).
 * Toute erreur de lecture lève : l'appelant répond 500, jamais une liste partielle présentée comme complète.
 */
export async function loadCoachMembers(db: Db, coachId: string): Promise<LoadedCoachMembers> {
  const { data: assignments, error, count } = await db
    .from("coach_member_assignments")
    .select("id, member_id, assigned_at, consent_at", { count: "exact" })
    .eq("coach_id", coachId)
    .eq("status", "active")
    .eq("consent_status", "accepted")
    .order("consent_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(MAX_MEMBERS_LOADED);
  if (error) throw new Error("coach members: assignments query failed");

  const selected = (assignments ?? []) as Row[];
  const activeMembers = typeof count === "number" ? Math.max(count, selected.length) : selected.length;

  const ids = [...new Set(selected.map((a) => a.member_id).filter((v): v is string => typeof v === "string"))];
  const profilesById = new Map<string, Row>();
  for (let i = 0; i < ids.length; i += PROFILE_CHUNK) {
    const { data: profiles, error: profilesError } = await db
      .from("profiles")
      .select(COACH_MEMBER_SELECT)
      .in("id", ids.slice(i, i + PROFILE_CHUNK))
      .eq("status", "approved")
      .eq("account_type", "member");
    if (profilesError) throw new Error("coach members: profiles query failed");
    for (const p of (profiles ?? []) as unknown as Row[]) if (typeof p.id === "string") profilesById.set(p.id, p);
  }

  const members: CoachMemberView[] = [];
  for (const a of selected) {
    const view = toCoachMemberView(profilesById.get(String(a.member_id)), a);
    if (view) members.push(view);
  }
  return { members, coverage: computeCoverage(activeMembers, selected.length, members.length) };
}

/** Nombre de propositions en attente de réponse : un compteur, jamais l'identité des membres concernés. */
export async function countPendingProposals(db: Db, coachId: string): Promise<number> {
  const { count, error } = await db
    .from("coach_member_assignments")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .eq("status", "pending");
  if (error) throw new Error("coach members: pending count failed");
  return count ?? 0;
}
