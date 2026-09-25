import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/cgu",
  title: "Conditions générales d'utilisation",
  description: "Les conditions d'utilisation de la plateforme Garden of Alliance.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
