// Algorithme de compatibilité (matching) entre deux membres — 100 % local et déterministe.
// Combine : valeurs/croyances communes, proximité géographique, situation et complétude du profil,
// ainsi que les réponses au questionnaire d'onboarding (âge souhaité, langues, convictions, style de
// vie, non négociables de fin de questionnaire) quand elles sont disponibles pour les deux personnes.

// Type souple acceptant aussi bien EdenUser (string | undefined) que MemberProfile (string | null).
type MatchInput = {
  marriageVision?: string[] | null;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  civilStatus?: string | null;
  gender?: string | null;
  bio?: string | null;
  birthDate?: string | null;
  questionnaire?: Record<string, any> | null;
};

export interface MatchResult {
  score: number; // 40 → 99
  reasons: string[];
}

function ageFrom(iso?: string | null): number | null {
  if (!iso) return null;
  const b = new Date(iso);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const eq = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

// Nombre d'éléments communs entre deux listes à choix multiples (ex: valeurs, langues).
function overlapCount(a: unknown, b: unknown): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map(String));
  return b.map(String).filter((v) => setA.has(v)).length;
}

// La tranche d'âge du questionnaire ("trancheAge") est saisie sous la forme { min, max }.
function hasAgePref(range: any): boolean {
  return !!range && typeof range === "object" && (range.min !== "" && range.min != null || range.max !== "" && range.max != null);
}
function inAgeRange(age: number | null, range: any): boolean {
  if (age == null || !hasAgePref(range)) return true;
  const min = Number(range.min);
  const max = Number(range.max);
  if (Number.isFinite(min) && age < min) return false;
  if (Number.isFinite(max) && age > max) return false;
  return true;
}

// Réponses QCM (convictions spirituelles) — champ à champ, comparées telles quelles.
const QCM_KEYS = ["qcmDecision", "qcmPeche", "qcmMature", "qcmTentations"];
// Choix simples liés au style de vie / attentes du couple.
const LIFESTYLE_KEYS = ["rythme", "organisation", "financesCouple", "enfants"];

export function computeMatchScore(me: MatchInput, other: MatchInput): MatchResult {
  let score = 50;
  const reasons: string[] = [];
  const myQ = me.questionnaire || {};
  const otherQ = other.questionnaire || {};

  // 1) Valeurs / croyances communes (poids fort)
  const mine = new Set((me.marriageVision || []).map((v) => String(v)));
  const shared = (other.marriageVision || []).map((v) => String(v)).filter((v) => mine.has(v));
  if (shared.length > 0) {
    score += Math.min(shared.length * 12, 36);
    reasons.push(`${shared.length} valeur${shared.length > 1 ? "s" : ""} en commun`);
  }

  // 2) Proximité géographique
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

  // 5) Tranche d'âge souhaitée (réciproque, questionnaire "trancheAge")
  if (hasAgePref(myQ.trancheAge) || hasAgePref(otherQ.trancheAge)) {
    const myAge = ageFrom(me.birthDate);
    const otherAge = ageFrom(other.birthDate);
    const myWantsOtherAge = inAgeRange(otherAge, myQ.trancheAge);
    const otherWantsMyAge = inAgeRange(myAge, otherQ.trancheAge);
    if (myWantsOtherAge && otherWantsMyAge) {
      score += 10;
      reasons.push("Dans la tranche d'âge souhaitée");
    } else {
      score -= 10;
    }
  }

  // 6) Langues parlées en commun
  const sharedLangs = overlapCount(myQ.langues, otherQ.langues);
  if (sharedLangs > 0) {
    score += Math.min(sharedLangs * 4, 8);
    reasons.push(`${sharedLangs} langue${sharedLangs > 1 ? "s" : ""} en commun`);
  }

  // 7) Convictions spirituelles alignées (mêmes réponses aux QCM)
  const sharedQcm = QCM_KEYS.filter((k) => myQ[k] && otherQ[k] && myQ[k] === otherQ[k]).length;
  if (sharedQcm > 0) {
    score += Math.min(sharedQcm * 3, 12);
    reasons.push("Convictions spirituelles alignées");
  }

  // 8) Style de vie compatible (rythme, organisation, finances, désir d'enfants)
  const sharedLifestyle = LIFESTYLE_KEYS.filter((k) => myQ[k] && otherQ[k] && eq(String(myQ[k]), String(otherQ[k]))).length;
  if (sharedLifestyle > 0) {
    score += Math.min(sharedLifestyle * 4, 16);
    reasons.push("Style de vie compatible");
  }

  // 9) Non négociables (fin du questionnaire) — désormais des choix structurés (cf. src/lib/onboarding.ts,
  // section "limites" + "criteresSpirituels"), donc comparables de façon fiable plutôt que par mots-clés.

  // 9a) Valeurs spirituelles non négociables partagées par les deux
  const sharedSpiritualValues = overlapCount(myQ.limitesSpirituelles, otherQ.limitesSpirituelles);
  if (sharedSpiritualValues > 0) {
    score += Math.min(sharedSpiritualValues * 4, 16);
    reasons.push("Valeurs non négociables communes");
  }

  // 9b) Ce que je recherche chez un(e) partenaire correspond à ce que l'autre tient pour non négociable
  // chez lui/elle-même (et réciproquement) — signal de compatibilité, jamais de pénalité en l'absence.
  const meetsMyCriteria = overlapCount(myQ.criteresSpirituels, otherQ.limitesSpirituelles);
  const meetsOtherCriteria = overlapCount(otherQ.criteresSpirituels, myQ.limitesSpirituelles);
  if (meetsMyCriteria > 0 || meetsOtherCriteria > 0) {
    score += Math.min((meetsMyCriteria + meetsOtherCriteria) * 3, 14);
    reasons.push("Répond aux critères spirituels recherchés");
  }

  // 9c) Mêmes limites comportementales (ce que chacun juge inacceptable) — un vrai signal d'alignement
  // de valeurs, même si l'algorithme ne peut pas vérifier le comportement réel de l'autre.
  const sharedDealbreakers = overlapCount(myQ.limitesComportementales, otherQ.limitesComportementales);
  if (sharedDealbreakers > 0) {
    score += Math.min(sharedDealbreakers * 3, 12);
    reasons.push("Mêmes comportements jugés inacceptables");
  }

  // 9d) Mêmes limites relationnelles avant le mariage (choix unique)
  if (myQ.limitesRelationnelles && otherQ.limitesRelationnelles && eq(String(myQ.limitesRelationnelles), String(otherQ.limitesRelationnelles))) {
    score += 6;
    reasons.push("Mêmes limites avant le mariage");
  }

  score = Math.max(40, Math.min(99, Math.round(score)));
  return { score, reasons };
}

// Trie une liste de membres par affinité décroissante avec `me`.
export function rankByMatch<T extends MatchInput>(me: MatchInput, members: T[]): T[] {
  return [...members].sort((a, b) => computeMatchScore(me, b).score - computeMatchScore(me, a).score);
}
