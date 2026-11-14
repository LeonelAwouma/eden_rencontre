import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/qui-sommes-nous",
  title: "Qui sommes-nous ? Les fondateurs et l'équipe",
  description:
    "Carlos Kakaile et Anne Justine Etindele ont fondé Garden of Alliance : une vision fondée sur la foi et la famille, une équipe d'experts et un accompagnement pour bâtir un foyer sur le roc.",
  image: { url: "/images/team/fondateurs-garden-of-alliance.webp", width: 386, height: 512, alt: "Carlos Kakaile et Anne Justine Etindele, fondateurs de Garden of Alliance" },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
