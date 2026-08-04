/**
 * Eden Connexion — Intelligent Rule-Based Communication Protection Engine
 * Public API — single import point
 * All modules are independently importable for maximum flexibility.
 */

// ── Pipeline (main entry point) ──
export {
  validateMessage,
  calculateRiskScore,
  getTrustLevel,
  canShareContacts,
  getUnlockConditions,
  trackViolation,
} from "./pipeline";
export type { PipelineInput, PipelineOutput } from "./pipeline";

// ── Normalization ──
export {
  normalizeText,
  detectLanguage,
  isWhitelisted,
  extractPhoneCandidates,
  reconstructNumbers,
  tokenize,
  applyCharacterSubstitutions,
  convertNumberWords,
} from "./normalizer";

// ── Detection (all detectors + plugin registry) ──
export {
  runAllDetectors,
  detectPhoneNumbers,
  detectEmails,
  detectURLs,
  detectKeywords,
  detectMoveOffPlatform,
  detectUsernames,
  detectObfuscation,
  detectPatterns,
  registerPlugin,
  unregisterPlugin,
  getAllPlugins,
} from "./detectors";

// ── Context Analysis ──
export { analyzeContext, applyContextToRisk } from "./context";

// ── Configuration ──
export {
  DEFAULT_CONFIG,
  FRIENDLY_WARNINGS,
  OBFUSCATION_PATTERNS,
  MOVE_OFF_PLATFORM_PHRASES,
  USERNAME_PATTERNS,
  PHONE_COUNTRY_PREFIXES,
} from "./config";

// ── Types (re-export all for convenience) ──
export type {
  ModerationConfig,
  ModerationResult,
  RiskScore,
  RiskLevel,
  Decision,
  DetectionMatch,
  DetectionResult,
  ViolationType,
  IntentLabel,
  ContentType,
  EscalationAction,
  EscalationResult,
  EscalationRule,
  ModerationEvent,
  AppealStatus,
  SupportedLanguage,
  NormalizedText,
  KeywordRule,
  PatternRule,
  ContextRule,
  ContextAnalysisResult,
  TrustUnlockCondition,
  TrustProfile,
  TrustRule,
  UserModerationSummary,
  DetectionPlugin,
  PipelineStage,
  PipelineContext,
  ValidateMessageRequest,
  ValidateMessageResponse,
  ValidateImageRequest,
  ValidateFileRequest,
  ModerationHistoryQuery,
  ModerationHistoryResponse,
  ModerationEventRecord,
  DashboardStats,
  AppealRecord,
  CacheEntry,
  PatternCache,
  LocalizedMessages,
  SecurityCheckResult,
  RateLimitResult,
  OCRResult,
  FileInspectionResult,
  QRCodeResult,
} from "./types";