/**
 * Sources de découverte de la plateforme — autrefois demandées à l'inscription
 * (register/page.tsx, onboarding/complete-registration/page.tsx), désormais
 * facultatives et renseignables depuis /dashboard/profile. Noms bruts (pas de
 * clé i18n) : déjà ce qui était enregistré dans profiles.discovery_source,
 * conservé à l'identique pour ne pas diverger des valeurs existantes.
 */
export const DISCOVERY_SOURCE_OPTIONS = [
  "TikTok",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Bouche à oreille",
  "YouTube",
  "Autre",
] as const;
