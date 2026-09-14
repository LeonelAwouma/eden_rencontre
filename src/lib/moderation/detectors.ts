/**
 * GARDEN OF ALLIANCE — Intelligent Rule-Based Communication Protection Engine
 * Detection Engine — phone, email, URL, keyword, obfuscation, move-off-platform, username
 * All detectors are plugin-based, configurable, and run independently.
 * Results are merged by the pipeline orchestrator.
 */

import type {
  DetectionMatch,
  NormalizedText,
  DetectionResult,
  ViolationType,
  ModerationConfig,
  DetectionPlugin,
  KeywordRule,
  PatternRule,
} from "./types";
import { isWhitelisted, extractPhoneCandidates, reconstructNumbers } from "./normalizer";

// ═══════════════════════════════════════════════════════════════
// COMPILED REGEX CACHE — prevents recompilation on every message
// ═══════════════════════════════════════════════════════════════
const regexCache = new Map<string, RegExp>();

function getRegex(pattern: string, flags = "gi"): RegExp {
  const key = `${pattern}::${flags}`;
  if (!regexCache.has(key)) {
    try {
      regexCache.set(key, new RegExp(pattern, flags));
    } catch {
      // Return a regex that never matches
      return /(?!.)/;
    }
  }
  return regexCache.get(key)!;
}

// ═══════════════════════════════════════════════════════════════
// 1. PHONE NUMBER DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectPhoneNumbers(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const { normalized, digits, aggressivelyNormalized, reconstructedNumbers } = norm;

  // Skip if total digits too short
  if (digits.length < 8) return matches;

  // ── Method 1: Regex patterns from configurable PatternRule list ──
  const phonePatterns = config.patterns.filter(
    p => p.enabled && p.violationType === "PHONE_NUMBER"
  );

  for (const patternRule of phonePatterns) {
    try {
      const regex = getRegex(patternRule.pattern);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(normalized)) !== null) {
        const matched = m[0];
        const extractedDigits = matched.replace(/\D/g, "");
        if (extractedDigits.length >= 8 && extractedDigits.length <= 15) {
          if (!isWhitelisted(norm.original, m.index, m.index + matched.length, config.whitelistedPatterns)) {
            matches.push({
              type: "PHONE_NUMBER",
              match: matched,
              position: { start: m.index, end: m.index + matched.length },
              confidence: patternRule.confidence,
              severity: patternRule.severity,
              ruleId: patternRule.id,
            });
          }
        }
      }
    } catch { /* skip invalid regex */ }
  }

  // ── Method 2: Reconstructed numbers from fragmented input ──
  for (const candidate of reconstructedNumbers) {
    const alreadyFound = matches.some(m => {
      const matchDigits = m.match.replace(/\D/g, "");
      return matchDigits === candidate || candidate.includes(matchDigits) || matchDigits.includes(candidate);
    });
    if (!alreadyFound) {
      const hasPrefix = config.phoneCountryPrefixes.some(p => candidate.startsWith(p));
      if (hasPrefix && !isWhitelisted(norm.original, 0, norm.original.length, config.whitelistedPatterns)) {
        matches.push({
          type: "PHONE_NUMBER",
          match: candidate,
          position: { start: 0, end: norm.original.length },
          confidence: 0.88,
          severity: "high",
          context: "reconstructed",
          ruleId: "number_reconstruction",
        });
      }
    }
  }

  // ── Method 3: Aggressively normalized text (all separators removed) ──
  if (aggressivelyNormalized) {
    const candidates = extractPhoneCandidates(aggressivelyNormalized);
    for (const candidate of candidates) {
      const alreadyFound = matches.some(m => {
        const matchDigits = m.match.replace(/\D/g, "");
        return matchDigits === candidate || candidate.includes(matchDigits) || matchDigits.includes(candidate);
      });
      if (!alreadyFound) {
        const hasPrefix = config.phoneCountryPrefixes.some(p => candidate.startsWith(p));
        if (hasPrefix && !isWhitelisted(norm.original, 0, norm.original.length, config.whitelistedPatterns)) {
          matches.push({
            type: "PHONE_NUMBER",
            match: candidate,
            position: { start: 0, end: norm.original.length },
            confidence: 0.85,
            severity: "high",
            context: "aggressively_normalized",
            ruleId: "aggressive_normalized_phone",
          });
        }
      }
    }
  }

  // ── Method 4: Extract phone candidates from digit-only string ──
  if (digits.length >= 9 && digits.length <= 15) {
    const hasPhonePrefix = config.phoneCountryPrefixes.some(p => digits.startsWith(p));
    if (hasPhonePrefix && !isWhitelisted(norm.original, 0, norm.original.length, config.whitelistedPatterns)) {
      const alreadyFound = matches.some(m => {
        const matchDigits = m.match.replace(/\D/g, "");
        return matchDigits === digits || digits.includes(matchDigits);
      });
      if (!alreadyFound) {
        matches.push({
          type: "PHONE_NUMBER",
          match: digits,
          position: { start: 0, end: norm.original.length },
          confidence: 0.82,
          severity: "high",
          ruleId: "digit_extraction_phone",
        });
      }
    }
  }

  return deduplicateMatches(matches);
}

// ═══════════════════════════════════════════════════════════════
// 2. EMAIL DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectEmails(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];

  // Use configurable patterns for email
  const emailPatterns = config.patterns.filter(
    p => p.enabled && p.violationType === "EMAIL_ADDRESS"
  );

  for (const patternRule of emailPatterns) {
    try {
      const regex = getRegex(patternRule.pattern);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(norm.normalized)) !== null) {
        if (!isWhitelisted(norm.original, m.index, m.index + m[0].length, config.whitelistedPatterns)) {
          matches.push({
            type: "EMAIL_ADDRESS",
            match: m[0],
            position: { start: m.index, end: m.index + m[0].length },
            confidence: patternRule.confidence,
            severity: patternRule.severity,
            ruleId: patternRule.id,
          });
        }
      }
    } catch { /* skip */ }
  }

  // Also check on aggressivelyNormalized (catches "user @ gmail . com")
  if (norm.aggressivelyNormalized) {
    for (const patternRule of emailPatterns) {
      try {
        const regex = getRegex(patternRule.pattern, "gi");
        let m: RegExpExecArray | null;
        while ((m = regex.exec(norm.aggressivelyNormalized)) !== null) {
          const alreadyFound = matches.some(existing => existing.match === m![0]);
          if (!alreadyFound) {
            matches.push({
              type: "EMAIL_ADDRESS",
              match: m[0],
              position: { start: 0, end: norm.aggressivelyNormalized.length },
              confidence: patternRule.confidence * 0.9,
              severity: patternRule.severity,
              context: "aggressively_normalized",
              ruleId: `${patternRule.id}_agg`,
            });
          }
        }
      } catch { /* skip */ }
    }
  }

  return deduplicateMatches(matches);
}

// ═══════════════════════════════════════════════════════════════
// 3. URL DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectURLs(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];

  const urlPatterns = config.patterns.filter(
    p => p.enabled && p.violationType === "URL_DETECTED"
  );

  for (const patternRule of urlPatterns) {
    try {
      const regex = getRegex(patternRule.pattern);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(norm.normalized)) !== null) {
        const url = m[0].toLowerCase();
        // Skip safe domains
        if (config.safeDomains.some(d => url.includes(d))) continue;

        if (!isWhitelisted(norm.original, m.index, m.index + m[0].length, config.whitelistedPatterns)) {
          matches.push({
            type: "URL_DETECTED",
            match: m[0],
            position: { start: m.index, end: m.index + m[0].length },
            confidence: patternRule.confidence,
            severity: patternRule.severity,
            ruleId: patternRule.id,
          });
        }
      }
    } catch { /* skip */ }
  }

  return deduplicateMatches(matches);
}

// ═══════════════════════════════════════════════════════════════
// 4. KEYWORD DETECTION (configurable dictionary)
// ═══════════════════════════════════════════════════════════════

export function detectKeywords(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const text = norm.normalized;

  for (const kwRule of config.keywords) {
    if (!kwRule.enabled) continue;

    // Language filter
    if (kwRule.languages && kwRule.languages.length > 0) {
      if (!kwRule.languages.includes(norm.language) && norm.language !== "unknown") continue;
    }

    const kw = kwRule.keyword.toLowerCase();
    const idx = text.indexOf(kw);
    if (idx !== -1) {
      if (!isWhitelisted(norm.original, idx, idx + kw.length, config.whitelistedPatterns)) {
        matches.push({
          type: kwRule.category === "platform" ? "SOCIAL_MEDIA_KEYWORD" : "BLACKLIST_KEYWORD",
          match: kwRule.keyword,
          position: { start: idx, end: idx + kw.length },
          confidence: kwRule.category === "platform" ? 0.88 : 0.75,
          severity: kwRule.severity,
          ruleId: `keyword_${kw.replace(/\s/g, "_")}`,
        });
      }
    }
  }

  // Also check for keywords with separators removed (e.g., "w h a t s a p p")
  if (norm.aggressivelyNormalized) {
    const aggText = norm.aggressivelyNormalized;
    for (const kwRule of config.keywords) {
      if (!kwRule.enabled) continue;
      if (kwRule.category !== "platform") continue;

      const kw = kwRule.keyword.toLowerCase().replace(/\s/g, "");
      if (aggText.includes(kw)) {
        const alreadyFound = matches.some(m => m.type === "SOCIAL_MEDIA_KEYWORD");
        if (!alreadyFound) {
          matches.push({
            type: "SOCIAL_MEDIA_KEYWORD",
            match: kwRule.keyword,
            position: { start: 0, end: norm.original.length },
            confidence: 0.7,
            severity: "medium",
            context: "aggressively_normalized",
            ruleId: `keyword_agg_${kw}`,
          });
        }
      }
    }
  }

  return matches;
}

// ═══════════════════════════════════════════════════════════════
// 5. MOVE-OFF-PLATFORM INTENT DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectMoveOffPlatform(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const text = norm.normalized;

  for (const phrase of config.moveOffPlatformPhrases) {
    const idx = text.indexOf(phrase.toLowerCase());
    if (idx !== -1) {
      matches.push({
        type: "MOVE_OFF_PLATFORM",
        match: phrase,
        position: { start: idx, end: idx + phrase.length },
        confidence: 0.82,
        severity: "high",
        ruleId: `move_off_${phrase.replace(/\s/g, "_")}`,
      });
    }
  }

  // Contextual patterns: intent to move conversation
  const contextualPatterns = [
    /(?:let's|we can|we should|on continue|on peut|nous pouvons)\s+.{0,30}\s+(?:outside|elsewhere|sur|ailleurs|dehors|via|par)/gi,
    /(?:donne|give|send|envoi)\s+(?:moi|me)?\s*(?:ton|your|le)?\s*(?:numéro|number|tel|phone)/gi,
    /(?:write|contact|call|text|écris|appelle|contacte)\s+(?:moi|me)?\s+(?:on|sur|at|à|via)\b/gi,
  ];

  for (const pattern of contextualPatterns) {
    try {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        matches.push({
          type: "MOVE_OFF_PLATFORM",
          match: m[0],
          position: { start: m.index, end: m.index + m[0].length },
          confidence: 0.78,
          severity: "high",
          ruleId: "contextual_move_off",
        });
      }
    } catch { /* skip */ }
  }

  return deduplicateMatches(matches);
}

// ═══════════════════════════════════════════════════════════════
// 6. USERNAME / HANDLE DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectUsernames(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];

  for (const pattern of config.usernamePatterns) {
    try {
      const regex = getRegex(pattern);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(norm.normalized)) !== null) {
        if (!isWhitelisted(norm.original, m.index, m.index + m[0].length, config.whitelistedPatterns)) {
          matches.push({
            type: "USERNAME_DETECTED",
            match: m[0],
            position: { start: m.index, end: m.index + m[0].length },
            confidence: 0.82,
            severity: "medium",
            ruleId: `username_${pattern.replace(/[^\w]/g, "_").substring(0, 30)}`,
          });
        }
      }
    } catch { /* skip */ }
  }

  // Also check configurable pattern rules for username detection
  const usernamePatterns = config.patterns.filter(
    p => p.enabled && p.violationType === "USERNAME_DETECTED"
  );

  for (const patternRule of usernamePatterns) {
    try {
      const regex = getRegex(patternRule.pattern);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(norm.normalized)) !== null) {
        const alreadyFound = matches.some(
          existing => existing.position.start <= m!.index && existing.position.end >= m!.index + m![0].length
        );
        if (!alreadyFound && !isWhitelisted(norm.original, m.index, m.index + m[0].length, config.whitelistedPatterns)) {
          matches.push({
            type: "USERNAME_DETECTED",
            match: m[0],
            position: { start: m.index, end: m.index + m[0].length },
            confidence: patternRule.confidence,
            severity: patternRule.severity,
            ruleId: patternRule.id,
          });
        }
      }
    } catch { /* skip */ }
  }

  return deduplicateMatches(matches);
}

// ═══════════════════════════════════════════════════════════════
// 7. OBFUSCATION DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectObfuscation(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];
  const text = norm.normalized;

  // ── 7a. Leetspeak patterns for platform names ──
  const leetWords = [
    "whatsapp", "telegram", "instagram", "snapchat", "facebook", "discord", "skype", "signal",
  ];

  const leetCharMap: Record<string, string[]> = {
    "a": ["a", "@", "4"],
    "e": ["e", "3"],
    "i": ["i", "1", "!"],
    "o": ["o", "0"],
    "s": ["s", "5", "$"],
    "t": ["t", "7"],
    "b": ["b", "8"],
    "g": ["g", "9"],
  };

  for (const word of leetWords) {
    let leetPattern = "";
    for (const ch of word) {
      if (leetCharMap[ch]) {
        leetPattern += `[${leetCharMap[ch].join("")}]`;
      } else {
        leetPattern += ch;
      }
    }
    // Add optional separators between each character
    const flexiblePattern = leetPattern.split("").join("[\\s.\\-_]*");
    try {
      const regex = getRegex(flexiblePattern);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        matches.push({
          type: "OBFUSCATION",
          match: m[0],
          position: { start: m.index, end: m.index + m[0].length },
          confidence: 0.78,
          severity: "high",
          ruleId: `leet_${word}`,
        });
      }
    } catch { /* skip */ }
  }

  // ── 7b. Separated characters: "s.i.x" "s-i-x" "s i x n i n e" ──
  const spacedDigitWords = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "un", "deux", "trois", "quatre", "cinq", "sept", "huit", "neuf",
  ];

  for (const word of spacedDigitWords) {
    const spacedPattern = word.split("").join("[\\s.\\-_]*");
    try {
      const regex = getRegex(spacedPattern, "gi");
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        // Only flag if there are actual separators (not just the word itself)
        if (m[0].length > word.length) {
          matches.push({
            type: "OBFUSCATION",
            match: m[0],
            position: { start: m.index, end: m.index + m[0].length },
            confidence: 0.7,
            severity: "medium",
            ruleId: `spaced_${word}`,
          });
        }
      }
    } catch { /* skip */ }
  }

  // ── 7c. Multiple spaced digit-words in sequence (high confidence phone attempt) ──
  const digitWordRegex = /(?:zero|one|two|three|four|five|six|seven|eight|nine|un|deux|trois|quatre|cinq|sept|huit|neuf)\s+(?:zero|one|two|three|four|five|six|seven|eight|nine|un|deux|trois|quatre|cinq|sept|huit|neuf)/gi;
  let digitWordCount = 0;
  let m: RegExpExecArray | null;
  while ((m = digitWordRegex.exec(text)) !== null) {
    digitWordCount++;
  }
  if (digitWordCount >= 3) {
    matches.push({
      type: "OBFUSCATION",
      match: "(multiple spaced digit words detected)",
      position: { start: 0, end: text.length },
      confidence: 0.92,
      severity: "critical",
      ruleId: "multi_spaced_digit_words",
    });
  }

  // ── 7d. Circled/circled number characters ──
  const circledDigits = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⓪❶❷❸❹❺❻❼❽❾❿]/g;
  let circledCount = 0;
  while ((m = circledDigits.exec(text)) !== null) {
    circledCount++;
  }
  if (circledCount >= 4) {
    matches.push({
      type: "OBFUSCATION",
      match: "(circled digit sequence)",
      position: { start: 0, end: text.length },
      confidence: 0.85,
      severity: "high",
      ruleId: "circled_digits",
    });
  }

  // ── 7e. Emoji digit sequences (already normalized, but check raw) ──
  const rawEmojiDigits = norm.original.match(/[0-9]️⃣/g);
  if (rawEmojiDigits && rawEmojiDigits.length >= 4) {
    matches.push({
      type: "OBFUSCATION",
      match: "(emoji digit sequence)",
      position: { start: 0, end: norm.original.length },
      confidence: 0.9,
      severity: "high",
      ruleId: "emoji_digit_sequence",
    });
  }

  return deduplicateMatches(matches);
}

// ═══════════════════════════════════════════════════════════════
// 8. PATTERN-BASED DETECTION (configurable regex engine)
// ═══════════════════════════════════════════════════════════════

/**
 * Run all configurable pattern rules against normalized text.
 * This is a generic detector that handles any pattern not covered by specialized detectors.
 */
export function detectPatterns(norm: NormalizedText, config: ModerationConfig): DetectionMatch[] {
  const matches: DetectionMatch[] = [];

  // Skip patterns already handled by specialized detectors
  const handledTypes = new Set<ViolationType>(["PHONE_NUMBER", "EMAIL_ADDRESS", "URL_DETECTED", "USERNAME_DETECTED"]);

  const genericPatterns = config.patterns.filter(
    p => p.enabled && !handledTypes.has(p.violationType)
  );

  for (const patternRule of genericPatterns) {
    try {
      const regex = getRegex(patternRule.pattern);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(norm.normalized)) !== null) {
        if (!isWhitelisted(norm.original, m.index, m.index + m[0].length, config.whitelistedPatterns)) {
          matches.push({
            type: patternRule.violationType,
            match: m[0],
            position: { start: m.index, end: m.index + m[0].length },
            confidence: patternRule.confidence,
            severity: patternRule.severity,
            ruleId: patternRule.id,
          });
        }
      }
    } catch { /* skip */ }
  }

  return deduplicateMatches(matches);
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN REGISTRY
// ═══════════════════════════════════════════════════════════════

/**
 * Built-in detection plugins.
 * Each plugin wraps a detector function and implements the DetectionPlugin interface.
 * External plugins can be registered via the plugin registry.
 */
const builtInPlugins: DetectionPlugin[] = [
  {
    id: "phone_detector",
    name: "Phone Number Detector",
    version: "2.0.0",
    priority: 100,
    enabled: true,
    detect: (norm, config) => detectPhoneNumbers(norm, config),
  },
  {
    id: "email_detector",
    name: "Email Address Detector",
    version: "2.0.0",
    priority: 95,
    enabled: true,
    detect: (norm, config) => detectEmails(norm, config),
  },
  {
    id: "url_detector",
    name: "URL Detector",
    version: "2.0.0",
    priority: 90,
    enabled: true,
    detect: (norm, config) => detectURLs(norm, config),
  },
  {
    id: "keyword_detector",
    name: "Keyword Detector",
    version: "2.0.0",
    priority: 85,
    enabled: true,
    detect: (norm, config) => detectKeywords(norm, config),
  },
  {
    id: "move_off_platform_detector",
    name: "Move Off Platform Detector",
    version: "2.0.0",
    priority: 80,
    enabled: true,
    detect: (norm, config) => detectMoveOffPlatform(norm, config),
  },
  {
    id: "username_detector",
    name: "Username Detector",
    version: "2.0.0",
    priority: 75,
    enabled: true,
    detect: (norm, config) => detectUsernames(norm, config),
  },
  {
    id: "obfuscation_detector",
    name: "Obfuscation Detector",
    version: "2.0.0",
    priority: 70,
    enabled: true,
    detect: (norm, config) => detectObfuscation(norm, config),
  },
  {
    id: "pattern_detector",
    name: "Generic Pattern Detector",
    version: "2.0.0",
    priority: 65,
    enabled: true,
    detect: (norm, config) => detectPatterns(norm, config),
  },
];

// External plugin registry
const externalPlugins: DetectionPlugin[] = [];

/**
 * Register an external detection plugin.
 * Plugins are sorted by priority (higher = runs first).
 */
export function registerPlugin(plugin: DetectionPlugin): void {
  // Remove existing plugin with same ID
  const idx = externalPlugins.findIndex(p => p.id === plugin.id);
  if (idx !== -1) externalPlugins.splice(idx, 1);
  externalPlugins.push(plugin);
  externalPlugins.sort((a, b) => b.priority - a.priority);
}

/**
 * Unregister a plugin by ID.
 */
export function unregisterPlugin(pluginId: string): void {
  const idx = externalPlugins.findIndex(p => p.id === pluginId);
  if (idx !== -1) externalPlugins.splice(idx, 1);
}

/**
 * Get all registered plugins (built-in + external).
 */
export function getAllPlugins(): DetectionPlugin[] {
  return [...builtInPlugins, ...externalPlugins].sort((a, b) => b.priority - a.priority);
}

// ═══════════════════════════════════════════════════════════════
// MAIN DETECTION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Run all detectors on normalized text and return merged results.
 * Uses the plugin system — built-in detectors + any registered external plugins.
 */
export function runAllDetectors(norm: NormalizedText, config: ModerationConfig): DetectionResult {
  const allMatches: DetectionMatch[] = [];
  const plugins = getAllPlugins();

  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    try {
      const matches = plugin.detect(norm, config);
      allMatches.push(...matches);
    } catch (err) {
      console.error(`[moderation] Plugin ${plugin.id} failed:`, err);
    }
  }

  // Deduplicate
  const deduplicated = deduplicateMatches(allMatches);

  // Determine primary type (highest confidence match)
  const primaryType = deduplicated.length > 0
    ? deduplicated.reduce((a, b) => a.confidence > b.confidence ? a : b).type
    : undefined;

  const highestConfidence = deduplicated.length > 0
    ? Math.max(...deduplicated.map(m => m.confidence))
    : 0;

  // Detect multiple indicators
  const uniqueTypes = new Set(deduplicated.map(m => m.type));
  if (uniqueTypes.size >= 2 && !deduplicated.some(m => m.type === "MULTIPLE_INDICATORS")) {
    deduplicated.push({
      type: "MULTIPLE_INDICATORS",
      match: `(${uniqueTypes.size} different violation types)`,
      position: { start: 0, end: 0 },
      confidence: 0.9,
      severity: "high",
      ruleId: "multi_indicator_bonus",
    });
  }

  return {
    matches: deduplicated,
    totalMatches: deduplicated.length,
    primaryType,
    highestConfidence,
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function deduplicateMatches(matches: DetectionMatch[]): DetectionMatch[] {
  const seen = new Set<string>();
  return matches.filter(m => {
    const key = `${m.type}:${m.position.start}:${m.position.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}