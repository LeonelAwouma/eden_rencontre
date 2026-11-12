import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, requireAdmin, type AdminSession } from "@/lib/admin-auth";
import { clientIp } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { avatarStoragePath, checkAvatarFile, removeAvatarFile, replaceCoachAvatar } from "@/lib/coach/avatar";

/**
 * Remplacement / retrait de la photo d'un coach PAR L'ADMINISTRATEUR (cookie de session admin) : cette route, qui
 * désigne sa cible par l'URL, n'est ouverte à aucun coach ni membre. Un coach change SA propre photo par
 * PUT /api/coach/profile/avatar (cible = sa session). La cible doit être un coach.
 * L'ancien fichier n'est supprimé qu'après l'enregistrement réussi de la nouvelle URL.
 */
const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

async function adminSession(): Promise<AdminSession | null> {
  try { return await requireAdmin(); } catch { return null; }
}

async function audit(admin: AdminSession, req: NextRequest, action: string, id: string, details?: Record<string, unknown>) {
  try { await logAdminAction(admin.adminId, admin.email, action, "user", id, details, clientIp(req)); } catch { /* non bloquant */ }
}

async function targetCoach(db: ReturnType<typeof getSupabaseAdmin>, id: string) {
  const [account, profile] = await Promise.all([
    db.from("coach_accounts").select("user_id").eq("user_id", id).maybeSingle(),
    db.from("profiles").select("account_type,avatar_url").eq("id", id).maybeSingle(),
  ]);
  if (account.error || profile.error || !account.data || !profile.data) return null;
  if ((profile.data as { account_type: string | null }).account_type !== "coach") return null;
  return { avatarUrl: (profile.data as { avatar_url: string | null }).avatar_url };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminSession();
  if (!admin) return json({ error: "Non autorisé" }, 401);
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Paramètres invalides" }, 400);

  const form = await req.formData().catch(() => null);
  const check = await checkAvatarFile(form?.get("photo"));
  if (!check.ok) return json({ error: check.message, code: check.code }, check.code === "avatar_too_large" ? 413 : 400);

  const db = getSupabaseAdmin();
  const coach = await targetCoach(db, id);
  if (!coach) return json({ error: "Coach introuvable" }, 404);

  // Séquence partagée avec la route du coach : dépôt, enregistrement, puis seulement suppression de l'ancien fichier.
  const replaced = await replaceCoachAvatar(db, id, check, coach.avatarUrl);
  if (!replaced.ok) return json({ error: replaced.message, code: replaced.code }, 500);
  await audit(admin, req, "coach_avatar_updated", id);
  return json({ id, avatar_url: replaced.url });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminSession();
  if (!admin) return json({ error: "Non autorisé" }, 401);
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Paramètres invalides" }, 400);

  const db = getSupabaseAdmin();
  const coach = await targetCoach(db, id);
  if (!coach) return json({ error: "Coach introuvable" }, 404);

  const { error } = await db.from("profiles").update({ avatar_url: null }).eq("id", id);
  if (error) return json({ error: "Suppression de la photo impossible." }, 500);
  await removeAvatarFile(db, avatarStoragePath(coach.avatarUrl));
  await audit(admin, req, "coach_avatar_removed", id);
  return json({ id, avatar_url: null });
}
