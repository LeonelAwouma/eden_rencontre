import Image from "next/image";
import { cn } from "@/lib/utils";

type Placement = "hero-frame" | "corner" | "side-accent" | "centerpiece";
type Corner = "tl" | "tr" | "bl" | "br";
type Fringe = "heavy" | "light" | "none";

interface GardenIllustrationProps {
  src: string;
  placement: Placement;
  corner?: Corner;
  width: number;
  height: number;
  sizes?: string;
  /** Adoucit le liseré de détourage des PNG via un mask-image CSS. */
  fringe?: Fringe;
  opacity?: number;
  shadow?: boolean;
  priority?: boolean;
  className?: string;
}

const defaultSizes: Record<Placement, string> = {
  "hero-frame": "(max-width: 768px) 92vw, (max-width: 1280px) 65vw, 1100px",
  corner: "(max-width: 640px) 45vw, 380px",
  "side-accent": "(max-width: 1024px) 55vw, 460px",
  centerpiece: "(max-width: 640px) 45vw, 260px",
};

// Le dégradé s'étire depuis le coin ancré vers le coin opposé, pour ne jamais
// rogner le motif déjà composé en coin (ex: image_two_garden.png).
const cornerMaskAngle: Record<Corner, string> = {
  tl: "135deg",
  tr: "225deg",
  bl: "45deg",
  br: "315deg",
};

function maskImageFor(placement: Placement, fringe: Fringe, corner?: Corner) {
  if (fringe === "none") return undefined;
  if (placement === "corner" && corner) {
    return `linear-gradient(${cornerMaskAngle[corner]}, black 55%, transparent 100%)`;
  }
  return fringe === "heavy"
    ? "radial-gradient(ellipse 85% 85% at 50% 50%, black 60%, transparent 92%)"
    : "radial-gradient(ellipse 92% 92% at 50% 50%, black 78%, transparent 98%)";
}

/**
 * Illustration florale/animalière décorative (PNG à fond transparent).
 * Standardise le placement des 6 visuels "garden" : dimensionnement responsive,
 * atténuation du liseré de détourage, et ombre douce cohérente avec
 * `shadow-botanical-lg`. Purement décoratif — jamais de contenu informatif.
 */
export function GardenIllustration({
  src,
  placement,
  corner,
  width,
  height,
  sizes,
  fringe = "none",
  opacity = 1,
  shadow,
  priority = false,
  className,
}: GardenIllustrationProps) {
  const maskImage = maskImageFor(placement, fringe, corner);
  const withShadow = shadow ?? (placement === "hero-frame" || placement === "centerpiece");

  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
      style={{
        opacity,
        ...(maskImage
          ? {
              WebkitMaskImage: maskImage,
              maskImage,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }
          : {}),
        ...(withShadow
          ? { filter: "drop-shadow(0 20px 45px hsl(155 42% 18% / 0.18))" }
          : {}),
      }}
    >
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        sizes={sizes ?? defaultSizes[placement]}
        priority={priority}
        className="w-full h-auto"
      />
    </div>
  );
}
