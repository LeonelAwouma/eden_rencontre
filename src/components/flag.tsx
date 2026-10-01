import { cn } from "@/lib/utils";

/**
 * Drapeau d'un pays (SVG servi depuis public/flags/<ISO>.svg, issus de
 * https://logos.lndev.me — licence MIT, voir public/flags/LICENSE.txt).
 * Image plutôt qu'emoji : sous Windows, les emojis de drapeaux s'affichent
 * en simples lettres (« CM »).
 */
export function Flag({ iso, className }: { iso: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${iso.toUpperCase()}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      draggable={false}
      className={cn("inline-block w-6 h-[18px] rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)] shrink-0", className)}
    />
  );
}
