import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  REACTIVATION_STEPS, inactiveDays, isUnusableEmail, nextAction, sameInstant, sentRecently,
  type ReactivationStep, type SendRow,
} from "@/lib/member-reactivation-policy";

type Db = ReturnType<typeof getSupabaseAdmin>;

/** Plafond de TENTATIVES par exécution (réussies ou non) : un échec en série ne peut pas inonder le fournisseur. */
export const MAX_ATTEMPTS_PER_RUN = 8;
const PAGE = 200;
const MAX_PAGES = 100;
const OPPOSITION_PAGE = 1000;

type Member = { id: string; email: string | null; name: string | null; pseudo: string | null; last_member_visit_at: string | null };

export interface ReactivationDeps {
  db: Db;
  send: (email: string, name: string, step: ReactivationStep, unsubscribeUrl: string) => Promise<boolean>;
  unsubscribeUrl: (userId: string) => string;
  systemEmail: string;
  now?: () => number;
  maxAttempts?: number;
}
export interface ReactivationResult { eligible: number; attempted: number; sent: number; failed: number; errors: number; perRunLimit: number }

/** Membres opposés aux rappels : lignes `email_opt_in = false` (désinscription). Absence de ligne = inscrit. */
async function loadOpposition(db: Db): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; from < 1_000_000; from += OPPOSITION_PAGE) {
    const { data, error } = await db.from("member_reactivation_preferences").select("user_id")
      .eq("email_opt_in", false).order("user_id", { ascending: true }).range(from, from + OPPOSITION_PAGE - 1);
    if (error) throw error;
    for (const r of data || []) out.add(r.user_id as string);
    if (!data || data.length < OPPOSITION_PAGE) break;
  }
  return out;
}

async function loadPage(db: Db, cutoffIso: string, from: number): Promise<Member[]> {
  const base = (cols: string, memberOnly: boolean) => {
    let q = db.from("profiles").select(cols).eq("status", "approved");
    if (memberOnly) q = q.eq("account_type", "member");
    return q.lte("last_member_visit_at", cutoffIso)
      .order("last_member_visit_at", { ascending: true }).order("id", { ascending: true }).range(from, from + PAGE - 1);
  };
  const r = await base("id,email,name,pseudo,last_member_visit_at", true);
  if (!r.error) return (r.data || []) as unknown as Member[];
  if (r.error.code !== "42703") throw r.error; // colonne account_type absente : seuls des membres existent alors
  const fallback = await base("id,email,name,pseudo,last_member_visit_at", false);
  if (fallback.error) throw fallback.error;
  return (fallback.data || []) as unknown as Member[];
}

export async function runReactivation(deps: ReactivationDeps): Promise<ReactivationResult> {
  const { db, send, unsubscribeUrl, systemEmail } = deps;
  const now = deps.now ?? (() => Date.now());
  const limit = deps.maxAttempts ?? MAX_ATTEMPTS_PER_RUN;
  const res: ReactivationResult = { eligible: 0, attempted: 0, sent: 0, failed: 0, errors: 0, perRunLimit: limit };

  const opposed = await loadOpposition(db);
  const cutoff = new Date(now() - REACTIVATION_STEPS[0] * 86_400_000).toISOString();

  for (let page = 0; page < MAX_PAGES && res.attempted < limit; page++) {
    const members = await loadPage(db, cutoff, page * PAGE);
    if (members.length === 0) break;
    const ids = members.map((m) => m.id);

    // Comptes Coach : jamais de rappel, même si leur profil porte un statut « approved ».
    const { data: coaches, error: coachErr } = await db.from("coach_accounts").select("user_id").in("user_id", ids);
    if (coachErr) throw coachErr;
    const coachIds = new Set((coaches || []).map((c) => c.user_id as string));

    const { data: sends, error: sendsErr } = await db.from("member_reactivation_sends")
      .select("user_id,inactive_since,step_days,status,claimed_at,sent_at,attempts").in("user_id", ids);
    if (sendsErr) throw sendsErr;
    const byUser = new Map<string, SendRow[]>();
    for (const s of (sends || []) as unknown as SendRow[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

    for (const m of members) {
      if (res.attempted >= limit) break;
      if (opposed.has(m.id) || coachIds.has(m.id) || isUnusableEmail(m.email, systemEmail)) continue;
      const since = m.last_member_visit_at;
      const days = inactiveDays(since, now());
      if (days === null) continue;
      const all = byUser.get(m.id) ?? [];
      const action = nextAction(days, all.filter((r) => sameInstant(r.inactive_since, since)), now());
      if (!action) continue;
      res.eligible++;
      if (sentRecently(all, now())) continue;
      try {
        await attempt(deps, m, since as string, action, res);
      } catch (err) {
        res.errors++; // une erreur sur un membre n'arrête jamais les autres
        console.error("[reactivation] membre ignoré", m.id, err);
      }
    }
    if (members.length < PAGE) break;
  }
  return res;
}

async function attempt(
  deps: ReactivationDeps, m: Member, since: string,
  action: Exclude<ReturnType<typeof nextAction>, null>, res: ReactivationResult,
) {
  const { db, send, unsubscribeUrl } = deps;
  const now = deps.now ?? (() => Date.now());
  const nowIso = new Date(now()).toISOString();
  const key = { user_id: m.id, inactive_since: since, step_days: action.step };

  // ── Prise en charge ATOMIQUE : jamais deux exécutions simultanées sur le même (membre, cycle, palier). ──
  if (action.mode === "new") {
    const { error } = await db.from("member_reactivation_sends").insert({ ...key, status: "claimed", claimed_at: nowIso, attempts: 1 });
    if (error) {
      if (error.code === "23505") return; // une autre exécution l'a prise juste avant
      throw error;
    }
  } else {
    // Reprise d'un échec / d'une prise en charge périmée : mise à jour conditionnelle (compare-and-swap sur
    // statut + tentative + date de prise en charge). Une seule exécution obtient la ligne.
    const prev = action.row;
    const { data, error } = await db.from("member_reactivation_sends")
      .update({ status: "claimed", claimed_at: nowIso, attempts: (prev.attempts ?? 1) + 1 })
      .eq("user_id", m.id).eq("inactive_since", prev.inactive_since).eq("step_days", action.step)
      .eq("status", prev.status).eq("claimed_at", prev.claimed_at).eq("attempts", prev.attempts ?? 1)
      .select("user_id");
    if (error) throw error;
    if (!data || data.length === 0) return; // déjà reprise par une autre exécution
  }
  res.attempted++;

  const settle = (ok: boolean) => db.from("member_reactivation_sends")
    .update({ status: ok ? "sent" : "failed", sent_at: ok ? new Date(now()).toISOString() : null })
    .eq("user_id", m.id).eq("inactive_since", since).eq("step_days", action.step);

  // ── Dernier contrôle avant envoi : opposition, statut ou visite survenus pendant l'exécution. ──
  const [{ data: pref }, { data: fresh }] = await Promise.all([
    db.from("member_reactivation_preferences").select("email_opt_in").eq("user_id", m.id).maybeSingle(),
    db.from("profiles").select("status,last_member_visit_at").eq("id", m.id).maybeSingle(),
  ]);
  if (pref?.email_opt_in === false || fresh?.status !== "approved" || !sameInstant(fresh?.last_member_visit_at as string | null, since)) {
    await settle(false); // ni envoyé ni compté comme échec d'envoi : le membre s'est opposé ou est revenu
    return;
  }

  let ok = false;
  try {
    ok = await send(m.email as string, m.pseudo || m.name || "Membre", action.step, unsubscribeUrl(m.id));
  } catch (err) {
    console.error("[reactivation] envoi en erreur", m.id, err);
  }
  await settle(ok);
  if (ok) res.sent++; else res.failed++;
}
