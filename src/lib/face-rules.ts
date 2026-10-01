/**
 * Règles de la vérification du selfie, communes au navigateur
 * (face-verification.ts, retour immédiat) et au serveur
 * (face-verification-server.ts, résultat enregistré).
 *
 * Retours de terrain (2026-10-01) : des inscrits ont mis des images générées
 * par IA en photos de profil, se sont filmés, et la vérification est passée.
 * Causes : une seule photo sur trois devait ressembler au selfie, avec un
 * seuil tolérant (0,6). Désormais :
 *  - CHAQUE photo de profil doit montrer un seul visage net et correspondre
 *    au selfie (une seule image IA ou d'une autre personne suffit à échouer) ;
 *  - seuil resserré à 0,5 ;
 *  - preuve de présence : pendant la capture, la personne tourne la tête ; les
 *    images de la rafale doivent montrer le même visage sous des angles
 *    différents (une photo ou un écran tenus devant la caméra ne pivotent pas).
 */

/** Distance maximale (descripteurs face-api / dlib) pour « même personne ». 0,6 = convention, trop tolérant ici. */
export const PHOTO_MATCH_THRESHOLD = 0.5;

/** Rotation de tête minimale entre les images de la rafale (indice de lacet normalisé, voir headYaw). */
export const LIVENESS_MIN_YAW_RANGE = 0.18;
/** Images de la rafale où un visage doit être trouvé. */
export const LIVENESS_MIN_FRAMES = 3;

export function distanceToScore(distance: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - distance / 1.2) * 100)));
}

type Point = { x: number; y: number };

/**
 * Lacet (rotation gauche / droite) estimé à partir des 68 repères faciaux :
 * décalage horizontal du bout du nez (30) par rapport au milieu des coins
 * externes des yeux (36, 45), rapporté à l'écart entre les yeux.
 * ≈ 0 de face, environ ±0,2 à ±0,4 tête tournée.
 */
export function headYaw(points: Point[]): number {
  const nose = points[30];
  const left = points[36];
  const right = points[45];
  if (!nose || !left || !right) return 0;
  const eyeSpan = right.x - left.x;
  if (Math.abs(eyeSpan) < 1) return 0;
  return (nose.x - (left.x + right.x) / 2) / eyeSpan;
}

export type PhotoIssue = "no_face" | "several_faces" | "mismatch" | "unreadable" | null;

export interface PhotoCheck {
  /** Score de correspondance avec le selfie (0–100), 0 si aucun visage. */
  score: number;
  issue: PhotoIssue;
}

export interface LivenessCheck {
  checked: boolean;
  passed: boolean;
  framesWithFace: number;
  yawRange: number;
  reason: string;
}

/** Verdict à partir des contrôles photo par photo et de la preuve de présence. */
export function decide(photos: PhotoCheck[], liveness: LivenessCheck | null): { verified: boolean; score: number; reason: string } {
  if (photos.length === 0) return { verified: false, score: 0, reason: "Aucune photo de profil à comparer." };
  // Le score affiché est celui de la photo la MOINS ressemblante : c'est elle qui compte.
  const score = Math.min(...photos.map((p) => p.score));
  const bad = photos.map((p, i) => ({ ...p, n: i + 1 })).filter((p) => p.issue);
  if (bad.length) {
    const first = bad[0];
    const label =
      first.issue === "no_face" ? `aucun visage net sur la photo ${first.n}`
      : first.issue === "several_faces" ? `plusieurs visages sur la photo ${first.n}`
      : first.issue === "unreadable" ? `la photo ${first.n} n'a pas pu être analysée`
      : `la photo ${first.n} ne correspond pas au selfie`;
    return {
      verified: false,
      score,
      reason: `Vérification échouée : ${label}. Chaque photo de profil doit vous montrer, seul(e), clairement.`,
    };
  }
  if (liveness && liveness.checked && !liveness.passed) {
    return { verified: false, score, reason: `Vérification échouée : ${liveness.reason}` };
  }
  return { verified: true, score, reason: "Vérification réussie : le selfie correspond à chacune des photos." };
}
