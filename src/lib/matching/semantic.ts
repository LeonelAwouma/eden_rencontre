// ============================================================================
//  Garden of Alliance — Semantic Extraction Model
//  Converts open-ended questionnaire responses into structured attributes.
//  LLM may be used for extraction, but the output is deterministic structured data.
// ============================================================================

import type { SemanticProfile, ExtractedAttribute } from "./types";

// ── EXTRACTION CONFIGURATION ─────────────────────────────────────────────────

/** Keyword clusters for deterministic theme extraction */
const THEME_KEYWORDS: Record<string, Record<string, string[]>> = {
  marriage_values: {
    "partnership": ["partenariat", "compagnon", "compagne", "partenaire", "ensemble", "partner", "together"],
    "ministry": ["ministère", "ministry", "évangéliser", "servir", "serve", "église", "church"],
    "family": ["famille", "family", "enfants", "children", "maison", "home", "foyer"],
    "love": ["amour", "love", "affection", "tendresse", "cœur", "heart"],
    "commitment": ["engagement", "commitment", "fidélité", "faithful", "loyauté", "loyalty"],
    "growth": ["croissance", "growth", "mûrir", "mature", "développement", "development"],
  },
  faith_values: {
    "prayer": ["prière", "prayer", "prier", "pray", "intercession"],
    "worship": ["louange", "worship", "adoration", "praise"],
    "word": ["bible", "parole", "word", "écriture", "scripture", "étude", "study"],
    "holiness": ["sainteté", "holiness", "pureté", "purity", "saint", "holy"],
    "evangelism": ["évangélisation", "evangelism", "témoignage", "witness", "partager", "share"],
    "service": ["service", "servir", "serve", "ministère", "ministry", "aider", "help"],
  },
  family_values: {
    "respect": ["respect", "respecter", "honneur", "honor"],
    "unity": ["unité", "unity", "ensemble", "together", "uni", "united"],
    "discipline": ["discipline", "éducation", "education", "enseigner", "teach"],
    "protection": ["protection", "protéger", "protect", "sécurité", "safety"],
    "provision": ["provision", "pourvoir", "provide", "pourvoyeur", "provider"],
    "tradition": ["tradition", "coutume", "custom", "héritage", "heritage"],
  },
  communication_style: {
    "open": ["ouvert", "open", "honnête", "honest", "transparent", "franc"],
    "gentle": ["doux", "gentle", "tendre", "tender", "patience", "patient"],
    "direct": ["direct", "direct", "claire", "clear", "franc", "frank"],
    "listening": ["écoute", "listening", "écouter", "listen", "comprendre", "understand"],
  },
  conflict_style: {
    "prayer_based": ["prière", "prayer", "dieu", "god", "prier", "pray"],
    "dialogue": ["dialogue", "discussion", "parler", "talk", "communiquer", "communicate"],
    "patience": ["patience", "patience", "attendre", "wait", "temps", "time"],
    "forgiveness": ["pardon", "forgiveness", "pardonner", "forgive", "réconciliation", "reconciliation"],
  },
  financial_values: {
    "tithe": ["dîme", "tithe", "dîmer", "offrande", "offering"],
    "stewardship": ["gérance", "stewardship", "gérer", "manage", "intendant", "steward"],
    "generosity": ["générosité", "generosity", "généreux", "generous", "donner", "give"],
    "saving": ["épargne", "saving", "économiser", "save", "investir", "invest"],
  },
  parenting_values: {
    "biblical": ["biblique", "biblical", "bible", "écrire", "scripture", "chrétien", "christian"],
    "love_based": ["amour", "love", "aimer", "love", "tendresse", "affection"],
    "discipline": ["discipline", "correction", "corriger", "correct", "guide"],
    "education": ["éducation", "education", "enseigner", "teach", "école", "school"],
  },
  relationship_expectations: {
    "spiritual_leader": ["leader", "leadership", "diriger", "lead", "guide", "guider"],
    "companionship": ["compagnie", "companionship", "ami", "friend", "compagnon", "companion"],
    "respect": ["respect", "respecter", "respect", "honneur", "honor"],
    "support": ["soutien", "support", "soutenir", "support", "encouragement", "encourager"],
  },
};

// ── MAIN EXTRACTION FUNCTION ─────────────────────────────────────────────────

/**
 * Extract structured attributes from open-ended responses.
 * Uses keyword-based deterministic extraction as the primary method.
 * An LLM can be used to enhance extraction, but the output format is fixed.
 */
export function extractSemanticProfile(openResponses: {
  vision_of_marriage: string;
  relationship_with_god_description: string;
  conflict_resolution_example: string;
  parenting_philosophy: string;
  financial_stewardship_view: string;
  definition_of_true_love: string;
  spiritual_legacy: string;
  ideal_relationship_description: string;
}): SemanticProfile {
  return {
    marriage_values: extractThemes(
      openResponses.vision_of_marriage,
      THEME_KEYWORDS.marriage_values,
      "vision_of_marriage"
    ),
    faith_values: extractThemes(
      openResponses.relationship_with_god_description,
      THEME_KEYWORDS.faith_values,
      "relationship_with_god_description"
    ),
    family_values: extractThemes(
      openResponses.parenting_philosophy,
      THEME_KEYWORDS.family_values,
      "parenting_philosophy"
    ),
    communication_style: extractThemes(
      openResponses.ideal_relationship_description,
      THEME_KEYWORDS.communication_style,
      "ideal_relationship_description"
    ),
    conflict_style: extractThemes(
      openResponses.conflict_resolution_example,
      THEME_KEYWORDS.conflict_style,
      "conflict_resolution_example"
    ),
    financial_values: extractThemes(
      openResponses.financial_stewardship_view,
      THEME_KEYWORDS.financial_values,
      "financial_stewardship_view"
    ),
    parenting_values: extractThemes(
      openResponses.parenting_philosophy,
      THEME_KEYWORDS.parenting_values,
      "parenting_philosophy"
    ),
    relationship_expectations: extractThemes(
      openResponses.definition_of_true_love,
      THEME_KEYWORDS.relationship_expectations,
      "definition_of_true_love"
    ),
  };
}

// ── THEME EXTRACTION ─────────────────────────────────────────────────────────

/**
 * Extract themes from text using keyword matching.
 * Returns ExtractedAttribute[] with confidence scores.
 */
function extractThemes(
  text: string,
  themeKeywords: Record<string, string[]>,
  sourceQuestion: string
): ExtractedAttribute[] {
  if (!text || text.trim().length === 0) return [];

  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = normalized.split(/\s+/);
  const totalWords = words.length;

  if (totalWords === 0) return [];

  const results: ExtractedAttribute[] = [];

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    let matchCount = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Count occurrences (exact word match or substring for compound words)
      const regex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, "gi");
      const matches = normalized.match(regex);
      if (matches) {
        matchCount += matches.length;
      }
    }

    if (matchCount > 0) {
      // Confidence: based on match density (matches per word) and total matches
      const density = matchCount / totalWords;
      const matchFactor = Math.min(matchCount / 3, 1); // Cap at 3 matches for full confidence
      const confidence = Math.min(0.95, 0.4 + density * 10 + matchFactor * 0.3);

      results.push({
        value: theme,
        confidence: Math.round(confidence * 100) / 100,
        source_question: sourceQuestion,
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

// ── SEMANTIC COMPATIBILITY ───────────────────────────────────────────────────

/**
 * Compare two semantic profiles for compatibility.
 * Returns a score 0-100 and a list of shared/contrasting themes.
 */
export function compareSemanticProfiles(
  profileA: SemanticProfile,
  profileB: SemanticProfile
): {
  score: number;
  sharedThemes: string[];
  contrastingThemes: string[];
} {
  const dimensions: Array<keyof SemanticProfile> = [
    "marriage_values",
    "faith_values",
    "family_values",
    "communication_style",
    "conflict_style",
    "financial_values",
    "parenting_values",
    "relationship_expectations",
  ];

  let totalScore = 0;
  let dimensionCount = 0;
  const sharedThemes: string[] = [];
  const contrastingThemes: string[] = [];

  for (const dim of dimensions) {
    const themesA = profileA[dim];
    const themesB = profileB[dim];

    if (themesA.length === 0 && themesB.length === 0) continue;

    dimensionCount++;

    // Find shared themes (same value appearing in both)
    const valuesA = new Set(themesA.map(t => t.value));
    const valuesB = new Set(themesB.map(t => t.value));
    const shared = [...valuesA].filter(v => valuesB.has(v));
    const uniqueA = [...valuesA].filter(v => !valuesB.has(v));
    const uniqueB = [...valuesB].filter(v => !valuesA.has(v));

    // Score based on overlap
    const union = new Set([...valuesA, ...valuesB]);
    const overlapRatio = union.size > 0 ? shared.length / union.size : 0;

    // Weight by confidence
    let weightedScore = 0;
    if (shared.length > 0) {
      for (const theme of shared) {
        const confA = themesA.find(t => t.value === theme)?.confidence ?? 0.5;
        const confB = themesB.find(t => t.value === theme)?.confidence ?? 0.5;
        weightedScore += (confA + confB) / 2;
        sharedThemes.push(`${dim}: ${theme}`);
      }
      weightedScore = weightedScore / shared.length;
    }

    const dimScore = overlapRatio * 70 + weightedScore * 30;
    totalScore += dimScore;

    // Track contrasting themes
    for (const theme of uniqueA) {
      contrastingThemes.push(`${dim}: ${theme} (A seulement)`);
    }
    for (const theme of uniqueB) {
      contrastingThemes.push(`${dim}: ${theme} (B seulement)`);
    }
  }

  const score = dimensionCount > 0 ? Math.round(totalScore / dimensionCount) : 50;

  return {
    score: Math.min(100, Math.max(0, score)),
    sharedThemes: sharedThemes.slice(0, 5),
    contrastingThemes: contrastingThemes.slice(0, 3),
  };
}

// ── UTILITY ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}