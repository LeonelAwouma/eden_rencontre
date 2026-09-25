import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/contact",
  title: "Contact",
  description: "Écrivez à l'équipe Garden of Alliance pour une question, un signalement ou un partenariat.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
