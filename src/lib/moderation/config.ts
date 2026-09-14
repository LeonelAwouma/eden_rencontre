/**
 * Garden of Alliance — Intelligent Rule-Based Communication Protection Engine
 * Default configuration — all values are configurable via admin panel
 * Every rule, weight, threshold, and dictionary is editable without code changes
 */

import type {
  ModerationConfig,
  KeywordRule,
  PatternRule,
  ContextRule,
  TrustRule,
  EscalationRule,
} from "./types";

// ═══════════════════════════════════════════════════════════════
// KEYWORD DICTIONARY — configurable, each keyword has weight/category/severity
// ═══════════════════════════════════════════════════════════════

const DEFAULT_KEYWORDS: KeywordRule[] = [
  // ── Messaging Platforms ──
  { keyword: "whatsapp", weight: 20, category: "platform", severity: "high", enabled: true },
  { keyword: "whats app", weight: 20, category: "platform", severity: "high", enabled: true },
  { keyword: "whatsap", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "whats'app", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "wapizap", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "telegram", weight: 20, category: "platform", severity: "high", enabled: true },
  { keyword: "tele gram", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "telegrame", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "signal", weight: 20, category: "platform", severity: "high", enabled: true },
  { keyword: "viber", weight: 20, category: "platform", severity: "high", enabled: true },
  { keyword: "line app", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "wechat", weight: 20, category: "platform", severity: "high", enabled: true },
  { keyword: "we chat", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "instagram", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "insta", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "instagr", weight: 14, category: "platform", severity: "medium", enabled: true },
  { keyword: "facebook", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "fb messenger", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "messenger", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "snapchat", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "snap chat", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "snap", weight: 10, category: "platform", severity: "low", enabled: true },
  { keyword: "discord", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "skype", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "tiktok", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "tik tok", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "kik", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "imo", weight: 10, category: "platform", severity: "low", enabled: true },
  { keyword: "imo app", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "zalo", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "qq app", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "linkedin", weight: 12, category: "platform", severity: "low", enabled: true },
  { keyword: "twitter", weight: 12, category: "platform", severity: "low", enabled: true },
  { keyword: "threads.net", weight: 12, category: "platform", severity: "medium", enabled: true },

  // ── Contact / Communication ──
  { keyword: "appel vidéo", weight: 15, category: "contact", severity: "medium", enabled: true },
  { keyword: "appel vocal", weight: 15, category: "contact", severity: "medium", enabled: true },
  { keyword: "visio", weight: 12, category: "contact", severity: "medium", enabled: true },
  { keyword: "email", weight: 12, category: "contact", severity: "medium", enabled: true },
  { keyword: "mail", weight: 8, category: "contact", severity: "low", enabled: true },
  { keyword: "phone", weight: 12, category: "contact", severity: "medium", enabled: true },
  { keyword: "call", weight: 8, category: "contact", severity: "low", enabled: true },
  { keyword: "contact", weight: 8, category: "contact", severity: "low", enabled: true },
  { keyword: "reach me", weight: 12, category: "contact", severity: "medium", enabled: true },
  { keyword: "dm", weight: 10, category: "contact", severity: "low", enabled: true },
  { keyword: "message me", weight: 10, category: "contact", severity: "low", enabled: true },

  // ── Move off platform ──
  { keyword: "outside", weight: 10, category: "move_off", severity: "low", enabled: true },
  { keyword: "external", weight: 10, category: "move_off", severity: "low", enabled: true },

  // ── Alias / coded references to apps ──
  { keyword: "green app", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "blue app", weight: 15, category: "platform", severity: "medium", enabled: true },
  { keyword: "blue messenger", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "camera app", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "bird app", weight: 12, category: "platform", severity: "medium", enabled: true },
  { keyword: "l'application verte", weight: 18, category: "platform", severity: "high", enabled: true },
  { keyword: "l'application bleue", weight: 15, category: "platform", severity: "medium", enabled: true },
];

// ═══════════════════════════════════════════════════════════════
// PATTERN RULES — configurable regex patterns
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PATTERNS: PatternRule[] = [
  // ── Phone number patterns ──
  {
    id: "phone_international",
    name: "International phone with + prefix",
    pattern: "\\+\\d{1,4}[\\s.\\-/]?\\(?(\\d{1,5})\\)?[\\s.\\-/]?\\d{1,5}[\\s.\\-/]?\\d{1,5}[\\s.\\-/]?\\d{0,5}",
    violationType: "PHONE_NUMBER",
    confidence: 0.92,
    severity: "high",
    enabled: true,
    description: "Detects +237 698 12 34 56, +1 415 555 1212, etc.",
  },
  {
    id: "phone_grouped_digits",
    name: "Grouped digits (8-15 length)",
    pattern: "(?:\\d[\\s.\\-/\\(\\)]){7,15}\\d",
    violationType: "PHONE_NUMBER",
    confidence: 0.80,
    severity: "medium",
    enabled: true,
    description: "Digits with separators forming 8+ digit sequences",
  },
  {
    id: "phone_standalone",
    name: "Standalone long digit sequence",
    pattern: "\\b\\d{8,15}\\b",
    violationType: "PHONE_NUMBER",
    confidence: 0.70,
    severity: "medium",
    enabled: true,
    description: "Standalone 8-15 digit sequences",
  },
  {
    id: "phone_french",
    name: "French phone number",
    pattern: "\\b0[1-9][\\s.\\-]?\\d{2}[\\s.\\-]?\\d{2}[\\s.\\-]?\\d{2}[\\s.\\-]?\\d{2}\\b",
    violationType: "PHONE_NUMBER",
    confidence: 0.90,
    severity: "high",
    enabled: true,
    description: "French-style: 06 12 34 56 78",
  },
  {
    id: "phone_us",
    name: "US phone number",
    pattern: "\\(\\d{3}\\)[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{4}",
    violationType: "PHONE_NUMBER",
    confidence: 0.90,
    severity: "high",
    enabled: true,
    description: "US: (415) 555-1212",
  },
  {
    id: "phone_uk",
    name: "UK phone number",
    pattern: "\\+44[\\s.\\-]?\\d{4}[\\s.\\-]?\\d{6}",
    violationType: "PHONE_NUMBER",
    confidence: 0.90,
    severity: "high",
    enabled: true,
    description: "UK: +44 7123 456789",
  },
  {
    id: "phone_german",
    name: "German phone number",
    pattern: "\\+49[\\s.\\-]?\\d{3,4}[\\s.\\-]?\\d{6,8}",
    violationType: "PHONE_NUMBER",
    confidence: 0.90,
    severity: "high",
    enabled: true,
    description: "German: +49 170 1234567",
  },
  {
    id: "phone_arabic",
    name: "Arabic countries phone number",
    pattern: "\\+2[0-6][0-9][\\s.\\-]?\\d{3,4}[\\s.\\-]?\\d{5,7}",
    violationType: "PHONE_NUMBER",
    confidence: 0.88,
    severity: "high",
    enabled: true,
    description: "+212, +213, +216, etc.",
  },

  // ── Email pattern ──
  {
    id: "email",
    name: "Email address",
    pattern: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}",
    violationType: "EMAIL_ADDRESS",
    confidence: 0.95,
    severity: "high",
    enabled: true,
    description: "user@domain.com",
  },

  // ── URL patterns ──
  {
    id: "url_http",
    name: "HTTP/HTTPS URL",
    pattern: "https?://[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.95,
    severity: "high",
    enabled: true,
    description: "Full URLs with http/https",
  },
  {
    id: "url_www",
    name: "WWW URL",
    pattern: "www\\.[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.85,
    severity: "medium",
    enabled: true,
    description: "www.example.com",
  },
  {
    id: "url_domain_com",
    name: ".com domain",
    pattern: "\\b\\w+\\.com\\b",
    violationType: "URL_DETECTED",
    confidence: 0.50,
    severity: "low",
    enabled: true,
    description: "example.com",
  },
  {
    id: "url_domain_org",
    name: ".org domain",
    pattern: "\\b\\w+\\.org\\b",
    violationType: "URL_DETECTED",
    confidence: 0.50,
    severity: "low",
    enabled: true,
  },
  {
    id: "url_domain_net",
    name: ".net domain",
    pattern: "\\b\\w+\\.net\\b",
    violationType: "URL_DETECTED",
    confidence: 0.50,
    severity: "low",
    enabled: true,
  },
  {
    id: "url_domain_fr",
    name: ".fr domain",
    pattern: "\\b\\w+\\.fr\\b",
    violationType: "URL_DETECTED",
    confidence: 0.50,
    severity: "low",
    enabled: true,
  },
  {
    id: "url_shortener_bitly",
    name: "Bit.ly shortener",
    pattern: "bit\\.ly/[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.92,
    severity: "high",
    enabled: true,
  },
  {
    id: "url_shortener_tinyurl",
    name: "TinyURL shortener",
    pattern: "tinyurl\\.com/[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.92,
    severity: "high",
    enabled: true,
  },
  {
    id: "url_telegram_link",
    name: "Telegram t.me link",
    pattern: "t\\.me/[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.95,
    severity: "critical",
    enabled: true,
  },
  {
    id: "url_whatsapp_link",
    name: "WhatsApp wa.me link",
    pattern: "wa\\.me/[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.95,
    severity: "critical",
    enabled: true,
  },
  {
    id: "url_discord_invite",
    name: "Discord invite link",
    pattern: "discord\\.gg/[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.92,
    severity: "high",
    enabled: true,
  },
  {
    id: "url_social_links",
    name: "Social platform links",
    pattern: "(?:fb\\.com|ig\\.me|l\\.ink|linktr\\.ee|lnk\\.to)/[^\\s]+",
    violationType: "URL_DETECTED",
    confidence: 0.90,
    severity: "high",
    enabled: true,
  },

  // ── Username patterns ──
  {
    id: "username_at",
    name: "@username handle",
    pattern: "@\\w{3,30}",
    violationType: "USERNAME_DETECTED",
    confidence: 0.70,
    severity: "medium",
    enabled: true,
    description: "@username",
  },
  {
    id: "username_platform",
    name: "Platform username references",
    pattern: "(?:ig|insta|snap|telegram|discord|skype)\\s*:\\s*@?\\w+",
    violationType: "USERNAME_DETECTED",
    confidence: 0.85,
    severity: "high",
    enabled: true,
    description: "ig: username, insta: username, etc.",
  },
  {
    id: "username_social_urls",
    name: "Social media profile URLs",
    pattern: "(?:facebook\\.com|instagram\\.com|tiktok\\.com|twitter\\.com|x\\.com|linkedin\\.com|snapchat\\.com|youtube\\.com|threads\\.net)/[\\w@]+",
    violationType: "USERNAME_DETECTED",
    confidence: 0.90,
    severity: "high",
    enabled: true,
    description: "Social profile links",
  },
];

// ═══════════════════════════════════════════════════════════════
// CONTEXT RULES — false positive prevention
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CONTEXT_RULES: ContextRule[] = [
  {
    id: "bible_reference",
    name: "Bible Verses & References",
    description: "Bible verse references (John 3:16, Psalm 23, etc.) should not be blocked",
    safePatterns: [
      // English
      "\\b(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm|proverbs|ecclesiastes|song|isaiah|jeremiah|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\\s+\\d+",
      // French
      "\\b(?:gen[èe]se|exode|l[ée]vitique|nombres|deut[ée]ronome|josu[ée]|juges|ruth|sa|maccab[ée]es|esdras|neh[ée]mie|esther|job|psaume|proverbes|eccl[ée]siaste|cantique|esa[ïi]e|j[ée]r[ée]mie|[ée]z[ée]chiel|daniel|os[ée]|jo[ée]l|amos|abdias|jonas|mic[ée]e|nahum|habacuc|sophonie|agg[ée]e|zacharie|malachie|matthieu|marc|luc|actes|romains|galates|[ée]ph[ée]siens|colossiens|h[ée]breux|jacques|jude|apocalypse)\\s+\\d+",
      // Spanish / Portuguese / German / Italian
      "\\b(?:g[ée]nesis|éxodo|levítico|números|deuteronomio|josué|jueces|rut|reyes|crónicas|esdras|nehemías|ester|salmo|proverbios|eclesiastés|cantar|isaías|jeremías|ezequiel|oseas|joel|amós|abdías|jonás|miqueas|habacuc|sofonías|hageo|zacarías|mateo|marcos|lucas|hechos|romanos|gálatas|efesios|filipenses|colosenses|tesalonicenses|timoteo|tito|filemón|hebreos|santiago|pedro|judas|apocalipsis)\\s+\\d+",
      "\\b\\d+\\s*(?:samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john|cor|thes|sam|chr|tim|pet)\\s*\\d+[:\\.]\\d+",
    ],
    triggerKeywords: ["psalm", "psaume", "john", "matthew", "mark", "luke", "genesis", "exodus", "romans", "corinthians"],
    maxRiskOverride: 10,
    riskReductionFactor: 0.1,
    enabled: true,
  },
  {
    id: "meeting_schedule",
    name: "Church Meeting / Event Schedule",
    description: "Meeting times and dates should not be flagged",
    safePatterns: [
      "\\b\\d{1,2}[h:]\\d{2}\\b",
      "\\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miércoles|jueves|viernes|sábado|domingo|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|segunda|terça|quarta|quinta|sexta|s[áa]bado|domingo)\\b",
    ],
    triggerKeywords: ["meeting", "service", "gathering", "church", "église", "culte", "réunion", "événement", "event", "schedule", "horaire"],
    maxRiskOverride: 10,
    riskReductionFactor: 0.15,
    enabled: true,
  },
  {
    id: "reference_numbers",
    name: "Reference / Order / Invoice Numbers",
    description: "Postal codes, order numbers, invoice numbers should not be blocked",
    safePatterns: [
      "\\b\\d{5}\\b",         // Postal codes
      "eden[_\\-]?\\d+",      // Eden meeting IDs
      "#\\d{4,}",             // Order / reference numbers
      "n[°o]?\\s*\\d{4,}",   // Number references
    ],
    triggerKeywords: ["order", "invoice", "reference", "commande", "facture", "référence", "code postal", "postal code"],
    maxRiskOverride: 10,
    riskReductionFactor: 0.1,
    enabled: true,
  },
  {
    id: "safe_conversation",
    name: "General Safe Context",
    description: "Reduces risk when surrounded by safe contextual words",
    safePatterns: [],
    triggerKeywords: ["bible", "verse", "church", "pray", "prayer", "prière", "église", "sermon", "worship", "louange", "worship", "culte"],
    maxRiskOverride: 15,
    riskReductionFactor: 0.2,
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// TRUST RULES — configurable progressive trust conditions
// ═══════════════════════════════════════════════════════════════

const DEFAULT_TRUST_RULES: TrustRule[] = [
  {
    id: "min_account_age",
    name: "Minimum Account Age",
    description: "User must have been active for a minimum number of days",
    conditionType: "days",
    threshold: 7,
    weight: 25,
    required: true,
    enabled: true,
  },
  {
    id: "min_messages",
    name: "Minimum Messages Exchanged",
    description: "User must have sent/received a minimum number of messages",
    conditionType: "messages",
    threshold: 300,
    weight: 25,
    required: true,
    enabled: true,
  },
  {
    id: "mutual_interaction",
    name: "Mutual Interaction Score",
    description: "Both users must have engaged in conversation",
    conditionType: "interaction",
    threshold: 50,
    weight: 20,
    required: false,
    enabled: true,
  },
  {
    id: "identity_verification",
    name: "Identity Verified",
    description: "User identity has been verified",
    conditionType: "verified",
    threshold: 1,
    weight: 15,
    required: false,
    enabled: false,
  },
  {
    id: "premium_subscription",
    name: "Premium Subscription",
    description: "User has an active premium subscription",
    conditionType: "premium",
    threshold: 1,
    weight: 10,
    required: false,
    enabled: false,
  },
  {
    id: "mutual_consent",
    name: "Mutual Consent",
    description: "Both users have consented to contact sharing",
    conditionType: "consent",
    threshold: 1,
    weight: 15,
    required: true,
    enabled: true,
  },
  {
    id: "admin_approval",
    name: "Administrator Approval",
    description: "Admin has approved this user for contact sharing",
    conditionType: "admin",
    threshold: 1,
    weight: 20,
    required: false,
    enabled: false,
  },
];

// ═══════════════════════════════════════════════════════════════
// ESCALATION RULES — configurable progressive sanctions
// ═══════════════════════════════════════════════════════════════

const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: "warning",
    name: "Warning",
    level: 1,
    action: "warning",
    violationThreshold: 1,
    timeWindowDays: 7,
    durationHours: 0,
    description: "First violation triggers a warning",
    enabled: true,
  },
  {
    id: "temp_mute",
    name: "Temporary Mute",
    level: 2,
    action: "temp_mute",
    violationThreshold: 3,
    timeWindowDays: 7,
    durationHours: 1,
    description: "3 violations in 7 days = 1 hour mute",
    enabled: true,
  },
  {
    id: "restriction_24h",
    name: "24-Hour Restriction",
    level: 3,
    action: "restriction_24h",
    violationThreshold: 5,
    timeWindowDays: 14,
    durationHours: 24,
    description: "5 violations in 14 days = 24h restriction",
    enabled: true,
  },
  {
    id: "restriction_7d",
    name: "7-Day Restriction",
    level: 4,
    action: "restriction_7d",
    violationThreshold: 10,
    timeWindowDays: 30,
    durationHours: 168,
    description: "10 violations in 30 days = 7-day restriction",
    enabled: true,
  },
  {
    id: "permanent",
    name: "Permanent Suspension",
    level: 5,
    action: "permanent_suspension",
    violationThreshold: 20,
    timeWindowDays: 90,
    durationHours: 0,
    description: "20 violations in 90 days = permanent suspension",
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// CHARACTER SUBSTITUTION MAP
// ═══════════════════════════════════════════════════════════════

const DEFAULT_CHARACTER_SUBSTITUTIONS: Record<string, string> = {
  "O": "0", "o": "0",
  "I": "1", "l": "1",
  "S": "5", "s": "5",
  "B": "8",
  "@": "at",
  ".": " ",
  "*": " ",
  "_": " ",
  // Numbers that look like letters (reverse)
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
};

// ═══════════════════════════════════════════════════════════════
// NUMBER WORD DICTIONARIES — multilingual
// ═══════════════════════════════════════════════════════════════

const DEFAULT_NUMBER_WORD_DICTIONARIES: Record<string, string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  fr: ["zéro", "zero", "un", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"],
  es: ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"],
  pt: ["zero", "um", "dois", "três", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove"],
  de: ["null", "eins", "zwei", "drei", "vier", "fünf", "funf", "sechs", "sieben", "acht", "neun"],
  it: ["zero", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"],
};

// ═══════════════════════════════════════════════════════════════
// HOMOGLYPH MAP — characters that look similar
// ═══════════════════════════════════════════════════════════════

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
  "Ａ": "A", "Ｂ": "B", "Ｃ": "C", "Ｄ": "D", "Ｅ": "E", "Ｆ": "F", "Ｇ": "G", "Ｈ": "H",
  "Ｉ": "I", "Ｊ": "J", "Ｋ": "K", "Ｌ": "L", "Ｍ": "M", "Ｎ": "N", "Ｏ": "O", "Ｐ": "P",
  "Ｑ": "Q", "Ｒ": "R", "Ｓ": "S", "Ｔ": "T", "Ｕ": "U", "Ｖ": "V", "Ｗ": "W", "Ｘ": "X",
  "Ｙ": "Y", "Ｚ": "Z",
  "ａ": "a", "ｂ": "b", "ｃ": "c", "ｄ": "d", "ｅ": "e", "ｆ": "f", "ｇ": "g", "ｈ": "h",
  "ｉ": "i", "ｊ": "j", "ｋ": "k", "ｌ": "l", "ｍ": "m", "ｎ": "n", "ｏ": "o", "ｐ": "p",
  "ｑ": "q", "ｒ": "r", "ｓ": "s", "ｔ": "t", "ｕ": "u", "ｖ": "v", "ｗ": "w", "ｘ": "x",
  "ｙ": "y", "ｚ": "z",
};

// ═══════════════════════════════════════════════════════════════
// EMOJI / SUPERSCRIPT / SUBSCRIPT DIGIT MAPS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_EMOJI_DIGIT_MAP = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

const DEFAULT_SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

const DEFAULT_SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};

const DEFAULT_LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
};

// ═══════════════════════════════════════════════════════════════
// MOVE-OFF-PLATFORM PHRASES
// ═══════════════════════════════════════════════════════════════

const DEFAULT_MOVE_OFF_PLATFORM_PHRASES = [
  // English
  "add me on", "contact me on", "search me on", "find me on",
  "my instagram", "my telegram", "my whatsapp", "my snap", "my discord",
  "let's continue outside", "continue elsewhere", "talk on",
  "call me", "text me", "message me on",
  "i'll give you my", "here's my number", "my number is",
  "green app", "blue app", "the green one", "the blue one",
  "wa ", "wa:", "insta:", "ig:", "snap:", "dc:", "tg:", "fb:",
  "let's chat on", "move to", "switch to",
  // French
  "ajoute-moi sur", "ajoutez-moi sur", "contacte-moi sur", "cherche-moi sur",
  "trouve-moi sur", "mon instagram", "mon insta", "mon telegram",
  "mon whatsapp", "mon snap", "mon discord",
  "continuons dehors", "parlons ailleurs", "parler sur", "parler par",
  "écrire sur", "appelle-moi", "texte-moi",
  "je te donne mon", "voici mon numéro", "mon numéro",
  "l'application verte", "l'application bleue",
  "parle-moi sur", "contacte-moi par",
  // Spanish
  "agregame en", "búscame en", "mi instagram", "mi telegram",
  "mi whatsapp", "mi snapchat", "escribeme al",
  "continuemos fuera", "hablemos por", "mi número es",
  // Portuguese
  "me adicione no", "me procure no", "meu instagram", "meu telegram",
  "meu whatsapp", "vamos continuar fora",
  // German
  "füg mich hinzu auf", "such mich auf", "mein instagram", "mein whatsapp",
  "schreib mir auf", "ruf mich an",
  // Italian
  "aggiungimi su", "cerca mi su", "il mio instagram", "il mio whatsapp",
  "scrivimi su", "chiamami",
];

// ═══════════════════════════════════════════════════════════════
// USERNAME PATTERNS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_USERNAME_PATTERNS = [
  "@\\w{3,30}",
  "ig:\\s*\\w+", "insta:\\s*\\w+", "snap:\\s*\\w+",
  "telegram:\\s*@?\\w+", "discord:\\s*@?\\w+\\#?\\d*",
  "skype:\\s*\\w+", "facebook\\.com/\\w+", "instagram\\.com/\\w+",
  "t\\.me/\\w+", "wa\\.me/\\d+", "tiktok\\.com/@\\w+",
  "twitter\\.com/\\w+", "x\\.com/\\w+",
  "linkedin\\.com/in/\\w+", "snapchat\\.com/add/\\w+",
  "youtube\\.com/@\\w+", "threads\\.net/@\\w+",
];

// ═══════════════════════════════════════════════════════════════
// PHONE COUNTRY PREFIXES
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PHONE_COUNTRY_PREFIXES = [
  "237", "234", "235", "236", "240", "241", "242", "243", "244", "245",
  "250", "254", "255", "256", "257", "260", "261", "262", "263", "265",
  "266", "267", "268", "269", "290", "291", "297", "298", "299",
  "212", "213", "216", "218", "220", "221", "222", "223", "224", "225",
  "226", "227", "228", "229", "230", "231", "232", "233", "238", "239",
  "246", "247", "248", "249", "251", "252", "253", "258", "264",
  "33", "34", "39", "44", "49", "1", "51", "52", "53", "54", "55",
  "56", "57", "58", "60", "61", "62", "63", "64", "65", "66",
  "81", "82", "84", "86", "90", "91", "92", "93", "94", "95",
  "500", "501", "502", "503", "504", "505", "506", "507", "508", "509",
  "590", "591", "592", "593", "594", "595", "596", "597", "598", "599",
];

// ═══════════════════════════════════════════════════════════════
// SAFE DOMAINS — never block these
// ═══════════════════════════════════════════════════════════════

const DEFAULT_SAFE_DOMAINS = [
  "example.com", "test.com", "localhost",
];

// ═══════════════════════════════════════════════════════════════
// WHITELISTED PATTERNS — false-positive prevention
// ═══════════════════════════════════════════════════════════════

const DEFAULT_WHITELISTED_PATTERNS = [
  // Bible references
  "\\b\\d+\\s*(?:samuel|kings|chronicles|corinthians|thessalonians|timothy|peter|john|cor|thes|sam|chr|tim|pet)\\s*\\d+[:\\.]\\d+",
  "\\b(?:gen[èe]se|exode|l[ée]vitique|nombres|deut[ée]ronome|josu[ée]|juges|ruth|sa|maccab[ée]es|esdras|neh[ée]mie|esther|job|psaume|proverbes|eccl[ée]siaste|cantique|esa[ïi]e|j[ée]r[ée]mie|[ée]z[ée]chiel|daniel|os[ée]|jo[ée]l|amos|abdias|jonas|mic[ée]e|nahum|habacuc|sophonie|agg[ée]e|zacharie|malachie|matthieu|marc|luc|actes|romains|galates|[ée]ph[ée]siens|colossiens|h[ée]breux|jacques|jude|apocalypse)\\s+\\d+",
  "\\b(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm|proverbs|ecclesiastes|song|isaiah|jeremiah|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\\s+\\d+",
  "\\b(?:g[ée]nesis|éxodo|levítico|números|deuteronomio|josué|jueces|rut|samuel|reyes|crónicas|esdras|nehemías|ester|job|salmo|proverbios|eclesiastés|cantar|isaías|jeremías|ezequiel|daniel|oseas|joel|amós|abdías|jonás|miqueas|nahum|habacuc|sofonías|hageo|zacarías|Malaquías|mateo|marcos|lucas|hechos|romanos|gálatas|efesios|filipenses|colosenses|tesalonicenses|timoteo|tito|filemón|hebreos|santiago|pedro|judas|apocalipsis)\\s+\\d+",
  // Times / dates
  "\\b\\d{1,2}[h:]\\d{2}\\b",
  "\\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b",
  // Postal codes
  "\\b\\d{5}\\b",
  // IDs / references
  "eden[_\\-]?\\d+",
  "#\\d{4,}",
  "n[°o]?\\s*\\d{4,}",
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONFIG — full export
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_CONFIG: ModerationConfig = {
  weights: {
    PHONE_NUMBER: 50,
    EMAIL_ADDRESS: 50,
    URL_DETECTED: 30,
    SOCIAL_MEDIA_KEYWORD: 20,
    USERNAME_DETECTED: 25,
    BLACKLIST_KEYWORD: 15,
    MOVE_OFF_PLATFORM: 60,
    OBFUSCATION: 25,
    QR_CODE: 40,
    IMAGE_TEXT: 45,
    FILE_CONTENT: 40,
    REPEATED_ATTEMPTS: 30,
    MULTIPLE_INDICATORS: 20,
  },

  thresholds: {
    safe: 20,
    warning: 40,
    review: 60,
    block: 61,
  },

  keywords: DEFAULT_KEYWORDS,
  patterns: DEFAULT_PATTERNS,
  contextRules: DEFAULT_CONTEXT_RULES,
  trustRules: DEFAULT_TRUST_RULES,
  escalationRules: DEFAULT_ESCALATION_RULES,
  whitelistedPatterns: DEFAULT_WHITELISTED_PATTERNS,
  phoneCountryPrefixes: DEFAULT_PHONE_COUNTRY_PREFIXES,
  moveOffPlatformPhrases: DEFAULT_MOVE_OFF_PLATFORM_PHRASES,
  usernamePatterns: DEFAULT_USERNAME_PATTERNS,
  characterSubstitutions: DEFAULT_CHARACTER_SUBSTITUTIONS,
  numberWordDictionaries: DEFAULT_NUMBER_WORD_DICTIONARIES,
  homoglyphMap: DEFAULT_HOMOGLYPH_MAP,
  emojiDigitMap: DEFAULT_EMOJI_DIGIT_MAP,
  superscriptDigits: DEFAULT_SUPERSCRIPT_DIGITS,
  subscriptDigits: DEFAULT_SUBSCRIPT_DIGITS,
  leetMap: DEFAULT_LEET_MAP,
  safeDomains: DEFAULT_SAFE_DOMAINS,

  features: {
    enableObfuscationDetection: true,
    enableRepeatOffenderTracking: true,
    enableFileInspection: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    enableMultilingual: true,
    enableContextAnalysis: true,
    enableNumberReconstruction: true,
    enableNumberWordConversion: true,
    enableCharacterSubstitutionDetection: true,
  },

  rateLimit: {
    maxMessagesPerMinute: 60,
    maxViolationsPerHour: 10,
    cooldownMinutes: 5,
  },

  security: {
    maxInputLength: 5000,
    enableRegexTimeout: true,
    regexTimeoutMs: 50,
    maxUnicodeNormalizationDepth: 3,
  },
};

// ═══════════════════════════════════════════════════════════════
// FRIENDLY WARNINGS — localized messages
// ═══════════════════════════════════════════════════════════════

export const FRIENDLY_WARNINGS: Record<string, string> = {
  PHONE_NUMBER: "Pour votre sécurité, le partage de numéros de téléphone n'est pas encore disponible. Continuez à échanger ici jusqu'à ce que les conditions de confiance soient remplies.",
  EMAIL_ADDRESS: "Le partage d'adresses e-mail n'est pas encore autorisé. Votre messagerie intégrée vous protège.",
  URL_DETECTED: "Les liens externes ne sont pas encore autorisés dans les premiers échanges.",
  SOCIAL_MEDIA_KEYWORD: "Pour votre sécurité et votre vie privée, le partage de réseaux sociaux n'est pas encore disponible.",
  MOVE_OFF_PLATFORM: "Nous vous encourageons à poursuivre vos échanges ici. Après 1 mois, vous pourrez organiser un tête-à-tête vidéo sécurisé !",
  USERNAME_DETECTED: "Le partage d'identifiants externes n'est pas encore disponible.",
  BLACKLIST_KEYWORD: "Ce contenu ne peut pas être envoyé pour des raisons de sécurité.",
  OBFUSCATION: "Pour votre protection, certaines formes de contact ne sont pas encore autorisées.",
  MULTIPLE_INDICATORS: "Plusieurs indicateurs suspects ont été détectés dans votre message.",
  REPEATED_ATTEMPTS: "Des tentatives répétées de partage de contact ont été détectées.",
  QR_CODE: "Le partage de codes QR n'est pas encore autorisé.",
  IMAGE_TEXT: "Le texte extrait de l'image contient des informations de contact non autorisées.",
  FILE_CONTENT: "Le contenu du fichier contient des informations de contact non autorisées.",
};

// Re-export obfuscation patterns for backward compatibility
export const OBFUSCATION_PATTERNS = {
  emojiDigits: DEFAULT_EMOJI_DIGIT_MAP,
  digitWords: DEFAULT_NUMBER_WORD_DICTIONARIES,
  leetMap: DEFAULT_LEET_MAP,
  homoglyphs: DEFAULT_HOMOGLYPH_MAP,
  superscriptDigits: DEFAULT_SUPERSCRIPT_DIGITS,
  subscriptDigits: DEFAULT_SUBSCRIPT_DIGITS,
};

export const MOVE_OFF_PLATFORM_PHRASES = DEFAULT_MOVE_OFF_PLATFORM_PHRASES;
export const USERNAME_PATTERNS = DEFAULT_USERNAME_PATTERNS;
export const PHONE_COUNTRY_PREFIXES = DEFAULT_PHONE_COUNTRY_PREFIXES;