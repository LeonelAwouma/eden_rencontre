"use client";

import { BellRing, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import type { PushState } from "@/lib/push";
import { IosSteps, usePushEnable } from "@/components/push-opt-in";

/** États pour lesquels l'invitation a un sens après l'envoi d'un message. */
export const PUSH_PROMPT_STATES: readonly PushState[] = ["off", "ios-install", "denied"];

/**
 * Après l'envoi d'un message : invite à autoriser les notifications pour être prévenu(e)
 * de la réponse. Le bouton déclenche directement la demande d'autorisation du téléphone.
 */
export function PushMessagePrompt({ state, name, onClose }: {
  state: PushState | null;
  name?: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { enable, busy } = usePushEnable();
  const open = !!state && PUSH_PROMPT_STATES.includes(state);

  const allow = async () => {
    await enable();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-2xl border-[#E8E5E0] bg-white">
        <DialogHeader className="text-left">
          <span className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-1"><BellRing className="w-5 h-5" /></span>
          <DialogTitle className="font-headline text-[18px]" style={{ color: "#2F2F2F" }}>{t("push.messagePromptTitle")}</DialogTitle>
          <DialogDescription className="text-[13.5px]" style={{ color: "#56615A" }}>
            {name ? t("push.messagePromptDesc", { name }) : t("push.messagePromptDescGeneric")}
          </DialogDescription>
        </DialogHeader>

        {state === "ios-install" && <IosSteps />}
        {state === "denied" && (
          <div className="text-[13px]" style={{ color: "#3F4A43" }}>
            <p>{t("push.messagePromptDenied")}</p>
            <ul className="mt-2 space-y-1 text-[12.5px]">
              <li>{t("push.deniedAndroid")}</li>
              <li>{t("push.deniedIos")}</li>
            </ul>
          </div>
        )}

        <div className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-full text-[13px] font-semibold text-[#56615A] hover:bg-muted">
            {state === "off" ? t("push.later") : t("push.messagePromptOk")}
          </button>
          {state === "off" && (
            <button onClick={allow} disabled={busy}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full text-white text-[13px] font-bold disabled:opacity-60"
              style={{ background: "#486B46" }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />} {t("push.messagePromptAllow")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
