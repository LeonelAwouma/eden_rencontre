/**
 * Eden Connexion — Intelligent Rule-Based Communication Protection Engine
 * Text Normalization Engine
 * Multi-layer normalization: Unicode, emoji, homoglyphs, leetspeak, obfuscation,
 * number reconstruction, number word conversion, character standardization, tokenization
 */

import type { NormalizedText, SupportedLanguage, ModerationConfig } from "./types";

// ═══════════════════════════════════════════════════════════════
// REGEX CACHE — prevents recompilation on every message
// ═══════════════════════════════════════════════════════════════
const regexCache = new Map<string, RegExp>();

function cachedRegex(pattern: string, flags = "gi"): RegExp {
  const key = `${pattern}::${flags}`;
  if (!regexCache.has(key)) {
    regexCache.set(key, new RegExp(pattern, flags));
  }
  return regexCache.get(key)!;
}

// ═══════════════════════════════════════════════════════════════
// MAIN NORMALIZATION PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Full normalization pipeline — run before any detection.
 * Stages:
 *   1.  Trim
 *   2.  Unicode NFKD normalization
 *   3.  Remove zero-width & invisible characters
 *   4.  Emoji digit normalization (0️⃣ → 0)
 *   5.  Superscript/subscript digit normalization
 *   6.  Fullwidth → ASCII normalization
 *   7.  Homoglyph normalization (Cyrillic/Greek → Latin)
 *   8.  Accented character normalization (where appropriate)
 *   9.  Number word conversion (multilingual)
 *   10. Leetspeak normalization
 *   11. Punctuation/separator removal
 *   12. Whitespace collapse
 *   13. Lowercase
 *   14. Number reconstruction from fragmented input
 *   15. Aggressive normalization (digits-only)
 *   16. Digit extraction
 *   17. Tokenization
 *   18. Language detection
 */
export function normalizeText(input: string, config?: ModerationConfig): NormalizedText {
  const transformations: string[] = [];
  let text = input;

  // ── Stage 1: Trim ──
  text = text.trim();

  // ── Stage 2: Unicode NFKD normalization ──
  text = text.normalize("NFKD");
  transformations.push("unicode_nfd");

  // ── Stage 3: Remove zero-width and invisible Unicode characters ──
  const beforeZW = text;
  text = text.replace(
    /[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2060-\u2064\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\uFE00-\uFE0F]/g,
    ""
  );
  if (text !== beforeZW) transformations.push("zero_width_removed");

  // ── Stage 4: Emoji digit normalization (0️⃣ → 0) ──
  const emojiMap = config?.emojiDigitMap ?? DEFAULT_EMOJI_DIGIT_MAP;
  let prev = text;
  for (let i = 0; i < emojiMap.length; i++) {
    text = text.split(emojiMap[i]).join(String(i));
  }
  if (text !== prev) transformations.push("emoji_digits_normalized");

  // ── Stage 5: Superscript/subscript digit normalization ──
  const supers = config?.superscriptDigits ?? DEFAULT_SUPERSCRIPT_DIGITS;
  const subs = config?.subscriptDigits ?? DEFAULT_SUBSCRIPT_DIGITS;
  prev = text;
  for (const [super_, digit] of Object.entries(supers)) {
    text = text.split(super_).join(digit);
  }
  for (const [sub_, digit] of Object.entries(subs)) {
    text = text.split(sub_).join(digit);
  }
  if (text !== prev) transformations.push("super_sub_digits_normalized");

  // ── Stage 6: Fullwidth → ASCII ──
  const fullwidthChars = "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９";
  const asciiChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  prev = text;
  for (let i = 0; i < fullwidthChars.length; i++) {
    text = text.split(fullwidthChars[i]).join(asciiChars[i]);
  }
  if (text !== prev) transformations.push("fullwidth_normalized");

  // ── Stage 7: Homoglyph normalization (Cyrillic/Greek → Latin) ──
  const hg = config?.homoglyphMap ?? DEFAULT_HOMOGLYPH_MAP;
  prev = text;
  for (const [fake, real] of Object.entries(hg)) {
    text = text.split(fake).join(real);
  }
  if (text !== prev) transformations.push("homoglyphs_normalized");

  // ── Stage 8: Accented character normalization ──
  // NFKD already decomposes; strip combining marks for detection
  // but keep a version with accents for keyword matching
  prev = text;
  text = text.replace(/[\u0300-\u036f]/g, "");
  if (text !== prev) transformations.push("accents_stripped");

  // ── Stage 9: Number word conversion (multilingual) ──
  const dictionaries = config?.numberWordDictionaries ?? DEFAULT_NUMBER_WORD_DICTIONARIES;
  prev = text;
  for (const lang of Object.values(dictionaries)) {
    for (let i = 0; i < lang.length; i++) {
      const word = lang[i];
      if (!word || word.length < 2) continue;
      try {
        const regex = cachedRegex(`\\b${escapeRegex(word)}\\b`, "gi");
        text = text.replace(regex, String(i));
      } catch { /* skip invalid regex */ }
    }
  }
  if (text !== prev) transformations.push("digit_words_converted");

  // ── Stage 10: Leetspeak normalization ──
  const leetMap = config?.leetMap ?? DEFAULT_LEET_MAP;
  const leetKeys = Object.keys(leetMap);
  prev = text;
  if (leetKeys.length > 0) {
    // Apply leet only when surrounded by letters (avoid corrupting pure numbers)
    try {
      const leetPattern = new RegExp(
        `(?<=[a-zA-Z])[${leetKeys.map(escapeRegex).join("")}](?=[a-zA-Z])|^[${leetKeys.map(escapeRegex).join("")}](?=[a-zA-Z])|(?<=[a-zA-Z])[${leetKeys.map(escapeRegex).join("")}]$`,
        "g"
      );
      text = text.replace(leetPattern, (ch) => leetMap[ch] || ch);
    } catch { /* skip */ }
  }
  if (text !== prev) transformations.push("leetspeak_normalized");

  // ── Stage 11: Remove punctuation separators ──
  // This helps detect phone numbers like "6.9.8.1.2.3" or "6-98-12-34"
  let separatorsRemoved = text.replace(/[.\-_,;:!?'"(){}\[\]\/\\|~`@#$%^&*+=<>]/g, " ");
  transformations.push("punctuation_removed");

  // ── Stage 12: Collapse multiple spaces/tabs/newlines ──
  text = text.replace(/[\s\t\n\r]+/g, " ");
  separatorsRemoved = separatorsRemoved.replace(/[\s\t\n\r]+/g, " ");
  transformations.push("whitespace_normalized");

  // ── Stage 13: Lowercase ──
  const normalized = text.toLowerCase();
  const cleanText = normalized.trim();

  // ── Stage 14: Number reconstruction from fragmented input ──
  // Catches "6 9 8 1 2 3" → "698123", "6-98-12" → "69812"
  const reconstructedNumbers = reconstructNumbers(separatorsRemoved.toLowerCase());
  if (reconstructedNumbers.length > 0) transformations.push("numbers_reconstructed");

  // ── Stage 15: Aggressively normalized text (all separators removed, digits + letters) ──
  const aggressivelyNormalized = separatorsRemoved.toLowerCase().replace(/\s/g, "");

  // ── Stage 16: Extract all digits from original input ──
  const digits = input.replace(/\D/g, "");

  // ── Stage 17: Tokenization ──
  const tokens = tokenize(cleanText);

  // ── Stage 18: Language detection ──
  const language = detectLanguage(input);

  return {
    original: input,
    normalized,
    cleanText,
    separatorsRemoved: separatorsRemoved.toLowerCase(),
    digits,
    aggressivelyNormalized,
    reconstructedNumbers,
    tokens,
    language,
    transformations,
  };
}

// ═══════════════════════════════════════════════════════════════
// NUMBER RECONSTRUCTION ALGORITHM
// ═══════════════════════════════════════════════════════════════

/**
 * Reconstruct fragmented numbers from text.
 * Examples:
 *   "6 9 8 1 2 3" → ["698123"]
 *   "6-98-12" → ["69812"]
 *   "6.9.8.1" → ["6981"]
 *   "(237) 698 12 34" → ["2376981234"]
 */
export function reconstructNumbers(text: string): string[] {
  const results: string[] = [];

  // Method 1: Find sequences of single digits separated by spaces/dots/dashes
  // Pattern: 2+ single digits separated by non-alphanumeric chars
  const singleDigitPattern = /\b(\d(?:[\s.\-_:,]\d){7,14})\b/g;
  let m: RegExpExecArray | null;
  while ((m = singleDigitPattern.exec(text)) !== null) {
    const reconstructed = m[0].replace(/[\s.\-_:,]/g, "");
    if (reconstructed.length >= 8 && reconstructed.length <= 15) {
      results.push(reconstructed);
    }
  }

  // Method 2: Find digit groups separated by spaces/dots/dashes
  // Pattern: 2-5 digit groups separated by non-alphanumeric chars, total 8-15 digits
  const groupPattern = /\b(\d{1,5}(?:[\s.\-_:,]\d{1,5}){1,7})\b/g;
  while ((m = groupPattern.exec(text)) !== null) {
    const reconstructed = m[0].replace(/[\s.\-_:,]/g, "");
    if (reconstructed.length >= 8 && reconstructed.length <= 15) {
      // Avoid duplicates with Method 1
      if (!results.includes(reconstructed)) {
        results.push(reconstructed);
      }
    }
  }

  // Method 3: Parenthesized area code + digits
  // Pattern: (237) 698 12 34 → 2376981234
  const parenPattern = /\((\d{1,5})\)\s*(\d[\s.\-_:,\d]*\d)/g;
  while ((m = parenPattern.exec(text)) !== null) {
    const areaCode = m[1];
    const rest = m[2].replace(/[\s.\-_:,]/g, "");
    const full = areaCode + rest;
    if (full.length >= 8 && full.length <= 15) {
      if (!results.includes(full)) {
        results.push(full);
      }
    }
  }

  return [...new Set(results)];
}

// ═══════════════════════════════════════════════════════════════
// TOKENIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Split text into meaningful tokens (words, digit sequences, punctuation).
 */
export function tokenize(text: string): string[] {
  // Split on whitespace and punctuation, keep digit sequences together
  const raw = text.split(/[\s]+/).filter(t => t.length > 0);
  // Further split tokens that mix letters and digits with separators
  const tokens: string[] = [];
  for (const token of raw) {
    // Split on remaining punctuation but keep meaningful parts
    const parts = token.split(/[.\-_,;:!?'"(){}\[\]\/\\|~`@]+/).filter(p => p.length > 0);
    tokens.push(...parts);
  }
  return tokens;
}

// ═══════════════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect the language of a message based on common words.
 * Simple heuristic — deterministic, no ML.
 */
export function detectLanguage(text: string): SupportedLanguage {
  const lower = text.toLowerCase();

  const markers: Record<SupportedLanguage, string[]> = {
    fr: ["je", "tu", "il", "nous", "vous", "elle", "les", "des", "une", "est", "sont", "avec", "pour", "dans", "sur", "pas", "que", "qui", "mais", "mon", "ton", "son", "notre", "votre", "leur", "très", "bien", "aussi", "comment", "salut", "bonjour", "merci"],
    en: ["the", "and", "you", "that", "was", "for", "are", "but", "not", "with", "this", "have", "from", "they", "been", "said", "each", "which", "their", "will", "other", "about", "hello", "thanks", "please"],
    es: ["que", "por", "con", "una", "para", "como", "pero", "más", "este", "está", "también", "tiene", "puede", "todo", "bien", "hola", "gracias", "por favor"],
    pt: ["que", "por", "com", "uma", "para", "como", "mas", "mais", "este", "está", "também", "tem", "pode", "tudo", "bem", "olá", "obrigado", "por favor"],
    de: ["der", "die", "und", "ist", "nicht", "ein", "eine", "auf", "mit", "sich", "auch", "ich", "wir", "ihr", "aber", "wie", "von", "hallo", "danke", "bitte"],
    it: ["che", "per", "con", "una", "sono", "come", "non", "più", "questo", "anche", "tutto", "bene", "ciao", "grazie", "favore"],
    ar: [],
    unknown: [],
  };

  let bestLang: SupportedLanguage = "unknown";
  let bestScore = 0;

  // Arabic detection by character range
  const arabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (arabicChars.test(text)) {
    return "ar";
  }

  // Count word matches per language
  const words = lower.split(/[\s.,;:!?]+/).filter(w => w.length > 0);
  for (const [lang, markerWords] of Object.entries(markers)) {
    if (lang === "ar" || lang === "unknown") continue;
    let score = 0;
    for (const word of words) {
      if (markerWords.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang as SupportedLanguage;
    }
  }

  // Need at least 2 marker words to confidently detect
  return bestScore >= 2 ? bestLang : "unknown";
}

// ═══════════════════════════════════════════════════════════════
// WHITELIST CHECK
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a detection match position overlaps with a whitelisted pattern.
 * Used to avoid blocking Bible references, dates, postal codes, etc.
 */
export function isWhitelisted(
  text: string,
  matchStart: number,
  matchEnd: number,
  whitelistPatterns: string[]
): boolean {
  for (const pattern of whitelistPatterns) {
    try {
      const regex = cachedRegex(pattern, "gi");
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const wStart = m.index;
        const wEnd = wStart + m[0].length;
        // If there's any overlap, consider it whitelisted
        if (wStart < matchEnd && wEnd > matchStart) return true;
      }
    } catch {
      // Skip invalid regex patterns
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// PHONE CANDIDATE EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract potential phone number sequences from normalized text.
 * Returns arrays of digit sequences that could be phone numbers.
 */
export function extractPhoneCandidates(text: string): string[] {
  const candidates: string[] = [];

  // Method 1: Continuous digit sequences of 8-15 length
  const continuousDigits = text.match(/\d{8,15}/g);
  if (continuousDigits) {
    candidates.push(...continuousDigits);
  }

  // Method 2: Digit groups separated by spaces/dots/dashes
  const groupedDigits = text.match(/(?:\d[\s.\-/]?){7,15}\d/g);
  if (groupedDigits) {
    for (const group of groupedDigits) {
      const digits = group.replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15) {
        candidates.push(digits);
      }
    }
  }

  // Deduplicate
  return [...new Set(candidates)];
}

// ═══════════════════════════════════════════════════════════════
// CHARACTER SUBSTITUTION DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply character substitution map to text for detection purposes.
 * Maps visual substitutions: O→0, I→1, S→5, B→8, @→at, etc.
 */
export function applyCharacterSubstitutions(
  text: string,
  substitutions: Record<string, string>
): string {
  let result = text;
  for (const [from, to] of Object.entries(substitutions)) {
    result = result.split(from).join(to);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// NUMBER WORD TO DIGIT CONVERSION
// ═══════════════════════════════════════════════════════════════

/**
 * Convert written numbers in text to digits.
 * Supports multiple languages through configurable dictionaries.
 */
export function convertNumberWords(
  text: string,
  dictionaries: Record<string, string[]>
): string {
  let result = text;
  for (const lang of Object.values(dictionaries)) {
    for (let i = 0; i < lang.length; i++) {
      const word = lang[i];
      if (!word || word.length < 2) continue;
      try {
        const regex = cachedRegex(`\\b${escapeRegex(word)}\\b`, "gi");
        result = result.replace(regex, String(i));
      } catch { /* skip */ }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT MAPS (fallback when config not provided)
// ═══════════════════════════════════════════════════════════════

const DEFAULT_EMOJI_DIGIT_MAP = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

const DEFAULT_SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

const DEFAULT_SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};

const DEFAULT_HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic → Latin
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O",
  "Р": "P", "С": "C", "Т": "T", "У": "Y", "Х": "X",
  // Greek → Latin
  "α": "a", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p",
  "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
  "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
  // Fullwidth → ASCII
  "０": "0", "１": "1", "２": "2", "３": "3", "４": "4", "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
};

const DEFAULT_LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
};

const DEFAULT_NUMBER_WORD_DICTIONARIES: Record<string, string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  fr: ["zéro", "zero", "un", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"],
  es: ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"],
  pt: ["zero", "um", "dois", "três", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove"],
  de: ["null", "eins", "zwei", "drei", "vier", "fünf", "funf", "sechs", "sieben", "acht", "neun"],
  it: ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"],
};