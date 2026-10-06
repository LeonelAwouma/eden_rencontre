import type { SocialLogoName } from "@/lib/contact";

export function SocialLogo({ name, className = "w-5 h-5" }: { name: SocialLogoName; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/social/${name}.svg`} alt="" aria-hidden="true" className={`object-contain ${className}`} />;
}
