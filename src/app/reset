"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import { ImposingFloralCorners } from "@/components/garden";

// ── Password Strength Calculator ────────────────────────────
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const normalizedScore = Math.min(4, Math.max(1, score));

  const levels = [
    { label: "Très faible", color: "#dc3545" },
    { label: "Faible", color: "#fd7e14" },
    { label: "Moyen", color: "#ffc107" },
    { label: "Fort", color: "#28a745" },
    { label: "Très fort", color: "#2D5016" },
  ];

  return {
    score: normalizedScore,
    label: levels[normalizedScore].label,
    color: levels[normalizedScore].color,
  };
}

// ── Password Requirements Check ─────────────────────────────
function getPasswordChecks(password: string) {
  return [
    { label: "Au moins 8 caractères", met: password.length >= 8 },
    { label: "Une lettre majuscule", met: /[A-Z]/.test(password) },
    { label: "Une lettre minuscule", met: /[a-z]/.test(password) },
    { label: "Un chiffre", met: /[0-9]/.test(password) },
    { label: "Un caractère spécial", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

// ── Inner component that uses useSearchParams ───────────────
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const checks = getPasswordChecks(password);

  // ── Validate password on change ──────────────────────────
  useEffect(() => {
    if (!password) {
      setPasswordErrors([]);
      return;
    }

    const errors: string[] = [];
    if (password.length < 8) errors.push("Au moins 8 caractères requis.");
    if (!/[A-Z]/.test(password)) errors.push("Au moins une lettre majuscule requise.");
    if (!/[a-z]/.test(password)) errors.push("Au moins une lettre minuscule requise.");
    if (!/[0-9]/.test(password)) errors.push("Au moins un chiffre requis.");
    if (!/[^A-Za-z0-9]/.test(password)) errors.push("Au moins un caractère spécial requis.");
    setPasswordErrors(errors);
  }, [password]);

  // ── Validate confirm password ────────────────────────────
  useEffect(() => {
    if (!confirmPassword) {
      setConfirmPasswordError(null);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Les mots de passe ne correspondent pas.");
    } else {
      setConfirmPasswordError(null);
    }
  }, [password, confirmPassword]);

  // ── Handle submit ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Token de réinitialisation manquant. Veuillez recommencer le processus.");
      return;
    }

    if (passwordErrors.length > 0) {
      setError("Veuillez corriger les erreurs du mot de passe.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temporaryResetToken: token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Une erreur est survenue.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("Erreur de connexion au serveur.");
      setIsLoading(false);
    }
  };

  // ── Missing token ────────────────────────────────────────
  if (!token && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-headline text-2xl font-bold text-foreground">
            Lien invalide
          </h2>
          <p className="text-foreground/50">
            Ce lien de réinitialisation est invalide ou a expiré. Veuillez recommencer le processus.
          </p>
          <Link href="/forgot-password">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl">
              Demander un nouveau code
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Image & Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        <ImposingFloralCorners size="xl" corners={["bl", "tl"]} opacity={0.8} />
        <Image
          src="/mariage_one.png"
          alt="Eden Connexion — Union Bénie"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background z-10" />

        <div className="relative z-20 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-3 group">
            <Monogram className="w-10 h-10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
            <span className="font-headline text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Eden <span>Connexion</span>
            </span>
          </Link>

          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="font-headline text-4xl xl:text-5xl font-bold text-foreground leading-tight">
                Nouveau <br />
                <span className="text-primary italic font-normal">départ.</span>
              </h2>
              <p className="text-foreground/60 text-lg max-w-md leading-relaxed">
                Choisissez un mot de passe sécurisé pour protéger votre compte.
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-foreground/40">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">Chiffrement sécurisé</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/40">
                <Heart className="w-4 h-4 text-primary fill-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">Données protégées</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-5 sm:px-12 lg:px-16 xl:px-24 pt-24 pb-12 sm:py-12 relative">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-7 left-5">
          <Link href="/" className="flex items-center gap-3 group">
            <Monogram className="w-8 h-8 text-primary shrink-0" />
            <span className="font-headline text-xl font-bold text-foreground">
              Eden <span>Connexion</span>
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-right-4 duration-700 relative">
          <ImposingFloralCorners size="md" corners={["tr"]} opacity={0.45} className="hidden sm:block" />

          {!success ? (
            <>
              {/* Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  Sécurité
                </div>
                <h1 className="font-headline text-3xl sm:text-5xl font-bold text-foreground">
                  Nouveau mot de passe
                </h1>
                <p className="text-foreground/50 text-base">
                  Choisissez un mot de passe fort pour sécuriser votre compte.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                    Nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 text-base pr-14"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor:
                                level <= strength.score
                                  ? strength.color
                                  : "hsl(var(--foreground) / 0.1)",
                            }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </p>
                    </div>
                  )}

                  {/* Password Requirements */}
                  {password && (
                    <div className="space-y-1 pt-1">
                      {checks.map((check) => (
                        <div
                          key={check.label}
                          className="flex items-center gap-2 text-xs"
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 transition-colors ${
                              check.met
                                ? "text-primary"
                                : "text-foreground/20"
                            }`}
                          />
                          <span
                            className={
                              check.met
                                ? "text-foreground/60 line-through"
                                : "text-foreground/40"
                            }
                          >
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                    Confirmer le mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 text-base pr-14"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {confirmPasswordError}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive/90 leading-relaxed">
                      {error}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    passwordErrors.length > 0 ||
                    !password ||
                    !confirmPassword ||
                    password !== confirmPassword
                  }
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:shadow-primary/25 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Mise à jour...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Réinitialiser le mot de passe
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* Success State with animation */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500 delay-200">
                    <CheckCircle2 className="w-12 h-12 text-primary animate-in fade-in duration-500 delay-500" />
                  </div>
                  {/* Animated ring */}
                  <div className="absolute inset-0 w-24 h-24 border-4 border-primary/30 rounded-full animate-ping opacity-20" />
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                  Mot de passe mis à jour !
                </h2>
                <p className="text-foreground/50 text-base max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
                  Votre mot de passe a été réinitialisé avec succès.
                  Toutes vos sessions actives ont été invalidées pour votre sécurité.
                </p>
              </div>

              <div className="space-y-4 pt-4 animate-in fade-in duration-500 delay-700">
                <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    Veuillez vous reconnecter avec votre nouveau mot de passe.
                    Redirection automatique dans quelques secondes...
                  </p>
                </div>

                <Link href="/login">
                  <Button className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:shadow-primary/25 transition-all hover:scale-[1.02]">
                    <span className="flex items-center gap-2">
                      Se reconnecter
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page component with Suspense boundary ───────────────────
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
          <Monogram
            className="w-14 h-14 text-primary animate-pulse"
            style={{ animationDuration: "2s" }}
          />
          <p className="text-foreground/50 text-sm tracking-wide">Un instant…</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}