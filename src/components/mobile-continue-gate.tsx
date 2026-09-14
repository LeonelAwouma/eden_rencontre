"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Smartphone, Monitor } from "lucide-react";
import { Monogram } from "@/components/ornaments";
import { isMobileDevice } from "@/lib/device";
import { useI18n } from "@/lib/i18n";

const BYPASS_KEY = "eden_continue_on_desktop";

/**
 * Gates camera-dependent registration steps (selfie verification) behind a
 * "use your phone" nudge on desktop — a QR code opens the same page on
 * mobile, where a camera is essentially guaranteed. Checked once at the very
 * start of the flow, before any data is entered, so switching devices never
 * costs the user anything already filled in. The user can still choose to
 * continue on desktop (e.g. if it does have a working webcam).
 */
export function useMobileContinueGate() {
  const [ready, setReady] = useState(false);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    let bypassed = false;
    try {
      bypassed = sessionStorage.getItem(BYPASS_KEY) === "1";
    } catch {
      // Storage unavailable (private mode, etc.) — fall through, gate shows normally.
    }
    setShowGate(!isMobileDevice() && !bypassed);
    setReady(true);
  }, []);

  const continueOnDesktop = () => {
    try {
      sessionStorage.setItem(BYPASS_KEY, "1");
    } catch {
      // Ignore — worst case the gate reappears on refresh.
    }
    setShowGate(false);
  };

  return { ready, showGate, continueOnDesktop };
}

export function MobileContinueGate({ onContinueDesktop }: { onContinueDesktop: () => void }) {
  const { t } = useI18n();
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(window.location.href, {
      width: 220,
      margin: 1,
      color: { dark: "#2D5016", light: "#FFFFFF" },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-7 px-6 py-12 text-center">
      <Link href="/" className="flex items-center gap-3">
        <Monogram className="w-10 h-10 text-primary" />
        <span className="font-headline text-2xl font-bold text-foreground">
          Garden <span>of Alliance</span>
        </span>
      </Link>

      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Smartphone className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-3 max-w-md">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{t("mobileGate.title")}</h1>
        <p className="text-foreground/50 text-sm leading-relaxed">{t("mobileGate.description")}</p>
      </div>

      <div className="bg-card border border-foreground/10 rounded-2xl p-5 shadow-sm">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a base64 data URI, next/image gains nothing here
          <img src={qrUrl} alt={t("mobileGate.qrAlt")} width={180} height={180} />
        ) : (
          <div className="w-[180px] h-[180px] flex items-center justify-center text-foreground/20 text-xs">
            {t("mobileGate.qrLoading")}
          </div>
        )}
      </div>

      <p className="text-xs text-foreground/30 max-w-xs">{t("mobileGate.scanHint")}</p>

      <button
        onClick={onContinueDesktop}
        className="flex items-center gap-2 text-sm text-foreground/40 hover:text-primary transition-colors"
      >
        <Monitor className="w-4 h-4" /> {t("mobileGate.continueDesktop")}
      </button>
    </div>
  );
}
