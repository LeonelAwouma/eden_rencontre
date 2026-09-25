import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/tarifs",
  title: "Tarifs et formules",
  description: "Formules Bronze, Argent et Or, en paiement mensuel ou annuel avec 10 % de remise, pour des rencontres chrétiennes en vue du mariage.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
