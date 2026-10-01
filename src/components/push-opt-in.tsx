"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2, X, Share, PlusSquare, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { getPushState, enablePush, disablePush, refreshPushSubscription, type PushState } from "@/lib/push";

const DISMISS_KEY = "eden-push-banner-dismissed";

/**
 * Notifications sur le téléphone.
 *  - variant="banner" : invitation sur l'accueil, masquable, cachée si déjà activé.
 *  - variant="settings" : réglage permanent (onglet Notifications).
 */
export function PushOptIn({ variant }: { variant: "banner" | "settings" }) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let active = true;
    getPushState().then((s) => { if (active) setState(s); });
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
    refreshPushSubscription(locale);
    return () => { active = false; };
  }, [locale]);

  const enable = async () => {
    setBusy(true);
    try {
      const res = await enablePush(locale);
      setState(res.state);
      if (res.ok) toast({ title: t("push.enabledTitle"), description: t("push.enabledDesc") });
      else if (res.state === "denied") toast({ title: t("push.deniedTitle"), description: t("push.deniedDesc"), variant: "destructive" });
      else if (res.error) toast({ title: t("push.errorTitle"), description: res.error, variant: "destructive" });
    } catch {
      toast({ title: t("push.errorTitle"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    await disablePush().catch(() => {});
    setState("off");
    setBusy(false);
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* stockage indisponible */ }
  };

  if (state === null || state === "unconfigured") return null;

  if (variant === "banner") {
    if (dismissed || state === "on" || state === "unsupported" || state === "denied") return null;
    return (
      <section className="relative rounded-2xl border border-[#C6D4C0] p-4 pr-10" style={{ background: "linear-gradient(135deg, #EEF5EC 0%, #FAF9F6 100%)" }}>
        <button onClick={dismiss} aria-label={t("push.later")} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-[#6B746E] hover:bg-white/70">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0"><BellRing className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-headline text-[16px] font-bold" style={{ color: "#2F2F2F" }}>{t("push.bannerTitle")}</p>
            <p className="text-[13px] mt-0.5" style={{ color: "#56615A" }}>{t("push.bannerDesc")}</p>
            {state === "ios-install" ? <IosSteps /> : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={enable} disabled={busy}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />} {t("push.enable")}
                </button>
                <button onClick={dismiss} className="h-9 px-3 rounded-full text-[13px] font-semibold text-[#56615A] hover:bg-white/70">{t("push.later")}</button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Réglage permanent
  return (
    <section className="rounded-2xl border border-[#E8E5E0] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", state === "on" ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
          {state === "on" ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold" style={{ color: "#2F2F2F" }}>{t("push.settingsTitle")}</p>
          <p className="text-[13px] mt-0.5" style={{ color: "#56615A" }}>
            {state === "on" ? t("push.onDesc")
              : state === "denied" ? t("push.deniedDesc")
              : state === "unsupported" ? t("push.unsupportedDesc")
              : t("push.bannerDesc")}
          </p>
          {state === "ios-install" && <IosSteps />}
          {(state === "off" || state === "on") && (
            <div className="mt-3">
              {state === "on" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary"><Check className="w-4 h-4" /> {t("push.onLabel")}</span>
                  <button onClick={disable} disabled={busy} className="h-8 px-3 rounded-full border border-[#E8E5E0] text-[12.5px] font-semibold text-[#56615A] hover:bg-muted disabled:opacity-60">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("push.disable")}
                  </button>
                </div>
              ) : (
                <button onClick={enable} disabled={busy}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />} {t("push.enable")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** iPhone / iPad : les notifications web exigent d'abord l'ajout à l'écran d'accueil. */
function IosSteps() {
  const { t } = useI18n();
  return (
    <ol className="mt-3 space-y-1.5 text-[13px]" style={{ color: "#3F4A43" }}>
      <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
        <span>{t("push.iosStep1")} <Share className="inline w-4 h-4 -mt-0.5 text-primary" /></span></li>
      <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
        <span>{t("push.iosStep2")} <PlusSquare className="inline w-4 h-4 -mt-0.5 text-primary" /></span></li>
      <li className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
        <span>{t("push.iosStep3")}</span></li>
    </ol>
  );
}
