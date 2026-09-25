import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/blog",
  title: "Blog",
  description: "Conseils, méditations et réflexions sur le couple chrétien, le célibat et la préparation au mariage.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
