"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FORUM_STICKERS, findSticker, messagePreview, type ForumMessage } from "@/lib/forum-shared";

/** Un sticker : grand emoji 3D détouré et sa légende (dans la langue du lecteur). */
export function Sticker({ id, label, size = "md" }: { id: string; label: string; size?: "sm" | "md" }) {
  const s = findSticker(id);
  const [err, setErr] = useState(false);
  if (!s) return null;
  const dim = size === "sm" ? "w-14 h-14" : "w-[104px] h-[104px]";
  return (
    <span className="inline-flex flex-col items-center select-none" role="img" aria-label={label}>
      {err ? (
        <span className={cn(dim, "flex items-center justify-center", size === "sm" ? "text-4xl" : "text-[72px]")}>{s.char}</span>
      ) : (
        // Contour blanc + ombre : l'effet « autocollant » de WhatsApp.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.url} alt="" draggable={false} loading="lazy" onError={() => setErr(true)}
          className={cn(dim, "object-contain [filter:drop-shadow(0_0_1.5px_#fff)_drop-shadow(0_0_1.5px_#fff)_drop-shadow(0_3px_6px_rgba(38,70,52,0.22))]")} />
      )}
      <span className={cn("-mt-1.5 px-2.5 py-0.5 rounded-full bg-white border border-border font-headline font-bold text-primary shadow-sm whitespace-nowrap",
        size === "sm" ? "text-[10px]" : "text-[12.5px]")}>
        {label}
      </span>
    </span>
  );
}

/** Planche de stickers du compositeur. */
export function StickerPicker({ onPick, labelFor }: { onPick: (id: string) => void; labelFor: (id: string) => string }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-2">
      {FORUM_STICKERS.map((s) => (
        <button key={s.id} type="button" onClick={() => onPick(s.id)} title={labelFor(s.id)}
          className="rounded-xl p-1.5 hover:bg-primary/10 focus-visible:bg-primary/10 outline-none transition-colors flex justify-center">
          <Sticker id={s.id} label={labelFor(s.id)} size="sm" />
        </button>
      ))}
    </div>
  );
}

/** Citation d'un message (réponse), dans la bulle ou au-dessus du compositeur. */
export function QuoteBlock({ name, text, mine, className }: { name: string; text: string; mine?: boolean; className?: string }) {
  return (
    <span className={cn("block border-l-[3px] rounded-md px-2.5 py-1.5 text-[12.5px] leading-snug",
      mine ? "bg-white/15 border-white/70" : "bg-primary/[0.06] border-primary/60", className)}>
      <span className={cn("block font-semibold truncate", mine ? "text-white" : "text-primary")}>{name}</span>
      <span className={cn("block line-clamp-2 break-words", mine ? "text-white/85" : "text-[#56615A]")}>{text}</span>
    </span>
  );
}

/**
 * Bulle de message du groupe. `mine` : à droite, en vert. Les messages de
 * l'équipe portent un badge. `actions` : menu propre à chaque espace.
 */
export function ForumBubble({
  m, mine, showAuthor, authorName, staffBadge, stickerLabel, quoteAuthor, unavailableQuote, time, actions, highlight, onQuoteClick,
}: {
  m: ForumMessage;
  mine: boolean;
  /** Premier message d'une suite du même auteur : nom + avatar affichés. */
  showAuthor: boolean;
  authorName: string;
  staffBadge: string;
  stickerLabel: (id: string) => string;
  quoteAuthor: (q: NonNullable<ForumMessage["reply_to"]>) => string;
  unavailableQuote: string;
  time: string;
  actions?: React.ReactNode;
  highlight?: boolean;
  onQuoteClick?: (id: string) => void;
}) {
  const sticker = m.sticker ? findSticker(m.sticker) : null;
  const stickerOnly = !!sticker && !m.body.trim() && !m.reply_to_id;
  const quote = m.reply_to;

  return (
    <div id={`msg-${m.id}`} className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start", showAuthor ? "mt-3" : "mt-0.5")}>
      {!mine && (
        <span className="w-8 shrink-0">
          {showAuthor && (
            <Avatar className="w-8 h-8 border border-border">
              {!m.is_staff && <AvatarImage src={avatarSrc(m.author?.avatar_url ?? undefined, 64)} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {m.is_staff ? <ShieldCheck className="w-4 h-4" /> : authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </span>
      )}

      {mine && actions && <span className="self-center sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">{actions}</span>}

      <div className={cn("max-w-[78%] sm:max-w-[68%] min-w-0 rounded-2xl transition-shadow",
        highlight && "ring-2 ring-primary/50 ring-offset-2 ring-offset-[#F4F1EA]",
        stickerOnly ? "" : mine
          ? "bg-primary text-white px-3 py-2 rounded-br-md"
          : cn("bg-white border px-3 py-2 rounded-bl-md text-[#2E3A33]", m.is_staff ? "border-primary/40" : "border-[#E8E5E0]"))}>
        {/* Pseudo de l'expéditeur sur chaque message, y compris les siens. */}
        {!stickerOnly && (
          <span className={cn("flex items-center gap-1.5 mb-0.5", mine && "justify-end")}>
            <span className={cn("text-[12.5px] font-bold truncate",
              mine ? "text-white/90" : m.is_staff ? "text-primary" : "text-[#8A5A00]")}>{authorName}</span>
            {m.is_staff && (
              <span className={cn("px-1.5 py-px rounded text-[9.5px] font-bold uppercase tracking-wide",
                mine ? "bg-white/20 text-white" : "bg-primary text-white")}>{staffBadge}</span>
            )}
          </span>
        )}
        {stickerOnly && (
          <span className={cn("block text-[12px] font-bold text-[#56615A] mb-1", mine && "text-right")}>{authorName}</span>
        )}

        {m.reply_to_id && (
          <button type="button" onClick={() => quote && onQuoteClick?.(quote.id)} className="block w-full text-left mb-1.5" disabled={!quote}>
            <QuoteBlock mine={mine}
              name={quote ? quoteAuthor(quote) : "—"}
              text={quote ? messagePreview(quote, quote.sticker ? stickerLabel(quote.sticker) : "") : unavailableQuote} />
          </button>
        )}

        {sticker && <span className="block py-1"><Sticker id={sticker.id} label={stickerLabel(sticker.id)} /></span>}
        {m.body.trim() && <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>}

        <span className={cn("block text-right text-[10.5px] mt-0.5 tabular-nums",
          stickerOnly ? "text-[#6B746E]" : mine ? "text-white/70" : "text-[#8A938C]")}>{time}</span>
      </div>

      {!mine && actions && <span className="self-center sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">{actions}</span>}
    </div>
  );
}

/** Séparateur de jour (« Aujourd'hui », « Hier », « lundi 28 septembre »). */
export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-4">
      <span className="px-3 py-1 rounded-lg bg-white/90 border border-[#E8E5E0] text-[11.5px] font-semibold text-[#56615A] shadow-sm first-letter:uppercase">{label}</span>
    </div>
  );
}
