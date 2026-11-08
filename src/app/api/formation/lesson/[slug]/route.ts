/**
 * GET /api/formation/lesson/[slug] — contenu complet d'une leçon, résolu
 * côté serveur après vérification de l'abonnement effectif. Même schéma
 * d'authentification que /api/profile/photos (Authorization: Bearer,
 * getApprovedUser) — ce dépôt n'a pas de session lisible en cookies côté
 * serveur (src/lib/supabase.ts), donc aucune autre mécanique n'est inventée.
 *
 * Pilier 1 : toujours autorisé (gratuit par la mission), fichiers publics
 * inchangés (public/formation/batir-sur-le-roc/...). Piliers 2+ : autorisés
 * tant que `commercial_restrictions_enabled=false` (comportement actuel
 * préservé) ; une fois activé, `hasFeatureAccess` décide réellement — en cas
 * de refus, la réponse ne contient NI le texte NI aucune URL d'actif protégé.
 *
 * Câblage réel : src/app/dashboard/academie/batir-sur-le-roc/[lecon]/page.tsx
 * (coquille) + src/components/formation/lesson-page-client.tsx (composant
 * client qui appelle cette route) sont désormais branchés sur cette route —
 * plus aucun import direct du contenu complet dans un fichier "use client"
 * pour la page de leçon elle-même (limitation restante : voir le bilan de
 * livraison pour useFormationLocale/ui.ts, qui sert d'autres besoins
 * d'internationalisation côté client et n'a pas été refondu ici).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getMemberOrCoach } from "@/lib/api-auth";
import { findLesson } from "@/lib/formation/batir-sur-le-roc";
import { pillarOfLesson } from "@/lib/formation/structure";
import { hasFeatureAccess } from "@/lib/subscription/effective";
import { getFormationAssetUrl, FORMATION_PUBLIC_BASE } from "@/lib/formation/media";
import type { Lesson } from "@/lib/formation/types";

/**
 * Réécrit les actifs protégés (image pleine taille, audio, PDF) d'une leçon
 * en URL signées quand ils ont été migrés vers le bucket privé
 * `formation-media` — la vignette/carte reste toujours publique (simple
 * aperçu de catalogue, jamais protégée). Pour le pilier 1 (toujours gratuit)
 * ou tant qu'un actif n'a pas encore été migré, le chemin public actuel est
 * conservé tel quel (comportement inchangé).
 */
async function resolveLessonAssets(db: ReturnType<typeof getSupabaseAdmin>, lesson: Lesson, userId: string, pillarNumber: number): Promise<Lesson> {
  if (pillarNumber <= 1) return lesson;
  const toStoragePath = (publicPath: string) => (publicPath.startsWith(FORMATION_PUBLIC_BASE) ? publicPath.slice(FORMATION_PUBLIC_BASE.length + 1) : null);
  const resolve = async (publicPath: string | undefined) => {
    if (!publicPath) return publicPath;
    const storagePath = toStoragePath(publicPath);
    if (!storagePath) return publicPath;
    const signed = await getFormationAssetUrl(db, storagePath, { userId, lessonSlug: lesson.slug });
    return signed ?? publicPath; // pas encore migré : chemin public actuel conservé
  };
  const [imageSrc, audioSrc, transcript, pdf] = await Promise.all([
    resolve(lesson.image.src), resolve(lesson.audio?.src), resolve(lesson.audio?.transcript), resolve(lesson.pdf),
  ]);
  return {
    ...lesson,
    image: { ...lesson.image, src: imageSrc ?? lesson.image.src },
    audio: lesson.audio ? { ...lesson.audio, src: audioSrc ?? lesson.audio.src, transcript: transcript ?? lesson.audio.transcript } : lesson.audio,
    pdf: pdf ?? lesson.pdf,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getMemberOrCoach(request);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const { slug } = await params;
  const found = findLesson(slug);
  if (!found) return NextResponse.json({ error: "Leçon introuvable." }, { status: 404 });

  const db = getSupabaseAdmin();
  const pillarNumber = pillarOfLesson(slug) ?? found.pillar.number;

  if (pillarNumber > 1) {
    const allowed = await hasFeatureAccess(db, user.id, "all_formations");
    if (!allowed) {
      return NextResponse.json({ locked: true, pillar: pillarNumber, requiredTier: "elite" });
    }
  }

  // Pilier 1 (ou accès autorisé) : contenu complet. Seuls les actifs réellement
  // migrés vers le bucket privé formation-media sont réécrits en URL signées —
  // tant qu'un fichier n'est pas migré, son chemin public actuel est conservé
  // (zéro régression pendant la migration progressive).
  const lesson = await resolveLessonAssets(db, found.lesson, user.id, pillarNumber);
  return NextResponse.json({
    locked: false,
    lesson,
    pillar: found.pillar,
    previous: found.previous,
    next: found.next,
  });
}
