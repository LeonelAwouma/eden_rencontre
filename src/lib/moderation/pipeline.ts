/**
 * Eden Connexion — Intelligent Rule-Based Communication Protection Engine
 * Pipeline Orchestrator — Risk Scoring, Decision Engine, Trust, Escalation, Logging
 * Single entry point: validateMessage()
 */

import type {
  DetectionMatch,
  RiskScore,
  RiskLevel,
  Decision,
  ModerationConfig,
  TrustUnlockCondition,
  EscalationResult,
  EscalationRule,
  ContextAnalysisResult,
} from "./types";
import { DEFAULT_CONFIG, FRIENDLY_WARNINGS } from "./config";
import { normalizeText } from "./normalizer";
import { runAllDetectors } from "./detectors";
import { analyzeContext, applyContextToRisk } from "./context";
import { supabase } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════════════
// PIPELINE INPUT / OUTPUT
// ═══════════════════════════════════════════════════════════════

export interface PipelineInput {
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
}

export interface PipelineOutput {
  allowed: boolean;
  decision: Decision;
  riskScore: number;
  riskLevel: RiskLevel;
  warnings: string[];
  blockReason?: string;
  trustLevel: number;
  unlockConditions?: TrustUnlockCondition[];
  traceId: string;
  processingTimeMs: number;
  escalation?: EscalationResult;
}

// ═══════════════════════════════════════════════════════════════
// RISK SCORE ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate cumulative risk score from detection matches.
 * Each detection contributes points based on configured weight × confidence.
 * Score is capped at 100.
 */
export function calculateRiskScore(
  detections: DetectionMatch[],
  config: ModerationConfig = DEFAULT_CONFIG
): RiskScore {
  const breakdown: Record<string, number> = {};
  const factors: string[] = [];
  let totalScore = 0;

  for (const det of detections) {
    const weight = config.weights[det.type] ?? 15;
    const points = Math.round(weight * det.confidence);
    breakdown[det.type] = (breakdown[det.type] || 0) + points;
    totalScore += points;
    factors.push(
      `${det.type}: "${det.match}" (${Math.round(det.confidence * 100)}% confidence → +${points}pts)`
    );
  }

  // Cap at 100
  totalScore = Math.min(totalScore, 100);

  let level: RiskLevel;
  if (totalScore < config.thresholds.safe) level = "SAFE";
  else if (totalScore < config.thresholds.warning) level = "WARNING";
  else if (totalScore < config.thresholds.review) level = "REVIEW";
  else level = "BLOCK";

  return { score: totalScore, level, breakdown, factors };
}

// ═══════════════════════════════════════════════════════════════
// DECISION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Make a decision based on risk score and trust status.
 * All thresholds are configurable.
 *
 * Decision mapping:
 *   0–20   → DELIVER (allow message)
 *   21–40  → WARN (allow with monitoring)
 *   41–60  → REVIEW (block and notify sender)
 *   61+    → BLOCK (block, log, increment violations)
 */
function makeDecision(riskScore: RiskScore, trustCanShare: boolean): Decision {
  // If user has earned trust and risk is low enough, allow
  if (trustCanShare && riskScore.level === "WARNING") return "WARN";
  if (riskScore.level === "SAFE") return "DELIVER";
  if (riskScore.level === "WARNING") return "WARN";
  if (riskScore.level === "REVIEW") return "REVIEW";
  return "BLOCK";
}

// ═══════════════════════════════════════════════════════════════
// PROGRESSIVE TRUST ALGORITHM
// ═══════════════════════════════════════════════════════════════

/**
 * Get user's trust level from the database.
 */
export async function getTrustLevel(userId: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("trust_level")
      .eq("id", userId)
      .maybeSingle();
    return (data?.trust_level as number) ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Determine if a user can share contact information based on configurable trust rules.
 *
 * Trust conditions (configurable via admin panel):
 *   - Minimum conversation age (days)
 *   - Minimum number of exchanged messages
 *   - Mutual interaction score
 *   - Verified identity
 *   - Premium subscription
 *   - Mutual consent
 *   - Administrator approval
 */
export async function canShareContacts(
  userId: string,
  config: ModerationConfig = DEFAULT_CONFIG
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return false;

    const days = profile.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
      : 0;
    const msgCount = (profile.message_count as number) ?? 0;
    const verified = !!profile.identity_verified;
    const premium = !!profile.is_premium;
    const consent = !!profile.contact_sharing_consent;
    const adminApproved = !!profile.admin_approved;
    const interactionScore = (profile.mutual_interaction_score as number) ?? 0;

    // Evaluate each trust rule
    let totalWeight = 0;
    let metWeight = 0;
    let allRequiredMet = true;

    for (const rule of config.trustRules) {
      if (!rule.enabled) continue;

      totalWeight += rule.weight;
      let conditionMet = false;

      switch (rule.conditionType) {
        case "days":
          conditionMet = days >= rule.threshold;
          break;
        case "messages":
          conditionMet = msgCount >= rule.threshold;
          break;
        case "interaction":
          conditionMet = interactionScore >= rule.threshold;
          break;
        case "verified":
          conditionMet = verified;
          break;
        case "premium":
          conditionMet = premium;
          break;
        case "consent":
          conditionMet = consent;
          break;
        case "admin":
          conditionMet = adminApproved;
          break;
        default:
          conditionMet = false;
      }

      if (conditionMet) {
        metWeight += rule.weight;
      } else if (rule.required) {
        allRequiredMet = false;
      }
    }

    // All required conditions must be met
    if (!allRequiredMet) return false;

    // At least 70% of total weight must be met
    if (totalWeight > 0 && metWeight / totalWeight < 0.7) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Get detailed unlock conditions for a user (for UI display).
 */
export async function getUnlockConditions(
  userId: string,
  config: ModerationConfig = DEFAULT_CONFIG
): Promise<TrustUnlockCondition[]> {
  if (!supabase) return [];
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const days = profile?.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
      : 0;
    const msgCount = (profile?.message_count as number) ?? 0;
    const verified = !!profile?.identity_verified;
    const premium = !!profile?.is_premium;
    const consent = !!profile?.contact_sharing_consent;
    const adminApproved = !!profile?.admin_approved;
    const interactionScore = (profile?.mutual_interaction_score as number) ?? 0;

    const conditions: TrustUnlockCondition[] = [];

    for (const rule of config.trustRules) {
      if (!rule.enabled) continue;

      let current = 0;
      let met = false;

      switch (rule.conditionType) {
        case "days":
          current = days;
          met = days >= rule.threshold;
          break;
        case "messages":
          current = msgCount;
          met = msgCount >= rule.threshold;
          break;
        case "interaction":
          current = interactionScore;
          met = interactionScore >= rule.threshold;
          break;
        case "verified":
          current = verified ? 1 : 0;
          met = verified;
          break;
        case "premium":
          current = premium ? 1 : 0;
          met = premium;
          break;
        case "consent":
          current = consent ? 1 : 0;
          met = consent;
          break;
        case "admin":
          current = adminApproved ? 1 : 0;
          met = adminApproved;
          break;
      }

      conditions.push({
        type: rule.conditionType,
        threshold: rule.threshold,
        met,
        current,
        label: rule.name,
        weight: rule.weight,
      });
    }

    return conditions;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// REPEAT OFFENDER ALGORITHM
// ═══════════════════════════════════════════════════════════════

/**
 * Track a violation and determine escalation level.
 * Uses configurable escalation rules with time windows.
 *
 * Progressive sanctions:
 *   Level 1: Warning
 *   Level 2: Temporary messaging restriction
 *   Level 3: 24-hour suspension
 *   Level 4: 7-day suspension
 *   Level 5: Permanent suspension
 */
export async function trackViolation(
  userId: string,
  conversationId: string,
  config: ModerationConfig = DEFAULT_CONFIG
): Promise<EscalationResult> {
  if (!supabase) {
    return {
      level: 0,
      action: "none",
      totalViolations: 0,
      dailyViolations: 0,
      weeklyViolations: 0,
      monthlyViolations: 0,
      label: "none",
    };
  }

  try {
    // Insert violation event
    await supabase.from("moderation_events").insert({
      user_id: userId,
      conversation_id: conversationId,
      event_type: "violation",
      created_at: new Date().toISOString(),
    });

    // Count violations in different time windows
    const now = Date.now();
    const dayAgo = new Date(now - 86400000).toISOString();
    const weekAgo = new Date(now - 7 * 86400000).toISOString();
    const monthAgo = new Date(now - 30 * 86400000).toISOString();

    const [
      { count: dailyCount },
      { count: weeklyCount },
      { count: monthlyCount },
    ] = await Promise.all([
      supabase
        .from("moderation_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "violation")
        .gte("created_at", dayAgo),
      supabase
        .from("moderation_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "violation")
        .gte("created_at", weekAgo),
      supabase
        .from("moderation_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "violation")
        .gte("created_at", monthAgo),
    ]);

    const daily = dailyCount ?? 0;
    const weekly = weeklyCount ?? 0;
    const monthly = monthlyCount ?? 0;

    // Evaluate escalation rules (sorted by level descending for highest match)
    const sortedRules = [...config.escalationRules]
      .filter(r => r.enabled)
      .sort((a, b) => b.level - a.level);

    let matchedRule: EscalationRule | null = null;

    for (const rule of sortedRules) {
      // Count violations in the rule's time window
      const windowStart = new Date(now - rule.timeWindowDays * 86400000).toISOString();
      const { count } = await supabase
        .from("moderation_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "violation")
        .gte("created_at", windowStart);

      if ((count ?? 0) >= rule.violationThreshold) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      const restrictedUntil =
        matchedRule.durationHours > 0
          ? new Date(now + matchedRule.durationHours * 3600000).toISOString()
          : undefined;

      return {
        level: matchedRule.level,
        action: matchedRule.action,
        totalViolations: monthly,
        dailyViolations: daily,
        weeklyViolations: weekly,
        monthlyViolations: monthly,
        label: matchedRule.name,
        restrictedUntil,
      };
    }

    return {
      level: 0,
      action: "none",
      totalViolations: monthly,
      dailyViolations: daily,
      weeklyViolations: weekly,
      monthlyViolations: monthly,
      label: "none",
    };
  } catch {
    return {
      level: 0,
      action: "none",
      totalViolations: 0,
      dailyViolations: 0,
      weeklyViolations: 0,
      monthlyViolations: 0,
      label: "error",
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MODERATION LOGGING
// ═══════════════════════════════════════════════════════════════

/**
 * Log a moderation event to the database.
 * Every stage output is recorded for audit trail.
 */
async function logEvent(params: {
  senderId: string;
  receiverId: string;
  conversationId: string;
  original: string;
  normalized: string;
  detections: DetectionMatch[];
  riskScore: RiskScore;
  decision: Decision;
  processingTimeMs: number;
  traceId: string;
  contextAnalysis?: ContextAnalysisResult;
  escalation?: EscalationResult;
}) {
  if (!supabase) return;
  try {
    await supabase.from("moderation_events").insert({
      user_id: params.senderId,
      conversation_id: params.conversationId,
      event_type: params.decision === "BLOCK" ? "violation" : "message_check",
      original_content: params.original.substring(0, 500),
      normalized_content: params.normalized.substring(0, 500),
      detections_json: JSON.stringify(params.detections),
      risk_score: params.riskScore.score,
      risk_level: params.riskScore.level,
      decision: params.decision,
      processing_time_ms: params.processingTimeMs,
      trace_id: params.traceId,
      context_analysis_json: params.contextAnalysis
        ? JSON.stringify(params.contextAnalysis)
        : null,
      escalation_json: params.escalation
        ? JSON.stringify(params.escalation)
        : null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[moderation] log failed:", e);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE — the single entry point for message validation
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a message through the complete detection pipeline.
 *
 * Pipeline stages:
 *   1. Input Validation
 *   2. Text Normalization
 *   3. Detection (plugin-based: phone, email, URL, keyword, obfuscation, etc.)
 *   4. Context Analysis
 *   5. Risk Score Calculation
 *   6. Decision Engine
 *   7. Trust Evaluation
 *   8. Escalation Check (repeat offender)
 *   9. Warning Generation
 *   10. Moderation Logging
 */
export async function validateMessage(
  input: PipelineInput,
  config: ModerationConfig = DEFAULT_CONFIG
): Promise<PipelineOutput> {
  const start = Date.now();
  const traceId = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const warnings: string[] = [];

  // ── Stage 1: Input Validation ──
  if (!input.content || input.content.trim().length === 0) {
    return {
      allowed: true,
      decision: "DELIVER",
      riskScore: 0,
      riskLevel: "SAFE",
      warnings: [],
      trustLevel: 0,
      traceId,
      processingTimeMs: Date.now() - start,
    };
  }

  // Security: max input length
  const content =
    input.content.length > config.security.maxInputLength
      ? input.content.substring(0, config.security.maxInputLength)
      : input.content;

  // ── Stage 2: Text Normalization ──
  const normalized = normalizeText(content, config);

  // ── Stage 3: Detection (all plugins) ──
  const detection = runAllDetectors(normalized, config);

  // ── Stage 4: Context Analysis ──
  let contextAnalysis: ContextAnalysisResult | undefined;
  if (config.features.enableContextAnalysis) {
    contextAnalysis = analyzeContext(normalized, config);
  }

  // ── Stage 5: Risk Score Calculation ──
  const riskScore = calculateRiskScore(detection.matches, config);

  // Apply context analysis to risk score
  if (contextAnalysis?.isSafeContext) {
    riskScore.score = applyContextToRisk(riskScore.score, contextAnalysis);
    // Recalculate level after context adjustment
    if (riskScore.score < config.thresholds.safe) riskScore.level = "SAFE";
    else if (riskScore.score < config.thresholds.warning) riskScore.level = "WARNING";
    else if (riskScore.score < config.thresholds.review) riskScore.level = "REVIEW";
    else riskScore.level = "BLOCK";
  }

  // ── Stage 6: Trust Evaluation ──
  const [trustLevel, canShare, conditions] = await Promise.all([
    getTrustLevel(input.senderId),
    canShareContacts(input.senderId, config),
    getUnlockConditions(input.senderId, config),
  ]);

  // ── Stage 7: Decision Engine ──
  let decision: Decision = makeDecision(riskScore, canShare);

  // ── Stage 8: Escalation Check (repeat offender) ──
  let escalation: EscalationResult | undefined;
  if (config.features.enableRepeatOffenderTracking && riskScore.score > 0) {
    escalation = await trackViolation(input.senderId, input.conversationId, config);
    if (escalation.level >= 5) {
      // Override to BLOCK for permanent suspension
      const priority: Record<Decision, number> = {
        DELIVER: 0,
        WARN: 1,
        REVIEW: 2,
        BLOCK: 3,
      };
      if (priority["BLOCK"] > priority[decision]) decision = "BLOCK";
    } else if (escalation.level >= 3) {
      const priority: Record<Decision, number> = {
        DELIVER: 0,
        WARN: 1,
        REVIEW: 2,
        BLOCK: 3,
      };
      if (priority["REVIEW"] > priority[decision]) decision = "REVIEW";
    }
  }

  // ── Stage 9: Warning Generation ──
  if (decision !== "DELIVER") {
    const primaryType = detection.primaryType;
    const msg = primaryType
      ? FRIENDLY_WARNINGS[primaryType] || FRIENDLY_WARNINGS["BLACKLIST_KEYWORD"]
      : "Ce message ne peut pas être envoyé.";
    warnings.push(msg);

    if (contextAnalysis?.isSafeContext) {
      warnings.push(
        "Note: Un contexte sûr a été détecté dans votre message. Si vous pensez qu'il s'agit d'une erreur, contactez le support."
      );
    }
  }

  // ── Stage 10: Moderation Logging ──
  const processingTimeMs = Date.now() - start;
  await logEvent({
    senderId: input.senderId,
    receiverId: input.receiverId,
    conversationId: input.conversationId,
    original: content,
    normalized: normalized.normalized,
    detections: detection.matches,
    riskScore,
    decision,
    processingTimeMs,
    traceId,
    contextAnalysis,
    escalation,
  });

  // ── Return ──
  return {
    allowed: decision === "DELIVER" || decision === "WARN",
    decision,
    riskScore: riskScore.score,
    riskLevel: riskScore.level,
    warnings,
    blockReason: decision === "BLOCK" ? warnings[0] : undefined,
    trustLevel,
    unlockConditions: canShare ? undefined : conditions,
    traceId,
    processingTimeMs,
    escalation,
  };
}