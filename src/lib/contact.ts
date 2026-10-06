// Coordonnées d'assistance et réseaux sociaux de Garden of Alliance.
export const SUPPORT_PHONE_DISPLAY = "+237 620 51 41 42";
export const SUPPORT_PHONE_E164 = "+237620514142";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/237620514142";

export const SOCIAL_LINKS = {
  tiktok: "https://vt.tiktok.com/ZSbU3uvvT/",
  facebook: "https://www.facebook.com/share/r/1DdAi9aGmW/",
  instagram: "https://www.instagram.com/reel/Dd7oy0aKAMY/?stkn=MTNsdzdydGZ0ODcyMQ==",
  whatsapp: SUPPORT_WHATSAPP_URL,
} as const;

// Logos : public/social/*.svg (issus de https://logos.lndev.me/).
export type SocialLogoName = "tiktok" | "instagram" | "facebook" | "youtube" | "whatsapp";
