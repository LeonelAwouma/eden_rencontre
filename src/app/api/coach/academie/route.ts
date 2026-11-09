import { NextRequest } from "next/server";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { BATIR_SUR_LE_ROC } from "@/lib/formation/batir-sur-le-roc";
import { lessonMatches } from "@/lib/coach/academie";

/**
 * GET /api/coach/academie?q= — catalogue de l'Académie du Mariage pour un coach ACTIF (garde `withActiveCoach` :
 * compte coach, profil approuvé, coach_accounts.active). Léger : titres et présence d'audio, jamais le corps des
 * leçons ni un chemin de fichier. Source unique : le catalogue « Bâtir sur le roc » (aucune copie, aucune médiathèque).
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async () => {
    const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 80);
    const pillars = BATIR_SUR_LE_ROC.pillars
      .filter((p) => p.lessons.length > 0) // piliers en préparation : non publiés
      .map((p) => ({
        number: p.number,
        lessons: p.lessons
          .filter((l) => lessonMatches(l, q))
          .map((l) => ({ slug: l.slug, number: l.number, title: l.title, hasAudio: !!l.audio, readingMinutes: l.readingMinutes })),
      }))
      .filter((p) => p.lessons.length > 0);
    return coachJson({ pillars });
  });
}
