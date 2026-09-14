import Image from "next/image";
import { cn } from "@/lib/utils";

type Corner = "tl" | "tr" | "bl" | "br";

/**
 * Brin fleuri découpé de decor.webp — le bouquet latéral de l'emblème d'alliance,
 * sans les anneaux ni le filet.
 *
 * Sert d'ornement de coin : même aquarelle que le séparateur, au lieu des
 * bouquets SVG anguleux d'avant. Le brin pousse depuis le coin, tige à l'angle
 * et fleur vers l'intérieur ; les coins droits et bas sont obtenus par symétrie.
 */
const cornerTransform: Record<Corner, string> = {
  tl: "rotate(-12deg)",
  tr: "scaleX(-1) rotate(-12deg)",
  bl: "scaleY(-1) rotate(-12deg)",
  br: "scale(-1) rotate(-12deg)",
};

export function DecorSprig({
  position,
  className,
  style,
}: {
  position: Corner;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("block", className)}
      style={{ ...style, transform: cornerTransform[position] }}
      aria-hidden="true"
    >
      <Image
        src="/decor-sprig.webp"
        alt=""
        width={184}
        height={131}
        sizes="(max-width: 640px) 200px, 300px"
        className="w-full h-full object-contain object-left-top"
      />
    </span>
  );
}
