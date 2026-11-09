"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ChevronLeft, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { signInWithGoogle, logout } from "@/lib/auth";
import { getPasswordStrength } from "@/lib/password-strength";
import { EDEN_SOLID_BUTTON } from "@/components/garden/button-styles";
import type { RegistrationFormData, RegistrationMode } from "@/components/registration/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isPseudoWellFormed = (p: string) => p.trim().length >= 2 && p.trim().length <= 30 && !/[<>"]/.test(p);

/** Vérifie la disponibilité d'un pseudo ou d'un email ; indisponible → on laisse continuer (la soumission tranchera). */
async function checkAvailability(path: string, body: Record<string, unknown>, authHeader?: string): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
      body: JSON.stringify(body),
    });
    if (!res.ok) return true;
    const data = await res.json();
    return !!data.available;
  } catch {
    return true;
  }
}

/**
 * Étape 1 — Créer mon compte (classique) ou mini-étape pseudo (Google, qui a
 * déjà l'email/mot de passe via OAuth). `mode` décide seulement de ce bloc :
 * les étapes 2 et 3 sont rigoureusement identiques pour les deux parcours.
 */
export function RegistrationAccountStep({
  mode,
  formData,
  setFormData,
  onContinue,
  authHeader,
  googleUserEmail,
}: {
  mode: RegistrationMode;
  formData: Pick<RegistrationFormData, "pseudo" | "email" | "password" | "signupMethod">;
  setFormData: (patch: Partial<RegistrationFormData>) => void;
  onContinue: () => void;
  /** Google uniquement : `Bearer <token>` de la session en cours, pour exclure son propre pseudo de la vérification. */
  authHeader?: string;
  googleUserEmail?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [pseudoTaken, setPseudoTaken] = useState(false);
  const [checkingPseudo, setCheckingPseudo] = useState(false);
  const pseudoCache = useRef<Map<string, boolean>>(new Map());
  const checkPseudo = async (value: string) => {
    const clean = value.trim();
    if (!isPseudoWellFormed(clean)) return;
    const cacheKey = `${clean.toLowerCase()}|${authHeader ?? ""}`;
    const cached = pseudoCache.current.get(cacheKey);
    if (cached !== undefined) { setPseudoTaken(!cached); return; }
    setCheckingPseudo(true);
    try {
      const available = await checkAvailability("/api/auth/check-pseudo", { pseudo: clean }, authHeader);
      pseudoCache.current.set(cacheKey, available);
      setPseudoTaken(!available);
    } finally {
      setCheckingPseudo(false);
    }
  };

  const [emailTaken, setEmailTaken] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailCache = useRef<Map<string, boolean>>(new Map());
  const checkEmail = async (value: string) => {
    const clean = value.trim().toLowerCase();
    if (!EMAIL_REGEX.test(clean)) return;
    const cached = emailCache.current.get(clean);
    if (cached !== undefined) { setEmailTaken(!cached); return; }
    setCheckingEmail(true);
    try {
      const available = await checkAvailability("/api/auth/check-email", { email: clean });
      emailCache.current.set(clean, available);
      setEmailTaken(!available);
    } finally {
      setCheckingEmail(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password, t);
  const pseudoValid = isPseudoWellFormed(formData.pseudo);
  const emailValid = EMAIL_REGEX.test(formData.email);

  if (mode === "google") {
    const canContinue = pseudoValid && !pseudoTaken && !checkingPseudo;
    return (
      <div className="space-y-8">
        {googleUserEmail && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/70">
            {t("register.googleConnectedAs", { email: googleUserEmail })}
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("register.pseudoLabel")}</Label>
          <Input
            autoFocus
            placeholder={t("register.pseudoPlaceholder")}
            value={formData.pseudo}
            onChange={(e) => { setFormData({ pseudo: e.target.value }); setPseudoTaken(false); }}
            onBlur={() => { void checkPseudo(formData.pseudo); }}
            aria-invalid={pseudoTaken || undefined}
            className={cn("h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30",
              pseudoTaken && "border-destructive/60 focus:border-destructive")}
          />
          {pseudoTaken ? (
            <p role="alert" className="text-sm text-destructive">{t("registrationV2.pseudoTaken")}</p>
          ) : (
            <p className="text-[11px] text-foreground/30">{t("register.pseudoHint")}</p>
          )}
        </div>
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className={cn("w-full h-14 text-base disabled:opacity-50", EDEN_SOLID_BUTTON)}
        >
          {t("register.continue")} <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <button
          type="button"
          onClick={() => { void logout(); router.push("/login"); }}
          className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2"
        >
          <ChevronLeft className="w-4 h-4" /> {t("register.back")}
        </button>
      </div>
    );
  }

  const phoneOnly = formData.signupMethod === "phone";
  const emailOk = phoneOnly || (emailValid && !emailTaken && !checkingEmail);
  const canContinue = pseudoValid && !pseudoTaken && !checkingPseudo && emailOk && formData.password.length >= 8;

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("register.pseudoLabel")}</Label>
          <div className="relative">
            <Input
              autoFocus
              placeholder={t("register.pseudoPlaceholder")}
              value={formData.pseudo}
              onChange={(e) => { setFormData({ pseudo: e.target.value }); setPseudoTaken(false); }}
              onBlur={() => { void checkPseudo(formData.pseudo); }}
              aria-invalid={pseudoTaken || undefined}
              className={cn("h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 pr-12",
                pseudoTaken && "border-destructive/60 focus:border-destructive")}
            />
            {checkingPseudo ? (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
            ) : pseudoValid && !pseudoTaken && formData.pseudo && (
              <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            )}
          </div>
          {pseudoTaken ? (
            <p role="alert" className="text-sm text-destructive">{t("registrationV2.pseudoTaken")}</p>
          ) : (
            <p className="text-[11px] text-foreground/30">{t("register.pseudoHint")}</p>
          )}
        </div>

        {phoneOnly ? (
          <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/70">
            {t("register.signupPhoneHint")}{" "}
            <button
              type="button"
              onClick={() => setFormData({ signupMethod: "email" })}
              className="font-semibold text-primary underline underline-offset-2"
            >
              {t("register.signupMethodEmail")}
            </button>
          </p>
        ) : (
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("register.emailLabel")}</Label>
          <div className="relative">
            <Input
              type="email"
              placeholder={t("register.emailPlaceholder")}
              value={formData.email}
              onChange={(e) => { setFormData({ email: e.target.value }); setEmailTaken(false); }}
              onBlur={() => { void checkEmail(formData.email); }}
              aria-invalid={emailTaken || undefined}
              aria-describedby={emailTaken ? "register-email-taken" : undefined}
              className={cn("h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 pr-12",
                emailTaken && "border-destructive/60 focus:border-destructive")}
            />
            {checkingEmail ? (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
            ) : emailValid && !emailTaken && (
              <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-in zoom-in duration-200" />
            )}
          </div>
          {emailTaken && (
            <p id="register-email-taken" role="alert" className="text-sm text-destructive">
              {t("register.emailTaken")}{" "}
              <Link href={`/login?email=${encodeURIComponent(formData.email.trim())}`} className="font-semibold underline underline-offset-2">
                {t("register.emailTakenLogin")}
              </Link>
            </p>
          )}
          <button
            type="button"
            onClick={() => { setFormData({ signupMethod: "phone" }); setEmailTaken(false); }}
            className="text-xs text-foreground/50 underline underline-offset-2 hover:text-primary transition-colors"
          >
            {t("register.signupMethodPhone")}
          </button>
        </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("register.passwordLabel")}</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ password: e.target.value })}
              className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 pr-14"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {formData.password ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: level <= passwordStrength.score ? passwordStrength.color : "hsl(var(--foreground) / 0.1)" }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-bold" style={{ color: passwordStrength.color }}>{passwordStrength.label}</p>
            </div>
          ) : (
            <p className="text-[10px] text-foreground/20 uppercase tracking-widest mt-1">{t("register.passwordMinHint")}</p>
          )}
        </div>

        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className={cn("w-full h-14 text-base disabled:opacity-50", EDEN_SOLID_BUTTON)}
        >
          {t("register.continue")} <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-foreground/10" />
          <span className="text-[11px] uppercase tracking-widest text-foreground/30">{t("registrationV2.orSeparator")}</span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => { void signInWithGoogle(); }}
          className="w-full h-14 text-base border-foreground/10"
        >
          {t("registrationV2.googleContinue")}
        </Button>
      </div>

      <button type="button" onClick={() => router.push("/")} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
        <ChevronLeft className="w-4 h-4" /> {t("register.back")}
      </button>
    </div>
  );
}
