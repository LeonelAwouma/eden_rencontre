import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, requireAdmin, type AdminSession } from "@/lib/admin-auth";
import { clientIp } from "@/lib/api-auth";
import { generateTemporaryPassword } from "@/lib/coach-password";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { mapAssignmentError } from "@/lib/coach/assignment-errors";
import { restoreCoachSessions, revokeCoachSessions } from "@/lib/coach/lifecycle";
import { checkAvatarFile, removeAvatarFile, uploadCoachAvatar, type AvatarCheck } from "@/lib/coach/avatar";
import { classifyCreateUserError, failure, sanitizedDiagnostic, type AuthErrorInfo } from "@/lib/coach/create-user-errors";

/**
 * Gestion administrative des comptes Coach. Toutes les opérations exigent une session admin.
 *
 * Un coach = trois enregistrements qui doivent TOUJOURS concorder :
 *   auth.users  +  coach_accounts (active, display_name)  +  profiles (account_type='coach', status).
 * Chaque écriture vérifie le résultat et annule ce qu'elle a déjà fait en cas d'échec partiel.
 * Aucun mot de passe n'est jamais écrit dans les journaux.
 */

type Db = ReturnType<typeof getSupabaseAdmin>;
const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_ACTIONS_PER_HOUR = 20;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

async function adminSession(): Promise<AdminSession | null> {
  try { return await requireAdmin(); } catch { return null; }
}

/** Journal d'audit : ne bloque jamais l'opération, ne reçoit jamais de secret. */
async function audit(admin: AdminSession, req: NextRequest, action: string, targetId: string, details?: Record<string, unknown>) {
  try {
    await logAdminAction(admin.adminId, admin.email, action, "user", targetId, details, clientIp(req));
  } catch { /* non bloquant */ }
}

async function underLimit(admin: AdminSession, kind: string): Promise<boolean> {
  const key = `admin-coach:${admin.adminId || admin.email}`;
  return checkRateLimit(key, kind, MAX_ACTIONS_PER_HOUR, 3600);
}
const countAction = (admin: AdminSession, kind: string) => recordRateLimit(`admin-coach:${admin.adminId || admin.email}`, kind);

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

interface CoachState {
  account: { user_id: string; email: string; display_name: string; active: boolean };
  profile: { status: string | null; account_type: string | null } | null;
}

/**
 * Lit le coach ciblé. Renvoie null si la cible n'est PAS un coach (jamais de modification d'un membre
 * ou d'un administrateur par cette route) ou si la lecture échoue.
 */
async function loadCoach(db: Db, id: string): Promise<CoachState | null> {
  const [account, profile] = await Promise.all([
    db.from("coach_accounts").select("user_id,email,display_name,active").eq("user_id", id).maybeSingle(),
    db.from("profiles").select("status,account_type").eq("id", id).maybeSingle(),
  ]);
  if (account.error || profile.error || !account.data) return null;
  // Un profil existant qui n'est pas un coach (membre portant une ligne coach_accounts parasite) : on n'y touche pas.
  if (profile.data && profile.data.account_type !== "coach") return null;
  return { account: account.data as CoachState["account"], profile: profile.data as CoachState["profile"] };
}

export async function GET() {
  if (!(await adminSession())) return json({ error: "Non autorisé" }, 401);
  const db = getSupabaseAdmin();
  let res = await db.from("coach_accounts")
    .select("user_id,email,display_name,active,created_at,last_login_at").order("created_at", { ascending: false });
  if (res.error && (res.error as { code?: string }).code === "42703") {
    // last_login_at absente : migration 20261107_coach_hardening.sql pas encore exécutée.
    res = await db.from("coach_accounts")
      .select("user_id,email,display_name,active,created_at").order("created_at", { ascending: false }) as typeof res;
  }
  if (res.error) return json({ error: "Impossible de consulter les coachs" }, 500);
  const rows = (res.data || []) as Array<{ user_id: string }>;
  // Photos : lues dans profiles (source de vérité de l'avatar). Une lecture en échec n'empêche pas la liste.
  const avatars = new Map<string, string | null>();
  if (rows.length > 0) {
    const { data: profs } = await db.from("profiles").select("id,avatar_url").in("id", rows.map(r => r.user_id));
    for (const p of (profs || []) as Array<{ id: string; avatar_url: string | null }>) avatars.set(p.id, p.avatar_url);
  }
  return json({ coaches: rows.map(r => ({ ...r, avatar_url: avatars.get(r.user_id) ?? null })) });
}

export async function POST(req: NextRequest) {
  const admin = await adminSession();
  if (!admin) return json({ error: "Non autorisé" }, 401);
  // JSON (réinitialisation, création sans photo) ou multipart (création avec photo facultative).
  const isMultipart = (req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data");
  let body: Record<string, unknown> | null = null;
  let photo: unknown = null;
  if (isMultipart) {
    const form = await req.formData().catch(() => null);
    if (form) {
      body = {
        email: form.get("email"), password: form.get("password"), name: form.get("name"),
      };
      const file = form.get("photo");
      if (file && typeof file === "object") photo = file;
    }
  } else {
    body = await req.json().catch(() => null);
  }

  if (body?.action === "reset_password") return resetPassword(admin, req, body.id);

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Coach";
  // La photo est contrôlée AVANT toute création : une image refusée ne laisse aucun compte à moitié créé.
  let avatar: Extract<AvatarCheck, { ok: true }> | null = null;
  if (photo) {
    const check = await checkAvatarFile(photo);
    if (!check.ok) return json({ error: check.message, code: check.code }, check.code === "avatar_too_large" ? 413 : 400);
    avatar = check;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length > 100
    || password.length < 12 || password.length > 128 || !/\d/.test(password) || !/[A-Za-z]/.test(password)) {
    return json({ error: "Adresse e-mail et mot de passe de 12 caractères minimum (lettres et chiffres) requis." }, 400);
  }
  if (!(await underLimit(admin, "coach_create"))) return json({ error: "Trop de créations. Réessayez plus tard." }, 429);
  await countAction(admin, "coach_create");

  // Exceptions (variable d'environnement absente, réseau) : jamais de trace ni de valeur dans la réponse.
  let db: Db;
  try { db = getSupabaseAdmin(); } catch {
    console.error("[admin/coaches] configuration Supabase incomplète", { apiCode: "server_misconfigured" });
    const f = failure("server_misconfigured");
    return json({ error: f.message, code: f.code }, f.status);
  }
  let created: Awaited<ReturnType<Db["auth"]["admin"]["createUser"]>>["data"] | null = null;
  let createError: AuthErrorInfo | null = null;
  try {
    const res = await db.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name, account_type: "coach" },
    });
    created = res.data;
    createError = (res.error as AuthErrorInfo | null) ?? null;
  } catch (thrown) {
    createError = { name: thrown instanceof Error ? thrown.name : undefined, code: "unexpected_failure" };
  }
  if (createError || !created?.user) {
    // Cause réelle rendue visible à l'administrateur par un CODE stable et un message sûr ; le message brut de
    // Supabase n'est ni renvoyé ni journalisé (il peut contenir des données personnelles). Journal : code, nom, statut.
    const f = classifyCreateUserError(createError);
    console.error("[admin/coaches] createUser refusé :", sanitizedDiagnostic(createError, f.code));
    return json({ error: f.message, code: f.code }, f.status);
  }
  const id = created.user.id;

  let uploadedPath: string | null = null;
  // Annule TOUT ce qui a été créé (le profil part en cascade avec l'utilisateur Auth), fichier de photo compris.
  const rollback = async () => {
    await removeAvatarFile(db, uploadedPath);
    try { await db.from("coach_accounts").delete().eq("user_id", id); } catch { /* best effort */ }
    try { await db.auth.admin.deleteUser(id); } catch { /* best effort */ }
  };

  const { error: coachError } = await db.from("coach_accounts").insert({ user_id: id, email, display_name: name, active: true });
  if (coachError) { await rollback(); return json({ error: "Impossible de définir le rôle Coach." }, 500); }

  // Upsert : le déclencheur d'inscription a peut-être déjà créé un profil, ou pas encore.
  const { error: profileError } = await db.from("profiles")
    .upsert({ id, email, name, status: "approved", account_type: "coach" }, { onConflict: "id" });
  if (profileError) { await rollback(); return json({ error: "Impossible d'isoler le compte Coach." }, 500); }

  // Photo : envoi puis enregistrement de l'URL. Un échec annule tout (compte + fichier), jamais de compte partiel.
  let avatarUrl: string | null = null;
  if (avatar) {
    const up = await uploadCoachAvatar(db, id, avatar);
    if (!up) { await rollback(); return json({ error: "Envoi de la photo impossible, création annulée.", code: "avatar_upload_failed" }, 500); }
    uploadedPath = up.path;
    const { error: avatarError } = await db.from("profiles").update({ avatar_url: up.url }).eq("id", id);
    if (avatarError) { await rollback(); return json({ error: "Enregistrement de la photo impossible, création annulée.", code: "avatar_save_failed" }, 500); }
    avatarUrl = up.url;
  }

  // Relecture : on ne déclare le succès qu'après avoir constaté la cohérence des trois sources.
  const state = await loadCoach(db, id);
  if (!state || !state.profile || state.profile.account_type !== "coach" || state.profile.status !== "approved" || state.account.active !== true) {
    await rollback();
    return json({ error: "Création incohérente, opération annulée." }, 500);
  }

  await audit(admin, req, "coach_created", id, { email, name, with_photo: !!avatarUrl });
  return json({ id, email, name, active: true, avatar_url: avatarUrl }, 201);
}

async function resetPassword(admin: AdminSession, req: NextRequest, id: unknown) {
  if (!isUuid(id)) return json({ error: "Paramètres invalides" }, 400);
  if (!(await underLimit(admin, "coach_reset"))) return json({ error: "Trop de réinitialisations. Réessayez plus tard." }, 429);
  const db = getSupabaseAdmin();
  const coach = await loadCoach(db, id);
  if (!coach) return json({ error: "Coach introuvable" }, 404);
  await countAction(admin, "coach_reset");

  const password = generateTemporaryPassword();
  const { error } = await db.auth.admin.updateUserById(id, { password });
  if (error) return json({ error: "Réinitialisation impossible." }, 500); // jamais de mot de passe dans une réponse d'échec

  await audit(admin, req, "coach_password_reset", id, { email: coach.account.email }); // ni mot de passe ni jeton
  return json({ id, password });
}

export async function PATCH(req: NextRequest) {
  const admin = await adminSession();
  if (!admin) return json({ error: "Non autorisé" }, 401);
  const body = await req.json().catch(() => null);
  if (!isUuid(body?.id)) return json({ error: "Paramètres invalides" }, 400);
  const id = body.id as string;
  const hasName = typeof body?.name === "string";
  const hasActive = typeof body?.active === "boolean";
  if (hasName === hasActive) return json({ error: "Paramètres invalides" }, 400);

  const db = getSupabaseAdmin();
  const coach = await loadCoach(db, id);
  if (!coach) return json({ error: "Coach introuvable ou modification impossible" }, 404);

  if (hasName) {
    const name = (body.name as string).trim();
    if (!name || name.length > 100) return json({ error: "Nom invalide (1 à 100 caractères)." }, 400);
    const previous = coach.account.display_name;
    const { error: accountError } = await db.from("coach_accounts")
      .update({ display_name: name, updated_at: new Date().toISOString() }).eq("user_id", id);
    if (accountError) return json({ error: "Modification impossible" }, 500);
    const { error: profileError } = await db.from("profiles").update({ name }).eq("id", id);
    if (profileError) {
      await db.from("coach_accounts").update({ display_name: previous }).eq("user_id", id);
      return json({ error: "Statut de profil incohérent, modification annulée." }, 500);
    }
    // Métadonnées Auth : utiles à l'affichage ; leur échec ne remet pas en cause la cohérence des tables.
    try { await db.auth.admin.updateUserById(id, { user_metadata: { name, account_type: "coach" } }); } catch { /* non bloquant */ }
    await audit(admin, req, "coach_updated", id, { from: previous, to: name });
    return json({ coach: { user_id: id, display_name: name } });
  }

  const active = body.active as boolean;
  if (!coach.profile) return json({ error: "Profil du coach introuvable : intervention nécessaire." }, 409);

  // Une seule transaction PostgreSQL : coach_accounts, profiles, fin des attributions, audit.
  // Toute erreur annule l'ensemble : aucun état intermédiaire possible.
  const { data: result, error } = await db.rpc("coach_set_active", {
    p_coach: id, p_active: active, p_admin: admin.email || admin.adminId || "admin",
  });
  if (error) {
    const failure = mapAssignmentError(error);
    return json({ error: failure.message, code: failure.code }, failure.status);
  }

  // Après validation de la transaction (accès déjà refusé en base) : sessions.
  // Un échec de révocation ne rétablit rien : il est journalisé et signalé dans Pannes.
  let sessionsRevoked: boolean | undefined;
  let sessionsRestored: boolean | undefined;
  if (active) sessionsRestored = await restoreCoachSessions(db, id);
  else sessionsRevoked = await revokeCoachSessions(db, id, admin.email || admin.adminId || "admin");

  await audit(admin, req, active ? "coach_reactivated" : "coach_suspended", id, {
    email: coach.account.email,
    assignments_ended: (result as { assignments_ended?: number } | null)?.assignments_ended ?? 0,
  });
  return json({
    coach: { user_id: id, active },
    assignments_ended: (result as { assignments_ended?: number } | null)?.assignments_ended ?? 0,
    ...(sessionsRevoked === false ? { warning: "sessions_not_revoked" } : {}),
    ...(sessionsRestored === false ? { warning: "sessions_not_restored" } : {}),
  });
}

export async function DELETE(req: NextRequest) {
  const admin = await adminSession();
  if (!admin) return json({ error: "Non autorisé" }, 401);
  const body = await req.json().catch(() => null);
  if (!isUuid(body?.id)) return json({ error: "Paramètres invalides" }, 400);
  const id = body.id as string;

  const db = getSupabaseAdmin();
  const coach = await loadCoach(db, id); // refuse tout compte qui n'est pas un coach
  if (!coach) return json({ error: "Coach introuvable" }, 404);

  // Un coach qui a un historique d'accompagnements n'est pas supprimé : l'historique doit être conservé
  // (la base le refuse aussi : clé étrangère RESTRICT). On le suspend à la place. Erreur de lecture : refus.
  const { count: historyCount, error: historyError } = await db.from("coach_member_assignments")
    .select("id", { count: "exact", head: true }).eq("coach_id", id);
  if (historyError) return json({ error: "Vérification de l'historique impossible, suppression refusée." }, 500);
  if ((historyCount ?? 0) > 0) {
    return json({ error: "Ce coach a un historique d'accompagnements : suspendez-le plutôt que de le supprimer, afin de conserver les dossiers.", code: "coach_has_history" }, 409);
  }

  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return json({ error: "Suppression impossible." }, 500);

  // Les lignes liées partent normalement en cascade ; on le vérifie et on complète si besoin.
  await db.from("coach_accounts").delete().eq("user_id", id);
  const { data: remaining } = await db.from("coach_accounts").select("user_id").eq("user_id", id).maybeSingle();
  if (remaining) return json({ error: "Compte supprimé mais nettoyage incomplet, intervention nécessaire." }, 500);

  await audit(admin, req, "coach_deleted", id, { email: coach.account.email, name: coach.account.display_name });
  return json({ deleted: true });
}
