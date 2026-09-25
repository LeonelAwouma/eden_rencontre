import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/faq",
  title: "Questions fréquentes",
  description: "Inscription, vérification des profils, abonnements, sécurité : les réponses à vos questions sur Garden of Alliance.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
