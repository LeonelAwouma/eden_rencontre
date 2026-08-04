/**
 * Eden Connexion — Intelligent Rule-Based Communication Protection Engine
 * Core TypeScript interfaces, types, and enums
 * 100% deterministic, no LLM/AI dependency — plugin-based, SOLID, Clean Architecture
 */

// ═══════════════════════════════════════════════════════════════
// ENUMS & UNION TYPES
// ═══════════════════════════════════════════════════════════════

export type RiskLevel = "SAFE" | "WARNING" | "REVIEW" | "BLOCK";
export type Decision = "DELIVER" | "WARN" | "REVIEW" | "BLOCK";

export type IntentLabel =
  | "SAFE"
  | "PHONE_SHARING"
  | "EMAIL_SHARING"
  | "SOCIAL_MEDIA_SHARING"
  | "MOVE_OFF_PLATFORM"
  | "SUSPICIOUS"
  | "UNKNOWN";

export type ViolationType =
  | "PHONE_NUMBER"
  | "EMAIL_ADDRESS"
  | "URL_DETECTED"
  | "SOCIAL_MEDIA_KEYWORD"
  | "USERNAME_DETECTED"
  | "BLACKLIST_KEYWORD"
  | "MOVE_OFF_PLATFORM"
  | "OBFUSCATION"
  | "QR_CODE"
  | "IMAGE_TEXT"
  | "FILE_CONTENT"
  | "REPEATED_ATTEMPTS"
  | "MULTIPLE_INDICATORS";

export type ContentType = "text" | "image" | "file" | "mixed";

export type EscalationAction =
  | "none"
  | "warning"
  | "temp_mute"
  | "restriction_24h"
  | "restriction_7d"
  | "permanent_suspension";

export type ModerationEvent =
  | "message_check"
  | "image_check"
  | "file_check"
  | "violation"
  | "escalation"
  | "appeal"
  | "manual_review"
  | "config_change"
  | "trust_unlock";

export type AppealStatus = "pending" | "approved" | "rejected" | "escalated";

export type SupportedLanguage =
  | "en" | "fr" | "es" | "pt" | "de" | "it" | "ar" | "unknown";

// ═══════════════════════════════════════════════════════════════
// DETECTION TYPES
// ═══════════════════════════════════════════════════════════════

export interface DetectionMatch {
  type: ViolationType;
  match: string;
  position: { start: number; end: number };
  confidence: number;
  ruleId?: string;
  context?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface NormalizedText {
  original: string;
  normalized: string;
  /** After lowercase + Unicode normalization + zero-width removal */
  cleanText: string;
  /** After separator removal, all punctuation replaced with spaces */
  separatorsRemoved: string;
  /** All digits extracted from original input */
  digits: string;
  /** Digits-only no-separators: "6 9 8 1 2 3" → "698123" */
  aggressivelyNormalized: string;
  /** Reconstructed number sequences from fragmented input */
  reconstructedNumbers: string[];
  /** Tokenized words */
  tokens: string[];
  language: SupportedLanguage;
  transformations: string[];
}

export interface DetectionResult {
  matches: DetectionMatch[];
  totalMatches: number;
  primaryType?: ViolationType;
  highestConfidence: number;
}

// ═══════════════════════════════════════════════════════════════
// RISK & DECISION
// ═══════════════════════════════════════════════════════════════

export interface RiskScore {
  score: number;
  level: RiskLevel;
  breakdown: Record<string, number>;
  factors: string[];
}

export interface ModerationResult {
  decision: Decision;
  riskScore: RiskScore;
  detections: DetectionMatch[];
  normalized: NormalizedText;
  warnings: string[];
  trustLevel: number;
  processingTimeMs: number;
  traceId: string;
  blockReason?: string;
  escalation?: EscalationResult;
  contextOverrides: string[];
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT ANALYSIS
// ═══════════════════════════════════════════════════════════════

export interface ContextRule {
  id: string;
  name: string;
  description: string;
  /** Regex patterns that indicate legitimate (non-threatening) context */
  safePatterns: string[];
  /** Keywords that trigger this context rule */
  triggerKeywords: string[];
  /** Maximum risk score when this context applies */
  maxRiskOverride: number;
  /** Weight reduction factor (0-1) when context matches */
  riskReductionFactor: number;
  enabled: boolean;
}

export interface ContextAnalysisResult {
  isSafeContext: boolean;
  matchingRules: string[];
  riskReduction: number;
  maxAllowedRisk: number;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// TRUST SYSTEM
// ═══════════════════════════════════════════════════════════════

export interface TrustUnlockCondition {
  type: string;
  threshold: number;
  met: boolean;
  current: number;
  label: string;
  weight: number;
}

export interface TrustProfile {
  userId: string;
  trustScore: number;
  canShareContacts: boolean;
  conditions: TrustUnlockCondition[];
  accountAgeDays: number;
  messageCount: number;
  mutualInteractionScore: number;
  isVerified: boolean;
  isPremium: boolean;
  mutualConsent: boolean;
  adminApproved: boolean;
  lastUpdated: string;
}

/** Configurable trust unlock rule */
export interface TrustRule {
  id: string;
  name: string;
  description: string;
  /** Type of condition: 'days', 'messages', 'interaction', 'verified', 'premium', 'consent', 'admin' */
  conditionType: string;
  threshold: number;
  weight: number;
  /** If true, this condition MUST be met (AND logic). If false, it's optional (OR with weight). */
  required: boolean;
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ESCALATION / REPEAT OFFENDER
// ═══════════════════════════════════════════════════════════════

export interface EscalationResult {
  level: number;
  action: EscalationAction;
  totalViolations: number;
  dailyViolations: number;
  weeklyViolations: number;
  monthlyViolations: number;
  label: string;
  restrictedUntil?: string;
}

export interface UserModerationSummary {
  userId: string;
  totalViolations: number;
  dailyViolations: number;
  weeklyViolations: number;
  monthlyViolations: number;
  escalationLevel: number;
  escalationAction: EscalationAction;
  lastViolationAt?: string;
  restrictedUntil?: string;
  trustScore: number;
  warningCount: number;
  blockedCount: number;
}

/** Configurable escalation sanction rule */
export interface EscalationRule {
  id: string;
  name: string;
  level: number;
  action: EscalationAction;
  /** Minimum number of violations to trigger this level */
  violationThreshold: number;
  /** Time window in days for counting violations */
  timeWindowDays: number;
  /** Duration of the sanction in hours (0 = permanent for this level) */
  durationHours: number;
  description: string;
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════
// OCR & FILE ANALYSIS
// ═══════════════════════════════════════════════════════════════

export interface OCRResult {
  extractedText: string;
  detections: DetectionMatch[];
  hasQRCode: boolean;
  qrCodeContent?: string;
  confidence: number;
  processingTimeMs: number;
}

export interface FileInspectionResult {
  fileType: string;
  extractedText: string;
  detections: DetectionMatch[];
  safe: boolean;
  processingTimeMs: number;
}

export interface QRCodeResult {
  found: boolean;
  content?: string;
  type?: "url" | "phone" | "email" | "text" | "wifi" | "vcard";
  isExternal: boolean;
  detections: DetectionMatch[];
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD ENGINE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** A single keyword rule in the configurable dictionary */
export interface KeywordRule {
  keyword: string;
  weight: number;
  category: "platform" | "contact" | "move_off" | "generic";
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  /** Languages where this keyword applies (empty = all) */
  languages?: SupportedLanguage[];
}

/** A single pattern rule in the configurable regex engine */
export interface PatternRule {
  id: string;
  name: string;
  pattern: string;
  violationType: ViolationType;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  description?: string;
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN SYSTEM
// ═══════════════════════════════════════════════════════════════

/** Every detection module implements this interface */
export interface DetectionPlugin {
  id: string;
  name: string;
  version: string;
  priority: number;
  enabled: boolean;
  /** Run detection on normalized text and return matches */
  detect(norm: NormalizedText, config: ModerationConfig): DetectionMatch[];
}

/** Every stage in the pipeline implements this interface */
export interface PipelineStage {
  id: string;
  name: string;
  priority: number;
  execute(context: PipelineContext): PipelineContext;
}

/** Mutable context passed through each pipeline stage */
export interface PipelineContext {
  input: PipelineInput;
  config: ModerationConfig;
  normalized?: NormalizedText;
  detections: DetectionMatch[];
  riskScore?: RiskScore;
  decision?: Decision;
  contextAnalysis?: ContextAnalysisResult;
  escalation?: EscalationResult;
  trustLevel: number;
  canShareContacts: boolean;
  unlockConditions: TrustUnlockCondition[];
  warnings: string[];
  contextOverrides: string[];
  traceId: string;
  processingTimeMs: number;
  /** For plugin-based detection injection */
  plugins: DetectionPlugin[];
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface ModerationConfig {
  weights: Record<ViolationType, number>;
  thresholds: {
    safe: number;
    warning: number;
    review: number;
    block: number;
  };
  keywords: KeywordRule[];
  patterns: PatternRule[];
  contextRules: ContextRule[];
  trustRules: TrustRule[];
  escalationRules: EscalationRule[];
  whitelistedPatterns: string[];
  phoneCountryPrefixes: string[];
  moveOffPlatformPhrases: string[];
  usernamePatterns: string[];
  characterSubstitutions: Record<string, string>;
  numberWordDictionaries: Record<string, string[]>;
  homoglyphMap: Record<string, string>;
  emojiDigitMap: string[];
  superscriptDigits: Record<string, string>;
  subscriptDigits: Record<string, string>;
  leetMap: Record<string, string>;
  safeDomains: string[];
  features: {
    enableObfuscationDetection: boolean;
    enableRepeatOffenderTracking: boolean;
    enableFileInspection: boolean;
    enableRateLimiting: boolean;
    enableAuditLogging: boolean;
    enableMultilingual: boolean;
    enableContextAnalysis: boolean;
    enableNumberReconstruction: boolean;
    enableNumberWordConversion: boolean;
    enableCharacterSubstitutionDetection: boolean;
  };
  rateLimit: {
    maxMessagesPerMinute: number;
    maxViolationsPerHour: number;
    cooldownMinutes: number;
  };
  security: {
    maxInputLength: number;
    enableRegexTimeout: boolean;
    regexTimeoutMs: number;
    maxUnicodeNormalizationDepth: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// API REQUEST / RESPONSE
// ═══════════════════════════════════════════════════════════════

export interface ValidateMessageRequest {
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  messageType?: ContentType;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
}

export interface ValidateMessageResponse {
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

export interface ValidateImageRequest {
  userId: string;
  conversationId: string;
  imageUrl: string;
}

export interface ValidateFileRequest {
  userId: string;
  conversationId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export interface ModerationHistoryQuery {
  userId?: string;
  conversationId?: string;
  decision?: Decision;
  riskLevel?: RiskLevel;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ModerationHistoryResponse {
  events: ModerationEventRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModerationEventRecord {
  id: string;
  userId: string;
  receiverId?: string;
  conversationId: string;
  eventType: ModerationEvent;
  originalContent?: string;
  normalizedContent?: string;
  detections?: DetectionMatch[];
  riskScore?: number;
  riskLevel?: RiskLevel;
  decision?: Decision;
  processingTimeMs?: number;
  traceId?: string;
  moderatorId?: string;
  moderatorAction?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalMessagesChecked: number;
  totalBlocked: number;
  totalWarnings: number;
  totalReviewed: number;
  blockRate: number;
  avgRiskScore: number;
  topViolationTypes: Array<{ type: ViolationType; count: number }>;
  topBlockedUsers: Array<{ userId: string; count: number }>;
  dailyStats: Array<{ date: string; checked: number; blocked: number; warned: number }>;
  escalationStats: Record<EscalationAction, number>;
}

export interface AppealRecord {
  id: string;
  userId: string;
  moderationEventId: string;
  reason: string;
  status: AppealStatus;
  reviewerId?: string;
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE (internal)
// ═══════════════════════════════════════════════════════════════

export interface PipelineInput {
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  messageType?: ContentType;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
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
  detections: DetectionMatch[];
  contextOverrides: string[];
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface PatternCache {
  regexes: Map<string, RegExp>;
  keywords: Map<string, string[]>;
  lastRefresh: number;
}

// ═══════════════════════════════════════════════════════════════
// I18N
// ═══════════════════════════════════════════════════════════════

export interface LocalizedMessages {
  warnings: Record<ViolationType, string>;
  errors: Record<string, string>;
  trust: Record<string, string>;
  escalation: Record<EscalationAction, string>;
}

// ═══════════════════════════════════════════════════════════════
// SECURITY
// ═══════════════════════════════════════════════════════════════

export interface SecurityCheckResult {
  safe: boolean;
  reason?: string;
  sanitizedInput?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}