// Alignement entre le texte d'une leçon et sa version audio, pour surligner chaque mot au
// moment où il est prononcé.
//
// L'audio est transcrit une fois pour toutes (reconnaissance vocale avec l'instant de début et de fin
// de chaque mot) ; ce module met cette transcription en correspondance avec les mots réellement
// affichés dans la leçon. La correspondance est faite dans le navigateur, sur le texte à l'écran :
// une correction de texte (faute de frappe, mot changé) ne casse donc pas la synchronisation, et
// aucun fichier d'alignement ne doit être régénéré.
//
// Code pur (aucune dépendance au navigateur) : testé aussi en ligne de commande.

/** Transcription de l'audio : un mot reconnu, son début et sa fin (secondes). */
export interface SpeechTranscript {
  /** Durée de l'audio. */
  d: number;
  /** Mots reconnus. */
  w: string[];
  /** Début de chaque mot. */
  s: number[];
  /** Fin de chaque mot. */
  e: number[];
}

export interface SpeechAlignment {
  /** Instant (secondes) où chaque mot du texte commence ; croissant. */
  starts: number[];
  /** Nombre de mots du texte retrouvés dans l'audio (identiques ou presque). */
  matched: number;
  /** Nombre de mots du texte. */
  total: number;
}

/** Mot réduit à l'essentiel pour la comparaison : minuscules, sans accents ni ponctuation. */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]/g, "");
}

/** Distance d'édition (Levenshtein), bornée : au-delà de `max`, renvoie max + 1. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const MATCH = 5;      // mots identiques
const NEAR = 2;       // mots proches (accord, élision, faute de reconnaissance)
const MISMATCH = -3;  // mots différents mis face à face (moins cher que deux trous)
const GAP = -2;       // mot du texte absent de l'audio, ou mot de l'audio absent du texte

function pairScore(a: string, b: string): number {
  if (!a || !b) return MISMATCH;
  if (a === b) return MATCH;
  const shortest = Math.min(a.length, b.length);
  if (shortest >= 4 && editDistance(a, b, Math.max(1, Math.floor(shortest / 4))) <= Math.max(1, Math.floor(shortest / 4))) return NEAR;
  // Un mot collé à son voisin d'un côté et pas de l'autre (« lamour » / « amour »).
  if (shortest >= 4 && (a.endsWith(b) || b.endsWith(a))) return NEAR;
  return MISMATCH;
}

/**
 * Aligne les mots du texte sur ceux de la transcription (programmation dynamique de type
 * Needleman-Wunsch), puis donne un instant de début à CHAQUE mot du texte : ceux retrouvés dans
 * l'audio prennent l'instant reconnu, les autres sont répartis entre leurs voisins.
 */
export function alignSpeech(textWords: string[], transcript: SpeechTranscript): SpeechAlignment {
  const a = textWords.map(normalizeWord);
  const b = transcript.w.map(normalizeWord);
  const n = a.length, m = b.length;
  const total = n;
  if (n === 0 || m === 0) return { starts: new Array(n).fill(0), matched: 0, total };

  const W = m + 1;
  const score = new Int32Array((n + 1) * W);
  const trace = new Uint8Array((n + 1) * W); // 1 = diagonale, 2 = mot du texte sauté, 3 = mot de l'audio sauté
  for (let i = 1; i <= n; i++) { score[i * W] = i * GAP; trace[i * W] = 2; }
  for (let j = 1; j <= m; j++) { score[j] = j * GAP; trace[j] = 3; }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = score[(i - 1) * W + j - 1] + pairScore(a[i - 1], b[j - 1]);
      const up = score[(i - 1) * W + j] + GAP;
      const left = score[i * W + j - 1] + GAP;
      let best = diag, dir = 1;
      if (up > best) { best = up; dir = 2; }
      if (left > best) { best = left; dir = 3; }
      score[i * W + j] = best;
      trace[i * W + j] = dir;
    }
  }

  // Remontée : pour chaque mot du texte, le mot de l'audio qui lui fait face (ou -1).
  const partner = new Int32Array(n).fill(-1);
  let quality = new Uint8Array(n); // 2 = identique, 1 = proche, 0 = différent
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const dir = trace[i * W + j];
    if (i > 0 && j > 0 && dir === 1) {
      partner[i - 1] = j - 1;
      const s = pairScore(a[i - 1], b[j - 1]);
      quality[i - 1] = s === MATCH ? 2 : s === NEAR ? 1 : 0;
      i--; j--;
    } else if (i > 0 && (dir === 2 || j === 0)) i--;
    else j--;
  }

  // Instants connus : mots identiques ou proches uniquement (un face-à-face « différent » reste une estimation).
  const known = new Array<boolean>(n).fill(false);
  const starts = new Array<number>(n).fill(NaN);
  const ends = new Array<number>(n).fill(NaN);
  let matched = 0;
  for (let i = 0; i < n; i++) {
    if (partner[i] >= 0 && quality[i] > 0) {
      known[i] = true;
      starts[i] = transcript.s[partner[i]];
      ends[i] = transcript.e[partner[i]];
      matched++;
    }
  }
  // Les instants reconnus doivent croître : un recul isolé (erreur d'horodatage) est écarté.
  let last = -Infinity;
  for (let i = 0; i < n; i++) {
    if (!known[i]) continue;
    if (starts[i] < last) { known[i] = false; matched--; } else last = starts[i];
  }

  // Mots non retrouvés : répartis entre les mots connus voisins, au prorata de leur longueur.
  const weight = (i: number) => Math.max(1, a[i].length) + 1;
  let i = 0;
  while (i < n) {
    if (known[i]) { i++; continue; }
    let j = i;
    while (j < n && !known[j]) j++;
    const prevEnd = i > 0 ? Math.max(ends[i - 1], starts[i - 1]) : null;
    const nextStart = j < n ? starts[j] : null;
    const count = j - i;
    let from: number, to: number;
    if (prevEnd !== null && nextStart !== null) { from = prevEnd; to = Math.max(prevEnd, nextStart); }
    else if (nextStart !== null) { to = nextStart; from = Math.max(0, to - count * 0.32); }
    else if (prevEnd !== null) { from = prevEnd; to = Math.min(transcript.d, from + count * 0.32); }
    else { from = 0; to = transcript.d; }
    let sum = 0;
    for (let k = i; k < j; k++) sum += weight(k);
    let acc = 0;
    for (let k = i; k < j; k++) { starts[k] = from + ((to - from) * acc) / sum; acc += weight(k); }
    i = j;
  }

  // Croissant, au centième de seconde.
  let prev = 0;
  for (let k = 0; k < n; k++) {
    prev = Math.max(prev, starts[k]);
    starts[k] = Math.round(prev * 100) / 100;
  }
  return { starts, matched, total };
}

/** Indice du dernier mot commencé à l'instant t (-1 avant le premier). Recherche dichotomique. */
export function wordAt(starts: number[], t: number): number {
  let lo = 0, hi = starts.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
