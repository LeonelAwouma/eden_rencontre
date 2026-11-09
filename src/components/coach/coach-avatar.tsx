"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarSrc } from "@/lib/avatar";

/** Photo carrée recadrée en cercle d'un coach ; initiale du nom si aucune photo (ou si elle ne charge pas). */
export function CoachAvatar({ url, name, size = 40, className = "" }: {
  url?: string | null; name?: string | null; size?: 40 | 64 | 96; className?: string;
}) {
  const initial = (name || "C").trim().charAt(0).toUpperCase() || "C";
  const width = size > 64 ? 256 : size > 40 ? 128 : 64;
  return (
    <Avatar className={className} style={{ width: size, height: size }}>
      {url ? <AvatarImage src={avatarSrc(url, width as 64 | 128 | 256)} alt="" className="object-cover" /> : null}
      <AvatarFallback className="bg-[#EEF5EC] text-[#486B46] font-semibold">{initial}</AvatarFallback>
    </Avatar>
  );
}
