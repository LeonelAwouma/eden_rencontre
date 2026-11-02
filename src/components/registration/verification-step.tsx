"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle, ArrowRight, Camera, CheckCircle2, ChevronLeft, Heart,
  Loader2, RotateCcw, ShieldCheck, Star, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { reportIncident } from "@/lib/auth";
import { cameraErrorKey } from "@/lib/camera-error";
import { preparePhoto, videoFrameToDataUrl } from "@/lib/image-compress";
import { AvatarPicker } from "@/components/avatar-picker";
import { SUPPORT_PHONE_DISPLAY } from "@/lib/contact";
import { EDEN_SOLID_BUTTON } from "@/components/garden/button-styles";

/**
 * Étape 3 — Sécurité et finalisation. Reste une seule étape dans la barre de
 * progression (« Étape 3/3 »), mais garde 4 écrans internes successifs
 * (charte → photo → selfie → avatar + soumission) : caméra, sélecteur de
 * fichier et lecture de la charte restent chacun des interactions à part
 * entière, les tasser sur un seul écran aurait dégradé l'usage sans réduire le
 * nombre d'« étapes » perçues par le membre.
 */
export function RegistrationVerificationStep({
  gender,
  charterAuthorizeVerification,
  charterCommitRespectful,
  charterAcceptFull,
  onChangeCharter,
  photo,
  setPhoto,
  photosDeferred,
  setPhotosDeferred,
  selfieDataUri,
  setSelfieDataUri,
  publicAvatar,
  setPublicAvatar,
  onBack,
  onComplete,
  creating,
  createError,
}: {
  gender: string;
  charterAuthorizeVerification: boolean;
  charterCommitRespectful: boolean;
  charterAcceptFull: boolean;
  onChangeCharter: (patch: { charterAuthorizeVerification?: boolean; charterCommitRespectful?: boolean; charterAcceptFull?: boolean }) => void;
  photo: string | null;
  setPhoto: (photo: string | null) => void;
  photosDeferred: boolean;
  setPhotosDeferred: (v: boolean) => void;
  selfieDataUri: string | null;
  setSelfieDataUri: (v: string | null) => void;
  publicAvatar: string | null;
  setPublicAvatar: (v: string | null) => void;
  onBack: () => void;
  onComplete: () => void;
  creating: boolean;
  createError: string | null;
}) {
  const { t } = useI18n();
  const [subStep, setSubStep] = useState<0 | 1 | 2 | 3>(0);

  // ── Photo ──────────────────────────────────────────────────
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [showDeferDialog, setShowDeferDialog] = useState(false);

  const openPhotoPicker = () => {
    if (processingPhoto) return;
    photoInputRef.current?.click();
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setProcessingPhoto(true);
    const res = await preparePhoto(file);
    setProcessingPhoto(false);
    if (!res.ok) {
      setPhotoError(t(res.reason === "heic" ? "camera.photoHeic" : "camera.photoUnsupported"));
      void reportIncident("registration_photo_failed", `${res.reason} — ${res.detail}`);
      return;
    }
    setPhotosDeferred(false);
    setPhoto(res.dataUrl);
  };

  const deferPhoto = () => {
    setPhoto(null);
    if (publicAvatar && publicAvatar.startsWith("data:")) setPublicAvatar(null);
    setPhotoError(null);
    setPhotosDeferred(true);
    setShowDeferDialog(false);
    setSubStep(2);
  };

  // ── Selfie ─────────────────────────────────────────────────
  const [selfieError, setSelfieError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setSelfieError(null);
    setVideoPlaying(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      setSelfieError(t(cameraErrorKey(err)));
    }
  };

  const playVideoPreview = () => { videoRef.current?.play().catch(() => {}); };

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      playVideoPreview();
    }
  }, [cameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current) return;
    const dataUri = videoFrameToDataUrl(videoRef.current);
    if (!dataUri) return;
    setSelfieDataUri(dataUri);
    stopCamera();
  };

  const retakeSelfie = () => {
    setSelfieDataUri(null);
    setSelfieError(null);
    startCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const goBackInternal = () => {
    if (subStep === 0) { onBack(); return; }
    if (subStep === 2) { stopCamera(); }
    setSubStep((s) => (s - 1) as 0 | 1 | 2 | 3);
  };

  return (
    <div className="space-y-6">
      {/* ── Sub-step 0 : Charte ─────────────────────────────── */}
      {subStep === 0 && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">{t("register.step8Title")}</h1>
            <p className="text-foreground/50 text-sm">{t("register.step8Subtitle")}</p>
          </div>
          <div className="bg-card border border-foreground/10 rounded-2xl p-5 max-h-[340px] overflow-y-auto custom-scrollbar space-y-5 text-sm text-foreground/70 leading-relaxed">
            <div className="space-y-3">
              <h3 className="font-headline font-bold text-deep-eden text-base sticky top-0 bg-card pb-1">{t("register.charterAxis1")}</h3>
              <p>{t("register.charterArt1")}</p>
              <p>{t("register.charterArt2")}</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-headline font-bold text-deep-eden text-base sticky top-0 bg-card pb-1">{t("register.charterAxis2")}</h3>
              <p>{t("register.charterArt3")}</p>
              <p>{t("register.charterArt4")}</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-headline font-bold text-deep-eden text-base sticky top-0 bg-card pb-1">{t("register.charterAxis3")}</h3>
              <p>{t("register.charterArt5")}</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={charterAuthorizeVerification}
                onChange={() => onChangeCharter({ charterAuthorizeVerification: !charterAuthorizeVerification })}
                className="mt-1 w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary/30 shrink-0"
              />
              <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{t("register.authorizeVerification")}</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={charterCommitRespectful}
                onChange={() => onChangeCharter({ charterCommitRespectful: !charterCommitRespectful })}
                className="mt-1 w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary/30 shrink-0"
              />
              <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{t("register.commitRespectful")}</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={charterAcceptFull}
                onChange={() => onChangeCharter({ charterAcceptFull: !charterAcceptFull })}
                className="mt-1 w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary/30 shrink-0"
              />
              <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{t("register.acceptFull")}</span>
            </label>
          </div>
          <Button
            onClick={() => setSubStep(1)}
            disabled={!charterAuthorizeVerification || !charterCommitRespectful || !charterAcceptFull}
            className={cn("w-full h-14 text-base disabled:opacity-50", EDEN_SOLID_BUTTON)}
          >
            {t("register.acceptAndContinue")} <ShieldCheck className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {/* ── Sub-step 1 : Photo ──────────────────────────────── */}
      {subStep === 1 && (
        <div className="space-y-6">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          {photoError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">{photoError}</p>}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm uppercase tracking-wider">{t("registrationV2.photoSingleTitle")}</p>
              <p className="text-xs text-foreground/40 mt-0.5">{t("registrationV2.photoSingleDesc")}</p>
            </div>
          </div>
          <div className="flex justify-center">
            <div onClick={openPhotoPicker} className="relative w-40 aspect-[2/3] bg-card border border-foreground/5 rounded-2xl overflow-hidden group shadow-xl hover:border-primary/30 transition-all cursor-pointer">
              {photo ? (
                <>
                  <Image src={photo} alt="" fill className="object-cover group-hover:scale-105 transition-transform" />
                  <button onClick={(e) => { e.stopPropagation(); setPhoto(null); }} className="absolute top-3 right-3 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute top-3 left-3 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg">
                    <Star className="w-3.5 h-3.5 fill-primary-foreground" />
                  </div>
                </>
              ) : processingPhoto ? (
                <div role="status" className="w-full h-full flex flex-col items-center justify-center gap-3 bg-primary/5 px-2 text-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-[10px] font-semibold text-primary leading-tight">{t("camera.photoProcessing")}</span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 hover:bg-foreground/5 transition-colors">
                  <Upload className="w-6 h-6 text-foreground/20" />
                </div>
              )}
            </div>
          </div>
          {!photo && <p className="text-sm text-foreground/40 text-center">{t("register.photosMandatory")}</p>}
          <Button onClick={() => setSubStep(2)} disabled={!photo} className={cn("w-full h-16 text-lg gap-3 disabled:opacity-50", EDEN_SOLID_BUTTON)}>
            {t("register.continueToVerification")} <Camera className="w-5 h-5 ml-2" />
          </Button>
          <button
            type="button"
            onClick={() => setShowDeferDialog(true)}
            className={cn("w-full text-center text-sm underline underline-offset-4 transition-colors py-1",
              photoError ? "text-destructive font-semibold" : "text-foreground/40 hover:text-primary")}
          >
            {t("register.photosDeferLink")}
          </button>
        </div>
      )}

      {/* ── Sub-step 2 : Selfie ─────────────────────────────── */}
      {subStep === 2 && (
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm uppercase tracking-wider">{t("registrationV2.selfieSectionLabel")}</p>
              <p className="text-xs text-foreground/40 mt-0.5">{t("registrationV2.selfieExplainer")}</p>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">{t("register.selfieTitle")}</h1>
            <p className="text-foreground/50 text-sm">{t("register.selfieDesc")}</p>
          </div>
          <div className="relative w-full aspect-[3/4] max-h-[380px] bg-card border border-foreground/10 rounded-2xl overflow-hidden">
            {!cameraActive && !selfieDataUri && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Camera className="w-16 h-16 text-foreground/15" />
                <p className="text-foreground/30 text-sm">{t("register.selfieActivatePrompt")}</p>
                <Button onClick={startCamera} className={cn("px-8", EDEN_SOLID_BUTTON)}>
                  <Camera className="w-4 h-4 mr-2" /> {t("register.selfieActivateBtn")}
                </Button>
              </div>
            )}
            {cameraActive && (
              <>
                <video ref={videoRef} autoPlay playsInline muted onPlaying={() => setVideoPlaying(true)}
                  className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                {!videoPlaying && (
                  <button onClick={playVideoPreview} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
                    <Camera className="w-10 h-10" />
                    <span className="text-sm font-bold px-6 text-center">{t("register.selfieTapToShow")}</span>
                  </button>
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary/50 rounded-full" />
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <Button onClick={captureSelfie} disabled={!videoPlaying} className={cn("w-16 h-16 p-0 disabled:opacity-40", EDEN_SOLID_BUTTON)}>
                    <Camera className="w-6 h-6" />
                  </Button>
                </div>
              </>
            )}
            {selfieDataUri && (
              <>
                <Image src={selfieDataUri} alt="Selfie" fill className="object-cover" />
                <div className="absolute top-4 right-4">
                  <Button onClick={retakeSelfie} variant="outline" size="sm" className="bg-black/40 border-white/20 text-white hover:bg-black/60 backdrop-blur-md">
                    <RotateCcw className="w-4 h-4 mr-1" /> {t("register.selfieRetake")}
                  </Button>
                </div>
              </>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          {selfieError && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive/90">{selfieError}</p>
            </div>
          )}
          {selfieDataUri && (
            <Button onClick={() => setSubStep(3)} className={cn("w-full h-14 text-base gap-3", EDEN_SOLID_BUTTON)}>
              {t("register.selfieContinueBtn")} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* ── Sub-step 3 : Avatar (facultatif) + soumission ──── */}
      {subStep === 3 && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">{t("registrationV2.avatarOptionalTitle")}</h1>
            <p className="text-foreground/50 text-sm">{t("registrationV2.avatarOptionalHint")}</p>
          </div>
          <AvatarPicker photos={photo ? [photo] : []} gender={gender} value={publicAvatar} onChange={setPublicAvatar} />
          {createError && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive/90">{createError}</p>
            </div>
          )}
          <Button onClick={onComplete} disabled={creating} className={cn("w-full h-16 text-lg gap-3 disabled:opacity-70", EDEN_SOLID_BUTTON)}>
            {creating ? (
              <span className="flex items-center gap-3">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {t("register.creatingProfile")}
              </span>
            ) : (
              <>{t("registrationV2.finishButton")} <Heart className="w-6 h-6 fill-primary-foreground" /></>
            )}
          </Button>
        </div>
      )}

      <button type="button" onClick={goBackInternal} disabled={creating} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2 disabled:opacity-40">
        <ChevronLeft className="w-4 h-4" /> {t("register.back")}
      </button>

      <Dialog open={showDeferDialog} onOpenChange={setShowDeferDialog}>
        <DialogContent className="max-w-md bg-card text-foreground border-foreground/5 rounded-[2rem] p-8 sm:p-10">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">{t("register.photosDeferTitle")}</DialogTitle>
              <DialogDescription className="text-foreground/60 text-sm">{t("register.photosDeferDesc")}</DialogDescription>
            </div>
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs text-foreground/60">{t("register.photosDeferSupport", { phone: SUPPORT_PHONE_DISPLAY })}</p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <Button onClick={deferPhoto} className={cn("w-full h-14", EDEN_SOLID_BUTTON)}>{t("register.photosDeferConfirm")}</Button>
              <Button variant="ghost" onClick={() => setShowDeferDialog(false)} className="w-full text-foreground/50 hover:text-primary transition-colors">{t("register.photosDeferCancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
