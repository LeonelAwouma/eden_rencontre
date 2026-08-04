/**
 * Eden Connexion — Intelligent Rule-Based Communication Protection Engine
 * Context Analysis Module
 * Evaluates surrounding words to distinguish legitimate content from attempts to exchange contact details.
 * Uses rule-based heuristics — no AI/ML dependency.
 */

import type { ContextAnalysisResult, ContextRule, NormalizedText, ModerationConfig } from "./types";

// ═══════════════════════════════════════════════════════════════
// REGEX CACHE
// ═══════════════════════════════════════════════════════════════
const regexCache = new Map<string, RegExp>();

function cachedRegex(pattern: string, flags = "gi"): RegExp {
  const key = `${pattern}::${flags}`;
  if (!regexCache.has(key)) {
    try {
      regexCache.set(key, new RegExp(pattern, flags));
    } catch {
      return /(?!.)/;
    }
  }
  return regexCache.get(key)!;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze the context of a message to determine if detected violations
 * are likely legitimate (Bible verses, schedules, reference numbers, etc.)
 * rather than attempts to exchange contact information.
 *
 * Returns a ContextAnalysisResult with risk reduction factors.
 */
export function analyzeContext(
  norm: NormalizedText,
  config: ModerationConfig
): ContextAnalysisResult {
  const matchingRules: string[] = [];
  let totalReduction = 0;
  let minAllowedRisk = 100; // Will be reduced by matching rules

  for (const rule of config.contextRules) {
    if (!rule.enabled) continue;

    const result = evaluateContextRule(norm, rule);
    if (result.matches) {
      matchingRules.push(rule.id);
      // Apply the highest risk reduction factor
      totalReduction = Math.max(totalReduction, rule.riskReductionFactor);
      // Apply the lowest max allowed risk
      minAllowedRisk = Math.min(minAllowedRisk, rule.maxRiskOverride);
    }
  }

  const isSafeContext = matchingRules.length > 0;

  return {
    isSafeContext,
    matchingRules,
    riskReduction: totalReduction,
    maxAllowedRisk: minAllowedRisk,
    reason: isSafeContext
      ? `Safe context detected: ${matchingRules.join(", ")}`
      : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// RULE EVALUATION
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate a single context rule against normalized text.
 * A rule matches if EITHER:
 *   - The text contains a trigger keyword AND a safe pattern, OR
 *   - The text contains a safe pattern alone
 */
function evaluateContextRule(
  norm: NormalizedText,
  rule: ContextRule
): { matches: boolean; confidence: number } {
  const text = norm.normalized;
  let hasTriggerKeyword = false;
  let hasSafePattern = false;

  // Check trigger keywords
  for (const keyword of rule.triggerKeywords) {
    const regex = cachedRegex(`\\b${escapeRegex(keyword)}\\b`, "gi");
    if (regex.test(text)) {
      hasTriggerKeyword = true;
      break;
    }
  }

  // Check safe patterns
  for (const pattern of rule.safePatterns) {
    try {
      const regex = cachedRegex(pattern, "gi");
      if (regex.test(text)) {
        hasSafePattern = true;
        break;
      }
    } catch { /* skip invalid regex */ }
  }

  // Rule matches if safe pattern is found
  // (trigger keyword is optional but increases confidence)
  if (hasSafePattern) {
    return {
      matches: true,
      confidence: hasTriggerKeyword ? 0.95 : 0.7,
    };
  }

  // Also match if trigger keyword is found alone
  // (e.g., "psalm" without a verse number should still reduce risk)
  if (hasTriggerKeyword && rule.triggerKeywords.length > 0) {
    return {
      matches: true,
      confidence: 0.5,
    };
  }

  return { matches: false, confidence: 0 };
}

// ═══════════════════════════════════════════════════════════════
// APPLY CONTEXT TO RISK SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * Apply context analysis results to a risk score.
 * Reduces the score based on safe context detection.
 */
export function applyContextToRisk(
  baseScore: number,
  contextResult: ContextAnalysisResult
): number {
  if (!contextResult.isSafeContext) return baseScore;

  // Apply risk reduction factor
  let adjustedScore = Math.round(baseScore * (1 - contextResult.riskReduction));

  // Cap at max allowed risk
  adjustedScore = Math.min(adjustedScore, contextResult.maxAllowedRisk);

  // Never go below 0
  return Math.max(0, adjustedScore);
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}