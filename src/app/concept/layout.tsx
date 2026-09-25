import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/concept",
  title: "Notre concept",
  description: "Éthique, discernement et communauté : comment Garden of Alliance accompagne les célibataires chrétiens vers une rencontre vraie et le mariage.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
