import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/temoignages",
  title: "Témoignages",
  description: "Des couples chrétiens racontent leur rencontre sur Garden of Alliance et leur chemin vers le mariage.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
