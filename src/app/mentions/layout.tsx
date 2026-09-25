import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/mentions",
  title: "Mentions légales",
  description: "Éditeur, hébergement et informations légales de Garden of Alliance.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
