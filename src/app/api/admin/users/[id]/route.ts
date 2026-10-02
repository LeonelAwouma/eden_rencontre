import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveMediaUrl, resolveMediaUrls, isMediaPath, deleteMedia } from "@/lib/registration-media";
import { clientIp } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { id } = await params;

    const { data: user, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    // Selfie et photos d'inscription : chemins du stockage privé → liens signés (1 h) pour l'affichage.
    const [selfieUrl, profilePhotos] = await Promise.all([
      resolveMediaUrl(db, user.selfie_url),
      resolveMediaUrls(db, user.profile_photos),
    ]);
    return NextResponse.json({ user: { ...user, selfie_url: selfieUrl, profile_photos: profilePhotos } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin user detail API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id — supprime définitivement un membre : son compte
 * de connexion (le profil et ses données liées suivent par cascade) et ses
 * photos d'inscription privées. Fonctionne aussi pour un compte sans profil.
 *
 * Remplace la suppression d'une ligne dans l'éditeur de Supabase, qui laissait
 * le compte de connexion en place et ne laissait aucune trace dans le journal.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const db = getSupabaseAdmin();
  const { id } = await params;

  const [{ data: profile }, { data: authData }] = await Promise.all([
    db.from("profiles").select("email, name, pseudo, status, selfie_url, profile_photos").eq("id", id).maybeSingle(),
    db.auth.admin.getUserById(id),
  ]);
  const authUser = authData?.user ?? null;
  if (!profile && !authUser) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const email = profile?.email || authUser?.email || "";
  // Comptes techniques (messagerie de l'admin…) : jamais supprimés d'ici.
  if (/\.local$/i.test(email)) return NextResponse.json({ error: "Compte technique : suppression impossible." }, { status: 400 });

  // Photos d'inscription (stockage privé) : chemins enregistrés dans le profil.
  const media = [profile?.selfie_url, ...(Array.isArray(profile?.profile_photos) ? profile.profile_photos : [])].filter(isMediaPath);

  if (authUser) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) {
      console.error("[admin/users DELETE] suppression du compte impossible:", error.message);
      return NextResponse.json({ error: `Suppression impossible : ${error.message}` }, { status: 500 });
    }
  }
  // Profil sans compte de connexion, ou cascade absente : on supprime la fiche explicitement.
  await db.from("profiles").delete().eq("id", id);
  await deleteMedia(db, media);

  try {
    await logAdminAction(admin.adminId, admin.email, "user_deleted", "user", id,
      { user_email: email, user_name: profile?.name || null, pseudo: profile?.pseudo || null, status: profile?.status || "sans profil" },
      clientIp(request));
  } catch { /* non bloquant */ }

  return NextResponse.json({ ok: true });
}
