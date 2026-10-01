import type { MetadataRoute } from "next";

/**
 * Manifeste d'application : permet d'ajouter Garden of Alliance à l'écran
 * d'accueil du téléphone. Indispensable sur iPhone, où les notifications web
 * ne fonctionnent que pour un site ajouté à l'écran d'accueil (iOS 16.4+).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Garden of Alliance",
    short_name: "Garden",
    description: "La rencontre chrétienne en vue du mariage.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#FAF9F6",
    theme_color: "#486B46",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
