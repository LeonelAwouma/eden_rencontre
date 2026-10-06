import { SupportFloat } from "@/components/support-float";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SupportFloat />
    </>
  );
}
