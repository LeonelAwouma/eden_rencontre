"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { CoachAvatar } from "./coach-avatar";
import { useCoachChrome } from "./coach-chrome";
import { coachUpload } from "@/lib/coach/client";
import { avatarErrorKey, precheckAvatarFile } from "@/lib/coach/avatar-client";
import { useI18n } from "@/lib/i18n";

type Feedback = { tone: "success" | "error"; key: string } | null;

/**
 * Photo de profil du coach connecté : photo actuelle, choix d'une image, aperçu AVANT enregistrement, confirmation.
 * La cible est toujours le coach de la session (le serveur n'accepte aucun identifiant). Après un succès, le contexte
 * de l'espace Coach est mis à jour : en-tête, barre latérale et tiroir affichent la nouvelle photo sans rechargement.
 */
export function CoachAvatarEditor() {
  const { t } = useI18n();
  const { coach, updateAvatar, onDenied } = useCoachChrome();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // L'aperçu est une adresse locale au navigateur : libérée dès qu'elle ne sert plus.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pick = (picked: File | undefined) => {
    setFeedback(null);
    if (!picked) return;
    // Premier contrôle côté navigateur (confort) ; le serveur revérifie le type réel et la taille.
    const problem = precheckAvatarFile(picked);
    if (problem) { reset(); setFeedback({ tone: "error", key: avatarErrorKey(problem) }); return; }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const confirm = async () => {
    if (!file || busy) return;
    setBusy(true);
    setFeedback(null);
    const form = new FormData();
    form.append("photo", file);
    const res = await coachUpload<{ avatarUrl: string }>("/api/coach/profile/avatar", form);
    setBusy(false);
    if (res.ok) {
      updateAvatar(res.data.avatarUrl);
      reset();
      setFeedback({ tone: "success", key: "coachProfile.photoSaved" });
      return;
    }
    // Accès refusé en cours de session : le serveur rejoue sa garde (suspension, rôle…), rien n'est déduit ici.
    if (res.status === 401 || res.status === 403) void onDenied();
    setFeedback({ tone: "error", key: avatarErrorKey(res.code, res.status) });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="relative shrink-0 self-start">
        {/* Aperçu local s'il y en a un, sinon la photo enregistrée (celle du contexte). */}
        {preview
          // eslint-disable-next-line @next/next/no-img-element -- adresse blob: locale, non optimisable
          ? <img src={preview} alt={t("coachProfile.photoPreviewAlt")} className="h-24 w-24 rounded-full object-cover ring-2 ring-[#3F704D]/40" />
          : <CoachAvatar url={coach.avatarUrl} name={coach.name} size={96} className="ring-1 ring-[#E6EAE5]" />}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-[#28543C]" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
          onChange={(e) => pick(e.target.files?.[0])} />
        {!file ? (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D5DBD6] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C241F] hover:bg-[#F6FAF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45 disabled:opacity-60">
            <Camera className="h-4 w-4" aria-hidden="true" /> {coach.avatarUrl ? t("coachProfile.photoChange") : t("coachProfile.photoAdd")}
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void confirm()} disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1F4D3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1F4D3A]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45 disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {busy ? t("coachProfile.photoSaving") : t("coachProfile.photoConfirm")}
            </button>
            <button type="button" onClick={() => { reset(); setFeedback(null); }} disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#D5DBD6] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C241F] hover:bg-[#F6FAF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45 disabled:opacity-60">
              <X className="h-4 w-4" aria-hidden="true" /> {t("coachProfile.photoCancel")}
            </button>
          </div>
        )}
        <p className="text-xs text-[#56615A]">{file ? t("coachProfile.photoPreviewHint") : t("coachProfile.photoHint")}</p>
        <p aria-live="polite" role={feedback?.tone === "error" ? "alert" : "status"}
          className={feedback?.tone === "error" ? "text-sm text-[#8A3B2E]" : "text-sm text-[#28543C]"}>
          {feedback ? t(feedback.key) : ""}
        </p>
      </div>
    </div>
  );
}
