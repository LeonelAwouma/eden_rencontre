// ── Paramètres de la plateforme (table platform_settings) ─────
// SERVEUR UNIQUEMENT (clé de service).
//
// Seuls les réglages listés dans EDITABLE_SETTINGS sont modifiables depuis
// Admin → Paramètres, et chacun a un effet réel dans le code :
//   general.platform_name        nom affiché dans les e-mails (expéditeur, objet, texte)
//   general.contact_email        adresse de réponse et de contact des e-mails
//   notifications.email_enabled  envoi des e-mails de réunion (invitations, reports, annulations)
//   appearance.accent_color      couleur d'accent (AccentColorProvider)
//   appearance.banner_text       bandeau de la page d'accueil (AnnouncementBar)
//   referral.*                   programme de parrainage (src/lib/referrals.ts)
//   subscription.*               droits GOLD effectifs (src/lib/subscription/effective.ts) —
//     commercial_restrictions_enabled est l'interrupteur maître : à false (défaut), aucune
//     des clés ci-dessous n'a d'effet observable (voir le plan feature/referral-gold-rewards).

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const DEFAULT_PLATFORM_NAME = "Garden of Alliance";
export const DEFAULT_CONTACT_EMAIL = "contact@gardenofalliance.com";

type Validator = (value: unknown) => string | null; // message d'erreur ou null

const isEmail = (v: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v);

export const EDITABLE_SETTINGS: Record<string, Validator> = {
  "general.platform_name": (v) =>
    typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 60 && !/[<>"\r\n]/.test(v)
      ? null
      : "Le nom doit contenir entre 2 et 60 caractères, sans < > \" ni retour à la ligne.",
  "general.contact_email": (v) =>
    typeof v === "string" && isEmail(v.trim()) ? null : "Adresse e-mail invalide.",
  "notifications.email_enabled": (v) =>
    typeof v === "boolean" ? null : "Valeur attendue : activé ou désactivé.",
  "appearance.accent_color": (v) =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? null : "Couleur invalide (format #RRGGBB).",
  "appearance.banner_text": (v) =>
    typeof v === "string" && v.length <= 200 ? null : "Le texte du bandeau est limité à 200 caractères.",

  "referral.enabled": (v) => (typeof v === "boolean" ? null : "Valeur attendue : activé ou désactivé."),
  "referral.required_referrals": (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 50 ? null : "Doit être un entier entre 1 et 50.",
  "referral.reward_duration_days": (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 365 ? null : "Doit être un entier entre 1 et 365.",
  "referral.review_delay_days": (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 90 ? null : "Doit être un entier entre 0 et 90.",
  "referral.cumulative_allowed": (v) => (typeof v === "boolean" ? null : "Valeur attendue : activé ou désactivé."),
  "referral.reward_cap": (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 ? null : "Doit être un entier positif (0 = pas de plafond).",
  "referral.campaign_start_at": (v) =>
    v === null || (typeof v === "string" && !isNaN(Date.parse(v))) ? null : "Date invalide.",
  "referral.campaign_end_at": (v) =>
    v === null || (typeof v === "string" && !isNaN(Date.parse(v))) ? null : "Date invalide.",

  "subscription.launch_promo_end_at": (v) =>
    v === null || (typeof v === "string" && !isNaN(Date.parse(v))) ? null : "Date invalide.",
  "subscription.discovery_period_days": (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 365 ? null : "Doit être un entier entre 0 et 365.",
  "subscription.commercial_restrictions_enabled": (v) =>
    typeof v === "boolean" ? null : "Valeur attendue : activé ou désactivé.",
};

export interface EmailSettings {
  platformName: string;
  contactEmail: string;
  meetingEmailsEnabled: boolean;
}

const CACHE_MS = 60_000;
let cache: { at: number; value: EmailSettings } | null = null;

/** À appeler après une modification depuis l'admin. */
export function invalidatePlatformSettingsCache() {
  cache = null;
}

/** Réglages utilisés par les e-mails. En cas d'erreur, valeurs par défaut : un e-mail ne doit jamais échouer pour ça. */
export async function getEmailSettings(): Promise<EmailSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const value: EmailSettings = {
    platformName: DEFAULT_PLATFORM_NAME,
    contactEmail: DEFAULT_CONTACT_EMAIL,
    meetingEmailsEnabled: true,
  };
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("platform_settings")
      .select("category, key, value")
      .in("category", ["general", "notifications"]);
    if (error) throw error;
    for (const row of data || []) {
      const id = `${row.category}.${row.key}`;
      if (EDITABLE_SETTINGS[id]?.(row.value) !== null) continue; // valeur absente de la liste ou invalide : on garde le défaut
      if (id === "general.platform_name") value.platformName = String(row.value).trim();
      if (id === "general.contact_email") value.contactEmail = String(row.value).trim();
      if (id === "notifications.email_enabled") value.meetingEmailsEnabled = row.value === true;
    }
  } catch (err) {
    console.error("[Settings] lecture des paramètres e-mail impossible, valeurs par défaut utilisées:", err);
  }
  cache = { at: Date.now(), value };
  return value;
}
