import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/login",
  title: "Connexion",
  description: "Connectez-vous à votre espace membre Garden of Alliance.",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
