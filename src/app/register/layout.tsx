import { pageMetadata } from "@/lib/site";
import { SupportFloat } from "@/components/support-float";

export const metadata = pageMetadata({
  path: "/register",
  title: "Inscription",
  description: "Rejoignez Garden of Alliance, la plateforme de rencontres chrétiennes sérieuses en vue du mariage, en Afrique et dans la diaspora.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SupportFloat />
    </>
  );
}
