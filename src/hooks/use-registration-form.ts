"use client";

import { useMemo, useState } from "react";
import { useFormProgress } from "@/hooks/use-form-progress";
import { INITIAL_REGISTRATION_FORM_DATA, type RegistrationFormData } from "@/components/registration/types";

/**
 * État commun aux 3 étapes, partagé par le parcours classique et Google.
 * `step` vaut toujours 0, 1 ou 2 pour les deux parcours — l'étape 0 existe
 * aussi côté Google (mini-écran pseudo rendu par RegistrationAccountStep en
 * mode "google"), ce n'est que son contenu qui diffère, jamais sa place dans
 * la barre de progression. Chaque page garde son propre `handleComplete` (mot
 * de passe + connexion automatique côté classique, en-tête Authorization côté
 * Google) — ce hook ne fait que centraliser les données et la reprise de
 * brouillon.
 */
export function useRegistrationForm({ draftKey, totalSteps, passwordStep }: {
  /** Clé sessionStorage — null tant qu'elle ne doit pas démarrer (ex. identité Google pas encore connue). */
  draftKey: string | null;
  totalSteps: number;
  /** Étape au-delà de laquelle on ne restaure pas le mot de passe (classique seulement). */
  passwordStep?: number;
}) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<RegistrationFormData>(INITIAL_REGISTRATION_FORM_DATA);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selfieDataUri, setSelfieDataUri] = useState<string | null>(null);
  const [publicAvatar, setPublicAvatar] = useState<string | null>(null);
  const [photosDeferred, setPhotosDeferred] = useState(false);
  const [restoreNoticeStep, setRestoreNoticeStep] = useState<number | null>(null);
  const [passwordToRetype, setPasswordToRetype] = useState(false);

  const progressSnapshot = useMemo(() => {
    const { password: _password, ...answers } = formData;
    return { step, formData: answers, photo, publicAvatar, selfieDataUri, photosDeferred };
  }, [step, formData, photo, publicAvatar, selfieDataUri, photosDeferred]);

  const { clear: clearProgress } = useFormProgress({
    key: draftKey,
    snapshot: progressSnapshot,
    heavyKeys: ["photo", "publicAvatar", "selfieDataUri"],
    onRestore: (saved) => {
      if (saved.formData) setFormData((prev) => ({ ...prev, ...saved.formData, password: "" }));
      if (typeof saved.photo === "string") setPhoto(saved.photo);
      if (typeof saved.publicAvatar === "string") setPublicAvatar(saved.publicAvatar);
      if (typeof saved.selfieDataUri === "string") setSelfieDataUri(saved.selfieDataUri);
      if (saved.photosDeferred === true) setPhotosDeferred(true);
      const savedStep = typeof saved.step === "number" ? Math.max(0, Math.min(totalSteps - 1, saved.step)) : 0;
      const target = passwordStep !== undefined && savedStep > passwordStep ? passwordStep : savedStep;
      if (passwordStep !== undefined) setPasswordToRetype(savedStep > passwordStep);
      setStep(target);
      if (savedStep > 0) setRestoreNoticeStep(target);
    },
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  return {
    step, setStep, nextStep, prevStep,
    formData, setFormData,
    photo, setPhoto,
    selfieDataUri, setSelfieDataUri,
    publicAvatar, setPublicAvatar,
    photosDeferred, setPhotosDeferred,
    restoreNoticeStep, passwordToRetype,
    clearProgress,
  };
}
