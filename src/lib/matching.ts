// Algorithme de compatibilité (matching) entre deux membres — 100 % local et déterministe.
// Combine : valeurs/croyances communes, proximité géographique, situation et complétude du profil,
// ainsi que les réponses au questionnaire d'onboarding (âge souhaité, langues, convictions, style de
// vie, niveau d'études, non négociables de fin de questionnaire) quand elles sont disponibles pour
// les deux personnes.

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

// Questions "non négociables" de fin de questionnaire (texte libre, cf. src/lib/onboarding.ts,
// section "limites" + les deux champs qui reprennent explicitement ce terme). Comme ce sont des
// réponses en texte libre, on ne peut pas détecter un "refus" de façon fiable (négation, ironie…) :
// on se limite donc à un signal positif — les mots-clés significatifs qui reviennent des DEUX côtés
// dans ce que chacun décrit comme non négociable. Jamais de pénalité sur la base de ce texte libre.
const NON_NEGOTIABLE_KEYS = ["criteresSpirituels", "limitesSpirituelles", "limitesComportementales", "limitesRelationnelles", "criteresMatching"];

const STOPWORDS = new Set([
  "avec", "sans", "pour", "dans", "sur", "sous", "chez", "vers", "entre", "avant", "après", "apres",
  "être", "etre", "avoir", "fait", "faire", "cela", "ceci", "comme", "tout", "tous", "toute", "toutes",
  "ainsi", "donc", "mais", "plus", "moins", "très", "tres", "plutot", "plutôt", "beaucoup", "peu",
  "mon", "mes", "notre", "nos", "votre", "vos", "leur", "leurs", "cette", "ces", "quelque", "quelques",
  "qui", "que", "quoi", "dont", "leurs", "elle", "elles", "nous", "vous", "ils", "être", "sont", "était",
  "etait", "seront", "sera", "peut", "peux", "pouvoir", "veux", "veut", "vouloir", "doit", "dois", "devoir",
  "important", "importante", "importants", "importantes", "surtout", "aussi", "encore", "toujours", "jamais",
]);

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function extractKeywords(text: string): Set<string> {
  const normalized = text
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return new Set(words);
}

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
  const myLangs = new Set((Array.isArray(myQ.langues) ? myQ.langues : []).map(String));
  const sharedLangs = (Array.isArray(otherQ.langues) ? otherQ.langues : []).map(String).filter((l) => myLangs.has(l));
  if (sharedLangs.length > 0) {
    score += Math.min(sharedLangs.length * 4, 8);
    reasons.push(`${sharedLangs.length} langue${sharedLangs.length > 1 ? "s" : ""} en commun`);
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

  // 9) Même niveau d'études
  if (myQ.niveauEtudes && otherQ.niveauEtudes && eq(String(myQ.niveauEtudes), String(otherQ.niveauEtudes))) {
    score += 4;
  }

  // 10) Non négociables (fin du questionnaire) — écho de vocabulaire entre ce que chacun décrit
  // comme non négociable (valeurs spirituelles, comportements inacceptables, limites relationnelles,
  // critères de matching). Signal uniquement positif : on ne pénalise jamais sur du texte libre.
  const myNonNeg = extractKeywords(NON_NEGOTIABLE_KEYS.map((k) => (typeof myQ[k] === "string" ? myQ[k] : "")).join(" "));
  const otherNonNeg = extractKeywords(NON_NEGOTIABLE_KEYS.map((k) => (typeof otherQ[k] === "string" ? otherQ[k] : "")).join(" "));
  if (myNonNeg.size > 0 && otherNonNeg.size > 0) {
    let sharedNonNeg = 0;
    myNonNeg.forEach((w) => { if (otherNonNeg.has(w)) sharedNonNeg++; });
    if (sharedNonNeg > 0) {
      score += Math.min(sharedNonNeg * 3, 15);
      reasons.push("Valeurs non négociables en écho");
    }
  }

  score = Math.max(40, Math.min(99, Math.round(score)));
  return { score, reasons };
}

// Trie une liste de membres par affinité décroissante avec `me`.
export function rankByMatch<T extends MatchInput>(me: MatchInput, members: T[]): T[] {
  return [...members].sort((a, b) => computeMatchScore(me, b).score - computeMatchScore(me, a).score);
}
