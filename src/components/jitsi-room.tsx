"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

/** Informations renvoyées par /api/.../salle pour ouvrir la salle. */
export interface JitsiJoin {
  domain: string;
  roomName: string;
  jwt: string;
  scriptSrc: string;
}

interface JitsiApi {
  dispose: () => void;
  addListener: (event: string, cb: (...args: unknown[]) => void) => void;
}
type JitsiCtor = new (domain: string, options: Record<string, unknown>) => JitsiApi;

declare global {
  interface Window { JitsiMeetExternalAPI?: JitsiCtor }
}

const scriptLoads = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!scriptLoads.has(src)) {
    scriptLoads.set(src, new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => { scriptLoads.delete(src); reject(new Error("script")); };
      document.head.appendChild(el);
    }));
  }
  return scriptLoads.get(src)!;
}

/**
 * Salle de visioconférence Jitsi (JaaS) intégrée à la page.
 * Occupe toute la place de son parent : donnez-lui une hauteur.
 */
export function JitsiRoom({ join, displayName, subject, onLeave }: {
  join: JitsiJoin;
  displayName?: string;
  subject?: string;
  onLeave?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let api: JitsiApi | null = null;
    let cancelled = false;

    loadScript(join.scriptSrc)
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        api = new window.JitsiMeetExternalAPI(join.domain, {
          roomName: join.roomName,
          jwt: join.jwt,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          lang: "fr",
          userInfo: displayName ? { displayName } : undefined,
          configOverwrite: {
            subject,
            prejoinConfig: { enabled: true },
            disableDeepLinking: true,
            startWithAudioMuted: false,
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            MOBILE_APP_PROMO: false,
          },
        });
        api.addListener("videoConferenceJoined", () => setState("ready"));
        api.addListener("readyToClose", () => onLeaveRef.current?.());
        // L'iframe s'affiche avant même l'entrée en salle (écran de préparation).
        setState("ready");
      })
      .catch(() => { if (!cancelled) setState("error"); });

    return () => { cancelled = true; api?.dispose(); };
  }, [join.domain, join.roomName, join.jwt, join.scriptSrc, displayName, subject]);

  return (
    <div className="relative w-full h-full bg-[#1E2621] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">Ouverture de la salle…</p>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/90 px-6 text-center">
          <AlertCircle className="w-7 h-7" />
          <p className="text-sm">Impossible de charger la visioconférence. Vérifiez votre connexion, puis rechargez la page.</p>
        </div>
      )}
    </div>
  );
}
