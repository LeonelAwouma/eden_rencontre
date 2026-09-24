"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CHAT_EMOJIS } from "@/lib/chat";

/** Emoji Fluent 3D, avec repli sur le caractère natif si l'image ne charge pas. */
export function FluentEmoji({ char, url, className }: { char: string; url: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <span className={cn("inline-flex items-center justify-center text-lg leading-none", className)}>{char}</span>;
  return <img src={url} alt={char} loading="lazy" draggable={false} className={className} onError={() => setErr(true)} />;
}

/** Emojis du sélecteur de la messagerie, regroupés par catégorie (ordre de la source). */
export const EMOJI_CATEGORIES: { category: string; emojis: typeof CHAT_EMOJIS }[] = CHAT_EMOJIS.reduce(
  (groups: { category: string; emojis: typeof CHAT_EMOJIS }[], emoji) => {
    const group = groups.find((g) => g.category === emoji.category);
    if (group) group.emojis.push(emoji);
    else groups.push({ category: emoji.category, emojis: [emoji] });
    return groups;
  },
  []
);
