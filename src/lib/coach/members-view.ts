/**
 * Logique PURE de l'espace Coach (aucune E/S, testée sous vitest) :
 * classement de la formation, recherche, pagination, statistiques, DTO d'activité.
 *
 * Règle d'or : aucune donnée inventée. Une donnée manquante ou incohérente est « unavailable »,
 * jamais rangée d'office dans une autre catégorie ni « corrigée ».
 */
import type { FormationSummary } from "@/lib/formation/admin-summary";

export const MEMBERS_PAGE_SIZE = 12;
export const MAX_MEMBERS_LOADED = 500;
export const MAX_QUERY_LENGTH = 60;
export const MAX_PAGE = 10_000;
export const RECENT_MEMBERS_LIMIT = 5;
export const RECENT_ACTIVITY_LIMIT = 8;

// ── Formation ────────────────────────────────────────────────────────────────

export type FormationState = "completed" | "inProgress" | "notStarted" | "unavailable";

/** Formation entièrement terminée : `total > 0` et `done === total` (aucun drapeau n'existe en base). */
export function isFormationComplete(summary: Pick<FormationSummary, "done" | "total"> | null | undefined): boolean {
  return !!summary && summary.total > 0 && summary.done === summary.total;
}

/**
 * Classe une progression dans UNE catégorie. Absent, non entier, négatif, `done > total` ou `total = 0`
 * → « unavailable » : on ne devine rien.
 */
export function classifyFormation(summary: Pick<FormationSummary, "done" | "total"> | null | undefined): FormationState {
  if (!summary) return "unavailable";
  const { done, total } = summary;
  if (!Number.isInteger(done) || !Number.isInteger(total)) return "unavailable";
  if (total <= 0 || done < 0 || done > total) return "unavailable";
  if (done === total) return "completed";
  if (done === 0) return "notStarted";
  return "inProgress";
}

// ── Résumé de formation exposé au coach (DTO explicite, SANS « orphans ») ─────

type SummaryPillar = FormationSummary["pillars"][number];

export interface CoachFormationLesson { slug: string; number: string; title: string; done: boolean }
export interface CoachFormationPillar {
  number: number;
  title: string;
  done: number;
  total: number;
  status: SummaryPillar["status"];
  lessons: CoachFormationLesson[];
}
export interface CoachFormationSummary {
  done: number;
  total: number;
  percent: number;
  pillars: CoachFormationPillar[];
  /** Prochaine leçon à lire (null si tout est terminé). */
  current: { number: string; title: string; pillar: number } | null;
}

/** Clés exactes du DTO (verrouillées par les tests : toute clé en plus est une fuite). */
export const COACH_FORMATION_SUMMARY_KEYS = ["done", "total", "percent", "pillars", "current"] as const;
export const COACH_FORMATION_PILLAR_KEYS = ["number", "title", "done", "total", "status", "lessons"] as const;
export const COACH_FORMATION_LESSON_KEYS = ["slug", "number", "title", "done"] as const;
export const COACH_FORMATION_CURRENT_KEYS = ["number", "title", "pillar"] as const;

/**
 * Construit le DTO PROPRE du résumé de formation, champ par champ.
 * `summarizeFormation` renvoie aussi `orphans` : les slugs enregistrés qui ne correspondent à aucune leçon,
 * donc du TEXTE LIBRE écrit par le membre (la colonne `formation_completed` n'est pas protégée côté base).
 * Il ne doit jamais atteindre le navigateur du coach : la copie est explicite, aucune propriété n'est propagée
 * par défaut. Les données d'origine ne sont ni modifiées ni supprimées.
 */
export function toCoachFormationSummary(summary: FormationSummary | CoachFormationSummary): CoachFormationSummary {
  const pillars = Array.isArray(summary.pillars) ? summary.pillars : [];
  return {
    done: summary.done,
    total: summary.total,
    percent: summary.percent,
    pillars: pillars.map((p) => ({
      number: p.number,
      title: p.title,
      done: p.done,
      total: p.total,
      status: p.status,
      lessons: (Array.isArray(p.lessons) ? p.lessons : []).map((l) => ({ slug: l.slug, number: l.number, title: l.title, done: l.done })),
    })),
    current: summary.current ? { number: summary.current.number, title: summary.current.title, pillar: summary.current.pillar } : null,
  };
}

// ── Membres ──────────────────────────────────────────────────────────────────

/** Membre tel que vu par le coach : liste blanche, aucune donnée d'identité civile. */
export interface CoachMemberView {
  id: string;
  pseudo: string | null;
  avatarUrl: string | null;
  country: string | null;
  city: string | null;
  assignedAt: string;
  consentAt: string | null;
  /** null quand `formation_completed` n'est pas exploitable (jamais un résumé fabriqué). Jamais d'« orphans ». */
  formation: CoachFormationSummary | null;
  formationState: FormationState;
}

export const COACH_STATE_FILTERS = ["all", "completed", "inProgress", "notStarted"] as const;
export type MemberStateFilter = (typeof COACH_STATE_FILTERS)[number];

/** Minuscules sans accents ni espaces de bord : base de la recherche ET du tri (comparaison déterministe). */
export function normalizeForSearch(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Tri stable et déterministe : pseudo normalisé, pseudo absent en dernier, puis `id`. */
export function sortMembers<T extends { id: string; pseudo: string | null }>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => {
    const pa = a.pseudo ? normalizeForSearch(a.pseudo) : null;
    const pb = b.pseudo ? normalizeForSearch(b.pseudo) : null;
    if (pa === null && pb !== null) return 1;
    if (pa !== null && pb === null) return -1;
    if (pa !== null && pb !== null && pa !== pb) return pa < pb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Recherche (pseudo) et filtre de progression. Ne porte QUE sur les membres fournis (déjà chargés). */
export function filterMembers<T extends { pseudo: string | null; formationState: FormationState }>(
  members: readonly T[],
  opts: { q?: string; state?: MemberStateFilter }
): T[] {
  const q = normalizeForSearch(opts.q);
  const state = opts.state ?? "all";
  return members.filter((m) => {
    if (state !== "all" && m.formationState !== state) return false;
    if (q && !normalizeForSearch(m.pseudo).includes(q)) return false;
    return true;
  });
}

export interface Page<T> { items: T[]; page: number; totalPages: number; total: number }

/** Pagination : page ramenée dans [1, totalPages] ; liste vide → 1 page vide. Aucun doublon d'une page à l'autre. */
export function paginate<T>(list: readonly T[], page: number, size: number = MEMBERS_PAGE_SIZE): Page<T> {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (safePage - 1) * size;
  return { items: list.slice(start, start + size), page: safePage, totalPages, total };
}

export type MembersQuery = { ok: true; q: string; state: MemberStateFilter; page: number } | { ok: false };

/** Validation stricte des paramètres de `GET /api/coach/members` ; toute valeur invalide → `{ ok: false }` (400). */
export function parseMembersQuery(params: URLSearchParams): MembersQuery {
  const rawQ = params.get("q");
  const q = (rawQ ?? "").trim();
  if (q.length > MAX_QUERY_LENGTH) return { ok: false };

  const rawState = params.get("state");
  const state = rawState === null || rawState === "" ? "all" : rawState;
  if (!(COACH_STATE_FILTERS as readonly string[]).includes(state)) return { ok: false };

  const rawPage = params.get("page");
  let page = 1;
  if (rawPage !== null && rawPage !== "") {
    if (!/^\d{1,5}$/.test(rawPage)) return { ok: false };
    page = Number(rawPage);
    if (page < 1 || page > MAX_PAGE) return { ok: false };
  }
  return { ok: true, q, state: state as MemberStateFilter, page };
}

// ── Couverture du chargement (plafond 500) ────────────────────────────────────

export interface Coverage {
  /** Nombre EXACT d'affectations actives et consenties. */
  activeMembers: number;
  /** Affectations retenues pour le chargement (≤ 500). */
  selectedAssignments: number;
  /** Profils effectivement chargés. */
  loadedMembers: number;
  /** Retenues mais sans profil exploitable (non approuvé, supprimé…). */
  excludedProfiles: number;
  /** Plafond atteint : `activeMembers > selectedAssignments`. Distinct des profils manquants. */
  truncated: boolean;
}

export function computeCoverage(activeMembers: number, selectedAssignments: number, loadedMembers: number): Coverage {
  return {
    activeMembers,
    selectedAssignments,
    loadedMembers,
    excludedProfiles: Math.max(0, selectedAssignments - loadedMembers),
    truncated: activeMembers > selectedAssignments,
  };
}

// ── Activité récente (notifications du coach) ─────────────────────────────────

/** Types de notification Coach connus ; tout autre → « other ». Aucun texte libre ne sort du serveur. */
export const ACTIVITY_KINDS = ["assignment_accepted", "assignment_declined", "assignment_revoked", "assignment_ended"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number] | "other";

export interface ActivityDto { id: string; kind: ActivityKind; createdAt: string; read: boolean }
export const ACTIVITY_DTO_KEYS = ["id", "kind", "createdAt", "read"] as const;

/** Ligne `coach_notifications` → DTO à 4 champs. Ni titre, ni corps, ni lien, ni destinataire. */
export function toActivityDto(row: Record<string, unknown> | null | undefined): ActivityDto | null {
  if (!row || typeof row.id !== "string" || !row.id) return null;
  const kind = (ACTIVITY_KINDS as readonly string[]).includes(row.kind as string) ? (row.kind as ActivityKind) : "other";
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  return { id: row.id, kind, createdAt, read: row.read_at != null };
}

// ── Tableau de bord ───────────────────────────────────────────────────────────

export interface RecentMemberDto { id: string; pseudo: string | null; avatarUrl: string | null; consentAt: string | null }
export const RECENT_MEMBER_DTO_KEYS = ["id", "pseudo", "avatarUrl", "consentAt"] as const;

export interface DashboardStats extends Coverage {
  pendingProposals: number;
  formationEvaluatedMembers: number;
  formationCompleted: number;
  formationInProgress: number;
  formationNotStarted: number;
  formationUnavailable: number;
  recentMembers: RecentMemberDto[];
  recentActivity: ActivityDto[];
}

/** Les plus récents d'abord (`consent_at` décroissant), puis `id` croissant : ordre total et stable. */
export function sortByRecentConsent<T extends { id: string; consentAt: string | null }>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => {
    const ta = a.consentAt ?? "";
    const tb = b.consentAt ?? "";
    if (ta !== tb) return ta < tb ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function computeDashboardStats(input: {
  coverage: Coverage;
  pendingProposals: number;
  members: readonly CoachMemberView[];
  activity: readonly ActivityDto[];
}): DashboardStats {
  const counts = { completed: 0, inProgress: 0, notStarted: 0, unavailable: 0 };
  for (const m of input.members) counts[m.formationState] += 1;
  return {
    ...input.coverage,
    pendingProposals: input.pendingProposals,
    formationEvaluatedMembers: counts.completed + counts.inProgress + counts.notStarted,
    formationCompleted: counts.completed,
    formationInProgress: counts.inProgress,
    formationNotStarted: counts.notStarted,
    formationUnavailable: counts.unavailable,
    recentMembers: sortByRecentConsent(input.members)
      .slice(0, RECENT_MEMBERS_LIMIT)
      .map((m) => ({ id: m.id, pseudo: m.pseudo, avatarUrl: m.avatarUrl, consentAt: m.consentAt })),
    recentActivity: input.activity.slice(0, RECENT_ACTIVITY_LIMIT),
  };
}

/** Données de suivi qui n'existent que sur l'appareil du membre : jamais disponibles côté serveur. */
export const MEMBER_DETAIL_UNAVAILABLE = ["quiz", "reflections", "readingPositions"] as const;

// ── Liste, détail et page Formation (DTO exposés par l'API) ──────────────────

export interface MemberListItem {
  id: string;
  pseudo: string | null;
  avatarUrl: string | null;
  country: string | null;
  city: string | null;
  assignedAt: string;
  consentAt: string | null;
  formationState: FormationState;
  formationPercent: number | null;
  formationDone: number | null;
  formationTotal: number | null;
}
export const MEMBER_LIST_ITEM_KEYS = [
  "id", "pseudo", "avatarUrl", "country", "city", "assignedAt", "consentAt",
  "formationState", "formationPercent", "formationDone", "formationTotal",
] as const;

export function toMemberListItem(m: CoachMemberView): MemberListItem {
  const usable = m.formationState !== "unavailable" && m.formation;
  return {
    id: m.id, pseudo: m.pseudo, avatarUrl: m.avatarUrl, country: m.country, city: m.city,
    assignedAt: m.assignedAt, consentAt: m.consentAt, formationState: m.formationState,
    formationPercent: usable ? m.formation!.percent : null,
    formationDone: usable ? m.formation!.done : null,
    formationTotal: usable ? m.formation!.total : null,
  };
}

export interface FormationOverviewPillar {
  number: number;
  title: string;
  membersDone: number;
  membersInProgress: number;
  membersNotStarted: number;
}
export interface FormationOverviewRow {
  id: string;
  pseudo: string | null;
  avatarUrl: string | null;
  formationState: FormationState;
  percent: number | null;
  /** Seulement si la progression est exploitable ET qu'une prochaine leçon existe. */
  nextLesson: { number: string; title: string } | null;
}
export const FORMATION_ROW_KEYS = ["id", "pseudo", "avatarUrl", "formationState", "percent", "nextLesson"] as const;

/** Agrégats par pilier + une ligne par membre. Les membres « unavailable » ne comptent dans aucun pilier. */
export function computeFormationOverview(members: readonly CoachMemberView[]): {
  pillars: FormationOverviewPillar[];
  rows: FormationOverviewRow[];
} {
  const byPillar = new Map<number, FormationOverviewPillar>();
  for (const m of members) {
    if (m.formationState === "unavailable" || !m.formation) continue;
    for (const p of m.formation.pillars) {
      const entry = byPillar.get(p.number) ?? { number: p.number, title: p.title, membersDone: 0, membersInProgress: 0, membersNotStarted: 0 };
      if (p.total > 0 && p.done === p.total) entry.membersDone += 1;
      else if (p.done > 0) entry.membersInProgress += 1;
      else entry.membersNotStarted += 1;
      byPillar.set(p.number, entry);
    }
  }
  const rows = sortMembers(members).map((m): FormationOverviewRow => {
    const usable = m.formationState !== "unavailable" && m.formation;
    return {
      id: m.id, pseudo: m.pseudo, avatarUrl: m.avatarUrl, formationState: m.formationState,
      percent: usable ? m.formation!.percent : null,
      nextLesson: usable && m.formation!.current ? { number: m.formation!.current.number, title: m.formation!.current.title } : null,
    };
  });
  return { pillars: [...byPillar.values()].sort((a, b) => a.number - b.number), rows };
}
