import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/mediatheque",
  title: "Médiathèque chrétienne",
  description: "Des ressources pour grandir, discerner et vous préparer à une relation saine et un mariage épanoui : vidéos, guides et parcours.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
