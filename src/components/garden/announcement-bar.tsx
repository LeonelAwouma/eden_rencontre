"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/** Site-wide announcement banner, driven by the admin "Texte du bandeau" setting. */
export function AnnouncementBar() {
  const [text, setText] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setText(typeof d.banner_text === "string" ? d.banner_text.trim() : ""))
      .catch(() => {});
  }, []);

  if (!text || dismissed) return null;

  return (
    <div className="relative w-full bg-deep-eden text-background text-center text-[11px] sm:text-xs font-semibold tracking-wide py-2.5 px-10">
      <span>{text}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fermer le bandeau"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
