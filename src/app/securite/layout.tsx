import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/securite",
  title: "Sécurité",
  description: "Nos mesures et nos conseils pour des rencontres en ligne sûres : vérification des profils, modération et bonnes pratiques.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
