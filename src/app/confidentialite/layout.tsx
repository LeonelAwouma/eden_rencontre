import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/confidentialite",
  title: "Politique de confidentialité",
  description: "Comment Garden of Alliance collecte, utilise et protège vos données personnelles.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
