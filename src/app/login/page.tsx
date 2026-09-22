"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Heart, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { signInWithGoogle, getSession } from "@/lib/auth";
import { Monogram } from "@/components/ornaments";
import { ImposingFloralCorners } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

// Page à rouvrir après connexion (?next=/dashboard/academie). Seuls les chemins
// internes sont acceptés, pour qu'un lien piégé ne puisse pas rediriger ailleurs.
function nextPath(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Si l'utilisateur vient de s'inscrire, il doit se connecter explicitement.
    if (params.get("registered") === "1") {
      setJustRegistered(true);
      const email = params.get("email");
      if (email) setFormData((prev) => ({ ...prev, email }));
      setCheckingSession(false);
      return;
    }
    // Reconnexion automatique : si une session existe déjà, on saute la connexion.
    getSession().then((session) => {
      if (session) {
        router.replace(nextPath() || "/searching?returning=1");
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "pending") {
          router.push(`/register/pending?email=${encodeURIComponent(formData.email)}`);
          return;
        }
        if (data.error === "rejected") {
          setError(t("login.errorRejected"));
          setIsLoading(false);
          return;
        }
        if (data.error === "suspended") {
          setError(t("login.errorSuspended"));
          setIsLoading(false);
          return;
        }
        setError(data.error || data.message || t("login.errorConnection"));
        setIsLoading(false);
        return;
      }

      // Also sign in on client-side Supabase for session continuity
      // The server already validated, so we can use the client-side signIn
      const { supabase } = await import("@/lib/supabase");
      if (supabase) {
        await supabase.auth.signInWithPassword({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
      }

      router.push(nextPath() || "/searching");
    } catch {
      setError(t("login.errorServer"));
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsLoading(true);
    const res = await signInWithGoogle();
    if (!res.ok) {
      setError(res.error || t("login.googleError"));
      setIsLoading(false);
    }
    // Si ok : redirection vers Google puis retour sur /searching
  };

  // Pendant la vérification de session, on évite de faire clignoter le formulaire.
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <Monogram className="w-14 h-14 text-primary animate-pulse" style={{ animationDuration: "2s" }} />
        <p className="text-foreground/50 text-sm tracking-wide">{t("login.checkingSession")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Image & Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        <ImposingFloralCorners size="xl" corners={["bl", "tl"]} opacity={0.8} />
        {/* Background Image — léger mouvement pour une photo "vivante".
            Le bandeau de marque est incrusté sur le bord droit du visuel :
            on ancre le recadrage à droite pour ne jamais le rogner. */}
        <div className="absolute inset-0 animate-breathe">
          <Image
            src="/couple-mariage.webp"
            alt="Mariage chrétien — baiser sur le front"
            fill
            className="object-cover object-right"
            priority
          />
        </div>
        {/* Overlays — concentrés au pied du visuel, le reste de la photo respire */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/45 to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

        {/* Content over image */}
        <div className="relative z-20 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Monogram className="w-10 h-10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
            <span className="font-headline text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Garden <span>of Alliance</span>
            </span>
          </Link>

          {/* Bottom quote */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="font-headline text-4xl xl:text-5xl font-bold text-foreground leading-tight">
                {t("login.leftTitle")} <br />
                <span className="text-primary italic font-normal">{t("login.leftTitleHighlight")}</span>
              </h2>
              <p className="text-foreground/60 text-lg max-w-md leading-relaxed">
                {t("login.leftSubtitle")}
              </p>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-foreground/40">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{t("login.secureConnection")}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/40">
                <Heart className="w-4 h-4 text-primary fill-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{t("login.protectedData")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      {/* Le retrait horizontal desktop est porté par la colonne, pas par le bloc
          de formulaire : sinon il se soustrait de son max-w-md et rétrécit les
          champs. En dessous de lg, la bannière image doit rester pleine largeur. */}
      <div className="flex-1 flex flex-col justify-center items-center pb-12 sm:py-12 lg:px-16 xl:px-24 relative">
        {/* Mobile Image Banner — bandeau large : on garde le visuel sans texte
            incrusté, qui doublerait le logo du site et serait rogné ici. */}
        <div className="lg:hidden relative w-full h-52 sm:h-64 shrink-0 overflow-hidden">
          <div className="absolute inset-0 animate-breathe">
            <Image
              src="/mariage.webp"
              alt="Mariage chrétien — Garden of Alliance"
              fill
              className="object-cover object-[50%_25%]"
            />
          </div>
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
          <Link href="/" className="absolute top-5 left-5 flex items-center gap-2.5 group">
            <Monogram className="w-8 h-8 text-primary shrink-0" />
            <span className="font-headline text-xl font-bold text-foreground">
              Garden <span>of Alliance</span>
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8 sm:space-y-10 px-5 sm:px-12 lg:px-0 pt-8 lg:pt-0 animate-in fade-in slide-in-from-right-4 duration-700 relative">
          <ImposingFloralCorners size="md" corners={["tr"]} opacity={0.45} className="hidden sm:block" />
          {/* Header — passe au-dessus du brin floral, qui est en absolu sur le bloc */}
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
              <Heart className="w-3.5 h-3.5 fill-primary" />
              {t("login.title")} {t("login.titleHighlight")}
            </div>
            <h1 className="font-headline text-3xl sm:text-5xl font-bold text-foreground">
              {t("login.submit")}
            </h1>
            <p className="text-foreground/50 text-base">
              {t("login.subtitle")}
            </p>
          </div>

          {justRegistered && (
            <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/70 leading-relaxed">
                {t("login.justRegistered", { bold: "" })}
                <span className="text-primary font-bold">{t("login.justRegisteredBold")}</span>
                {t("login.justRegistered").split("{bold}")[1]}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                {t("login.emailLabel")}
              </Label>
              <Input
                type="email"
                required
                placeholder={t("login.emailPlaceholder")}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 text-base"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                  {t("login.passwordLabel")}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary/80 hover:text-primary font-medium transition-colors"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 text-base pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive/90 leading-relaxed">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:shadow-primary/25 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t("login.submitting")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t("login.submit")}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-foreground/5" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-foreground/30 font-medium uppercase tracking-widest">{t("login.or")}</span>
            </div>
          </div>

          {/* Google SSO */}
          <Button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            variant="outline"
            className="w-full h-14 rounded-xl border-foreground/10 bg-card hover:bg-foreground/5 hover:border-foreground/20 text-foreground font-bold text-base gap-3 transition-all disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t("login.googleSso")}
          </Button>

          {/* Register CTA */}
          <div className="text-center space-y-2 pt-4">
            <p className="text-foreground/40 text-sm">
              {t("login.notMember")}
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-primary font-bold text-base hover:text-primary/80 transition-colors group"
            >
              {t("login.createProfile")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Footer info */}
          <p className="text-center text-balance text-foreground/20 text-[10px] font-medium uppercase tracking-widest pt-4">
            {t("login.termsPrefix")}{" "}
            <Link href="/charte" className="text-foreground/30 hover:text-primary/60 transition-colors">{t("login.charter")}</Link>
            {" "}{t("login.termsAnd")}{" "}
            <Link href="/cgu" className="text-foreground/30 hover:text-primary/60 transition-colors">{t("login.terms")}</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
