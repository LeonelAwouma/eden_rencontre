// Contrôle de santé des comptes — côté serveur uniquement.
//
// Né de l'incident du 2026-10-03 : un membre approuvé ne pouvait plus entrer,
// sans que personne le sache, parce qu'une image encodée (data URI) gonflait
// son jeton de session. Ce module repère ce type d'anomalie avant qu'un membre
// n'en souffre, et sait la réparer. Utilisé par :
//   - la tâche quotidienne /api/cron/account-health (alerte l'admin) ;
//   - Admin → Utilisateurs → À traiter (« Lancer le contrôle », « Réparer »).
//
// La migration 20261003_account_guards.sql empêche ces anomalies au niveau de
// la base ; ce contrôle couvre ce qui existait avant et tout cas imprévu.

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { publishAvatarFromDataUri } from "@/lib/registration-media";
import { verifySmtp } from "@/lib/email";

type Db = ReturnType<typeof getSupabaseAdmin>;

/** Au-delà, les métadonnées alourdissent dangereusement le jeton de session (refus à ~8 Ko d'en-tête). */
export const METADATA_ALERT_CHARS = 4000;
/** Une valeur de métadonnée plus longue que ceci n'a rien à y faire. */
const VALUE_MAX_CHARS = 2000;
const PENDING_ALERT_DAYS = 7;

const isTechnical = (email: unknown) => typeof email !== "string" || !email || /\.local$/i.test(email);
const badValue = (v: unknown) => {
  const text = typeof v === "string" ? v : JSON.stringify(v ?? null);
  return (typeof v === "string" && v.startsWith("data:")) || text.length > VALUE_MAX_CHARS;
};

export interface AccountAnomaly {
  id: string;
  email: string;
  /** Ce qui ne va pas, en clair. */
  problems: string[];
  /** Réparable automatiquement (« Réparer »). */
  repairable: boolean;
}

export interface HealthReport {
  checked_at: string;
  anomalies: AccountAnomaly[];
  orphans: number;
  pendingOld: number;
  smtp: { ok: boolean; error: string | null };
}

export async function scanAccounts(db: Db, { checkEmail = true } = {}): Promise<HealthReport> {
  const [authRes, { data: profiles }] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("profiles").select("id, email, status, avatar_url, created_at"),
  ]);
  const users = authRes.data?.users || [];
  const rows = (profiles || []) as { id: string; email: string | null; status: string | null; avatar_url: string | null; created_at: string | null }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const anomalies = new Map<string, AccountAnomaly>();
  const flag = (id: string, email: string, problem: string) => {
    const a = anomalies.get(id) || { id, email, problems: [], repairable: true };
    a.problems.push(problem);
    anomalies.set(id, a);
  };

  for (const u of users) {
    const meta = (u.user_metadata || {}) as Record<string, unknown>;
    const size = JSON.stringify(meta).length;
    const bad = Object.keys(meta).filter((k) => badValue(meta[k]));
    if (size > METADATA_ALERT_CHARS || bad.length) {
      flag(u.id, u.email || "", `métadonnées de session trop lourdes (${size.toLocaleString("fr-FR")} caractères${bad.length ? ` ; champ(s) en cause : ${bad.join(", ")}` : ""}) — le membre risque de ne plus pouvoir entrer`);
    }
  }
  for (const p of rows) {
    if (isTechnical(p.email)) continue;
    if (typeof p.avatar_url === "string" && (p.avatar_url.startsWith("data:") || p.avatar_url.length > VALUE_MAX_CHARS)) {
      flag(p.id, p.email || "", "photo de profil enregistrée comme image encodée au lieu d'un fichier");
    }
  }

  const ids = new Set(rows.map((r) => r.id));
  const orphans = users.filter((u) => !ids.has(u.id) && !isTechnical(u.email)).length;
  const cutoff = Date.now() - PENDING_ALERT_DAYS * 86_400_000;
  const pendingOld = rows.filter((r) => r.status === "pending" && !isTechnical(r.email) && r.created_at && new Date(r.created_at).getTime() < cutoff).length;
  const smtp = checkEmail ? await verifySmtp() : { ok: true, error: null };

  // Le profil sans compte de connexion n'est pas « réparable » par ce biais.
  for (const a of anomalies.values()) if (!byId.has(a.id) && !users.some((u) => u.id === a.id)) a.repairable = false;

  return { checked_at: new Date().toISOString(), anomalies: [...anomalies.values()], orphans, pendingOld, smtp };
}

/**
 * Répare un compte : avatar encodé → fichier dans le stockage public des
 * avatars (adresse reportée dans le profil et la session) ; toute autre valeur
 * encodée ou trop longue est retirée des métadonnées de session. Rien n'est
 * perdu côté profil : seules les métadonnées (copie de session) sont allégées.
 */
export async function repairAccount(db: Db, id: string): Promise<{ ok: boolean; actions: string[]; error?: string }> {
  const actions: string[] = [];
  const [{ data: profile }, { data: authData }] = await Promise.all([
    db.from("profiles").select("avatar_url").eq("id", id).maybeSingle(),
    db.auth.admin.getUserById(id),
  ]);

  // 1. Avatar encodé dans le profil (ou, à défaut, dans la session) → fichier.
  let avatarUrl: string | null = typeof profile?.avatar_url === "string" ? profile.avatar_url : null;
  const metaAvatar = authData?.user?.user_metadata?.avatar_url;
  const encoded = avatarUrl?.startsWith("data:") ? avatarUrl : typeof metaAvatar === "string" && metaAvatar.startsWith("data:") ? metaAvatar : null;
  if (encoded) {
    const url = await publishAvatarFromDataUri(db, encoded);
    if (!url) return { ok: false, actions, error: "Dépôt de la photo dans le stockage impossible (format non reconnu ou stockage indisponible)." };
    avatarUrl = url;
    if (profile) {
      const { error } = await db.from("profiles").update({ avatar_url: url }).eq("id", id);
      if (error) return { ok: false, actions, error: `Profil : ${error.message}` };
    }
    actions.push("photo de profil déposée dans le stockage");
  } else if (avatarUrl && avatarUrl.length > VALUE_MAX_CHARS) {
    await db.from("profiles").update({ avatar_url: null }).eq("id", id);
    avatarUrl = null;
    actions.push("adresse de photo anormale retirée du profil");
  }

  // 2. Métadonnées de session : plus aucune valeur encodée ni trop longue.
  const user = authData?.user;
  if (user) {
    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (k === "avatar_url" && (badValue(v) || (encoded && v === encoded))) patch[k] = avatarUrl && !badValue(avatarUrl) ? avatarUrl : null;
      else if (badValue(v)) patch[k] = null; // null = clé retirée par Supabase
    }
    if (Object.keys(patch).length) {
      const { error } = await db.auth.admin.updateUserById(id, { user_metadata: patch });
      if (error) return { ok: false, actions, error: `Session : ${error.message}` };
      actions.push(`métadonnées de session allégées (${Object.keys(patch).join(", ")})`);
    }
  }
  return { ok: true, actions };
}
