// Algorithme de compatibilité (matching) entre deux membres — 100 % local et déterministe.
// Combine : valeurs/croyances communes, proximité géographique, situation et complétude du profil.

// Type souple acceptant aussi bien EdenUser (string | undefined) que MemberProfile (string | null).
type MatchInput = {
  marriageVision?: string[] | null;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  civilStatus?: string | null;
  gender?: string | null;
  bio?: string | null;
};

export interface MatchResult {
  score: number; // 40 → 99
  reasons: string[];
}

export function computeMatchScore(me: MatchInput, other: MatchInput): MatchResult {
  let score = 50;
  const reasons: string[] = [];

  // 1) Valeurs / croyances communes (poids fort)
  const mine = new Set((me.marriageVision || []).map((v) => String(v)));
  const shared = (other.marriageVision || []).map((v) => String(v)).filter((v) => mine.has(v));
  if (shared.length > 0) {
    score += Math.min(shared.length * 12, 36);
    reasons.push(`${shared.length} valeur${shared.length > 1 ? "s" : ""} en commun`);
  }

  // 2) Proximité géographique
  const eq = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  if (eq(me.city, other.city)) {
    score += 15;
    reasons.push("Même ville");
  } else if (eq(me.country, other.country)) {
    score += 8;
    reasons.push("Même pays");
  } else if (eq(me.region, other.region)) {
    score += 4;
    reasons.push("Même région");
  }

  // 3) Même situation matrimoniale
  if (eq(me.civilStatus, other.civilStatus)) {
    score += 5;
  }

  // 4) Profil soigné (bio renseignée)
  if (other.bio && other.bio.trim().length > 20) score += 5;

  score = Math.max(40, Math.min(99, Math.round(score)));
  return { score, reasons };
}

// Trie une liste de membres par affinité décroissante avec `me`.
export function rankByMatch<T extends MatchInput>(me: MatchInput, members: T[]): T[] {
  return [...members].sort((a, b) => computeMatchScore(me, b).score - computeMatchScore(me, a).score);
}
