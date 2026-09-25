import type { Metadata } from "next";

// ── Adresse publique du site (SEO) ───────────────────────────────
// Domaine canonique : toutes les balises canonical, Open Graph, le sitemap et
// robots.txt pointent vers lui. Le second domaine doit rediriger (301) ici :
// il protège la marque et récupère les anciens liens sans diluer le référencement.
// NEXT_PUBLIC_SITE_URL permet de le surcharger (préproduction) sans toucher au code.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.gardenofalliance.com").replace(/\/$/, "");
export const SITE_NAME = "Garden of Alliance";
export const SITE_DESCRIPTION =
  "Plateforme matrimoniale haut de gamme dédiée aux célibataires chrétiens d'Afrique et de la diaspora. Un sanctuaire numérique pour bâtir des foyers sur les fondements de la foi.";

/** Espaces privés : jamais indexés (robots.txt + noindex). */
export const PRIVATE_PATHS = [
  "/admin", "/api", "/dashboard", "/onboarding", "/reunion", "/searching",
  "/register/pending", "/reset-password", "/verify-otp", "/forgot-password", "/newsletter",
];


export const OG_IMAGE = { url: "/og-image.jpg", width: 1200, height: 630, alt: "Garden of Alliance — rencontres chrétiennes en vue du mariage." };

/**
 * Métadonnées d'une page publique : titre, description, URL canonique et
 * aperçu de partage. L'objet openGraph d'une page remplace entièrement celui du
 * layout racine (pas de fusion) : on y répète donc le nom du site et l'image.
 */
export function pageMetadata({ path, title, description, image, noindex, type = "website" }: {
  path: string; title: string; description: string;
  image?: { url: string; width?: number; height?: number; alt?: string } | null;
  noindex?: boolean; type?: "website" | "article";
}): Metadata {
  const images = [image || OG_IMAGE];
  const shareTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, locale: "fr_FR", url: path, title: shareTitle, description, images },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
