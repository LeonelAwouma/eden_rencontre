import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/charte",
  title: "Charte éthique",
  description: "Les engagements de respect, de vérité et d'intégrité que chaque membre de Garden of Alliance accepte pour des rencontres saines.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
