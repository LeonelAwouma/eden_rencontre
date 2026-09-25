import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site";
import { HomePage } from "./home-page";

// Page serveur : déclare les métadonnées (canonical « / »), puis rend l'accueil,
// qui reste un composant client (animations, traductions).
export const metadata = {
  ...pageMetadata({
    path: "/",
    title: "Garden of Alliance — L'alliance bénie commence par une rencontre vraie.",
    description: SITE_DESCRIPTION,
  }),
  // Titre complet sur l'accueil, sans le suffixe « · Garden of Alliance ».
  title: { absolute: "Garden of Alliance — L'alliance bénie commence par une rencontre vraie." },
};

export default function Page() {
  return <HomePage />;
}
