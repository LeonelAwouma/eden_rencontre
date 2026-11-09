import { NextRequest } from "next/server";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { findLesson } from "@/lib/formation/batir-sur-le-roc";
import { BATIR_SUR_LE_ROC_EN } from "@/lib/formation/batir-sur-le-roc.en";
import { isAcademieSlug, toCoachLesson } from "@/lib/coach/academie";

/**
 * GET /api/coach/academie/lesson/[slug] — une leçon publiée, pour un coach ACTIF uniquement.
 * Aucun contrôle d'abonnement (un coach n'est pas abonné). Identifiant validé contre la liste blanche : un slug
 * inconnu ou non publié → 404. L'audio est renvoyé sous forme d'adresse de la route de streaming protégée,
 * jamais d'un lien permanent vers le stockage ; ni PDF, ni quiz.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withActiveCoach(req, async () => {
    const { slug } = await params;
    if (!isAcademieSlug(slug)) return coachJson({ error: "Contenu introuvable." }, 404);
    const found = findLesson(slug);
    if (!found) return coachJson({ error: "Contenu introuvable." }, 404);
    // Texte dans la langue demandée (même slug) ; l'audio et sa transcription restent ceux de la leçon française.
    const en = req.nextUrl.searchParams.get("lang") === "en"
      ? BATIR_SUR_LE_ROC_EN.pillars.flatMap((p) => p.lessons).find((l) => l.slug === slug)
      : undefined;
    const shown = en ?? found.lesson;
    const dto = toCoachLesson({ ...shown, audio: found.lesson.audio }, true);
    // Transcription (mot à mot) : propre au texte français ; en anglais, simple lecteur sans surlignage.
    if (en && dto.audio) dto.audio.transcript = null;
    const meta = (l: { slug: string; number: string; title: string } | null) =>
      l ? { slug: l.slug, number: l.number, title: (en ? BATIR_SUR_LE_ROC_EN.pillars.flatMap((p) => p.lessons).find((x) => x.slug === l.slug)?.title : null) ?? l.title } : null;
    return coachJson({
      lesson: dto,
      pillar: { number: found.pillar.number, title: found.pillar.title },
      previous: meta(found.previous),
      next: meta(found.next),
    });
  });
}
