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
 * Infrastructure disponible et testée ; son câblage dans l'interface de
 * lecture (src/components/formation/lesson-reader.tsx, actuellement un
 * composant client qui importe directement le contenu complet) reste à
 * terminer — voir le bilan de livraison pour le détail de cette limitation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { findLesson } from "@/lib/formation/batir-sur-le-roc";
import { pillarOfLesson } from "@/lib/formation/structure";
import { hasFeatureAccess } from "@/lib/subscription/effective";
import { getFormationAssetUrl } from "@/lib/formation/media";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getApprovedUser(request);
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

  // Pilier 1 (ou accès autorisé) : contenu complet. Les actifs restent sur
  // leur chemin public actuel tant qu'ils n'ont pas été migrés vers le
  // bucket privé formation-media — getFormationAssetUrl ne s'applique qu'aux
  // chemins déjà migrés (voir supabase/migrations/20261105_formation_media_bucket.sql).
  return NextResponse.json({
    locked: false,
    lesson: found.lesson,
    pillar: found.pillar,
    previous: found.previous,
    next: found.next,
  });
}
