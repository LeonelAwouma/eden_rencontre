"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSession, reportIncident } from "@/lib/auth";
import { isRegistrationComplete } from "@/lib/registration-rules";
import { supabase } from "@/lib/supabase";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { uploadRegistrationMedia } from "@/lib/registration-media-client";
import { dialOfIso, toE164 } from "@/lib/geo";
import { MAX_UPLOAD_PAYLOAD } from "@/lib/image-compress";
import { useMobileContinueGate, MobileContinueGate } from "@/components/mobile-continue-gate";
import { ShieldCheck, Heart } from "lucide-react";
import { LoadingScreen } from "@/components/loading-screen";
import { useRegistrationForm } from "@/hooks/use-registration-form";
import { RegistrationProgress } from "@/components/registration/registration-progress";
import { RegistrationAccountStep } from "@/components/registration/account-step";
import { RegistrationProfileStep } from "@/components/registration/profile-step";
import { RegistrationVerificationStep } from "@/components/registration/verification-step";

const TOTAL_STEPS = 3;

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { ready: deviceReady, showGate, continueOnDesktop } = useMobileContinueGate();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [authHeader, setAuthHeader] = useState<string | undefined>(undefined);

  const {
    step, setStep, nextStep, prevStep,
    formData, setFormData,
    photo, setPhoto,
    selfieDataUri, setSelfieDataUri,
    publicAvatar, setPublicAvatar,
    photosDeferred, setPhotosDeferred,
    restoreNoticeStep,
    clearProgress,
  } = useRegistrationForm({
    draftKey: userId ? `eden_complete_registration_progress:${userId}` : null,
    totalSteps: TOTAL_STEPS,
  });

  const patchFormData = (patch: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...patch }));

  // Compte Google déjà authentifié : vérifie qu'il n'a pas déjà un profil de
  // base complet (sinon on renvoie directement vers le questionnaire) et
  // récupère pseudo existant / email / jeton de session.
  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      let existingPseudo = session.pseudo || "";
      if (supabase && session.id) {
        const { data: prof } = await supabase
          .from("profiles").select("pseudo, gender, country, city, birth_date").eq("id", session.id).maybeSingle();
        if (prof?.pseudo) existingPseudo = prof.pseudo;
        if (isRegistrationComplete(prof)) {
          router.replace("/onboarding");
          return;
        }
      }
      if (existingPseudo) setFormData((prev) => ({ ...prev, pseudo: existingPseudo }));
      setUserEmail(session.email || "");
      setUserId(session.id || null);
      if (supabase) {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession?.access_token) setAuthHeader(`Bearer ${supaSession.access_token}`);
      }
      setLoading(false);
    })();
  }, [router, setFormData]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleComplete = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authHeader) headers["Authorization"] = authHeader;

      let media: Awaited<ReturnType<typeof uploadRegistrationMedia>> | null = null;
      try {
        media = await uploadRegistrationMedia({ photos: photo ? [photo] : [], selfie: selfieDataUri, frames: [] });
      } catch (uploadErr) {
        const message = uploadErr instanceof Error ? uploadErr.message : "";
        void reportIncident("registration_upload_failed", `${message || "erreur inconnue"} — ua=${navigator.userAgent.slice(0, 220)}`);
        if (!/non configuré/i.test(message)) {
          setCreateError(message || t("camera.photosTooLarge"));
          setCreating(false);
          return;
        }
      }

      const photosArray = photo ? [photo] : [];
      const payload = JSON.stringify({
        pseudo: formData.pseudo.trim(),
        gender: formData.gender,
        birthDate: formData.birthDate,
        phone: toE164(dialOfIso(formData.phoneIso), formData.phoneLocal),
        civilStatus: formData.civilStatus,
        region: formData.region,
        country: formData.country,
        city: formData.city,
        charterAuthorizeVerification: formData.charterAuthorizeVerification,
        charterCommitRespectful: formData.charterCommitRespectful,
        charterAcceptFull: formData.charterAcceptFull,
        photosDeferred: photosDeferred && !photo,
        ...(media ?? { selfieImage: selfieDataUri, profilePhotos: photosArray }),
        avatarPhotoIndex: media && publicAvatar ? photosArray.indexOf(publicAvatar) : -1,
        avatarUrl: publicAvatar && (!publicAvatar.startsWith("data:") || !media) ? publicAvatar : null,
      });
      if (payload.length > MAX_UPLOAD_PAYLOAD) {
        setCreateError(t("camera.photosTooLarge"));
        setCreating(false);
        return;
      }

      const res = await fetch("/api/auth/google-onboarding", { method: "POST", headers, body: payload });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && /pseudonyme/i.test(data.error || "")) {
          setCreateError(data.error);
          setCreating(false);
          setStep(0);
          return;
        }
        setCreateError(data.error || t("completeRegistration.saveErrorGeneric"));
        setCreating(false);
        return;
      }

      clearProgress();
      if (data.status === "approved") router.push("/onboarding");
      else router.push(`/register/pending?email=${encodeURIComponent(userEmail)}${photosDeferred && !photo ? "&photos=pending" : ""}`);
    } catch {
      setCreateError("Erreur de connexion au serveur.");
      setCreating(false);
    }
  };

  if (loading || !deviceReady) return <LoadingScreen />;
  if (showGate) return <MobileContinueGate onContinueDesktop={continueOnDesktop} />;

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 animate-breathe">
          <Image src="/couple-jardin.webp" alt="Couple chrétien, fronts joints au jardin" fill className="object-cover object-center" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/45 to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="relative z-20 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-3 group">
            <Monogram className="w-10 h-10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
            <span className="font-headline text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Garden <span>of Alliance</span>
            </span>
          </Link>
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="font-headline text-4xl xl:text-5xl font-bold text-foreground leading-tight">
                {t("register.leftTitle")} <br />
                <span className="text-primary italic font-normal">{t("register.leftTitleHighlight")}</span>
              </h2>
              <p className="text-foreground/60 text-lg max-w-md leading-relaxed">{t("register.leftSubtitle")}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-primary" /></div>
                <span className="text-sm font-medium">{t("register.aiVerification")}</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Heart className="w-4 h-4 text-primary fill-primary" /></div>
                <span className="text-sm font-medium">{t("register.spiritualAffinities")}</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-primary" /></div>
                <span className="text-sm font-medium">{t("register.moderatedCommunity")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-foreground/5">
          <Link href="/" className="flex items-center gap-3 group">
            <Monogram className="w-8 h-8 text-primary shrink-0" />
            <span className="font-headline text-lg font-bold text-foreground">Garden <span>of Alliance</span></span>
          </Link>
        </div>

        <div className="lg:hidden relative w-full h-40 sm:h-52 shrink-0 overflow-hidden">
          <div className="absolute inset-0 animate-breathe">
            <Image src="/mariage.webp" alt="Mariage chrétien — Garden of Alliance" fill className="object-cover object-[50%_22%]" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-5 sm:px-12 lg:px-16 xl:px-20 py-8 sm:py-10">
          <div className="w-full max-w-lg space-y-7 sm:space-y-8">
            <RegistrationProgress
              step={(step + 1) as 1 | 2 | 3}
              titleKey={step === 0 ? "registrationV2.step1Title" : step === 1 ? "registrationV2.step2Title" : "registrationV2.step3Title"}
              subtitleKey={step === 0 ? "registrationV2.step1Subtitle" : step === 1 ? "registrationV2.step2Subtitle" : "registrationV2.step3Subtitle"}
            />

            {restoreNoticeStep === step && (
              <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                {t("register.progressRestored")}
              </p>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 && (
                  <RegistrationAccountStep
                    mode="google"
                    formData={formData}
                    setFormData={patchFormData}
                    onContinue={nextStep}
                    authHeader={authHeader}
                    googleUserEmail={userEmail}
                  />
                )}
                {step === 1 && (
                  <RegistrationProfileStep
                    mode="google"
                    formData={formData}
                    setFormData={patchFormData}
                    onContinue={nextStep}
                    onBack={prevStep}
                  />
                )}
                {step === 2 && (
                  <RegistrationVerificationStep
                    gender={formData.gender}
                    charterAuthorizeVerification={formData.charterAuthorizeVerification}
                    charterCommitRespectful={formData.charterCommitRespectful}
                    charterAcceptFull={formData.charterAcceptFull}
                    onChangeCharter={patchFormData}
                    photo={photo}
                    setPhoto={setPhoto}
                    photosDeferred={photosDeferred}
                    setPhotosDeferred={setPhotosDeferred}
                    selfieDataUri={selfieDataUri}
                    setSelfieDataUri={setSelfieDataUri}
                    publicAvatar={publicAvatar}
                    setPublicAvatar={setPublicAvatar}
                    onBack={prevStep}
                    onComplete={handleComplete}
                    creating={creating}
                    createError={createError}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(145 22% 62% / 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(145 22% 62% / 0.4); }
      `}</style>
    </div>
  );
}
