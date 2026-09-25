import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/parcours",
  title: "Votre chemin vers l'alliance",
  description: "Profil de foi, profil vérifié et sécurisé, découverte et édification : les étapes du parcours Garden of Alliance jusqu'à l'alliance.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
