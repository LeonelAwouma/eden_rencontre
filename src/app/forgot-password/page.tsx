"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import { ImposingFloralCorners } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError(t("forgotPassword.emailRequired"));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t("forgotPassword.emailInvalid"));
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 200) {
        setError(data.message || t("forgotPassword.genericError"));
        setIsLoading(false);
        return;
      }

      // Always show success — generic response prevents enumeration
      setSuccess(true);
    } catch {
      setError(t("forgotPassword.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Image & Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        <ImposingFloralCorners size="xl" corners={["bl", "tl"]} opacity={0.8} />
        <div className="absolute inset-0 animate-breathe">
          <Image
            src="/couple-horizon.webp"
            alt="Couple face au coucher de soleil"
            fill
            className="object-cover"
            priority
          />
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
                {t("forgotPassword.leftTitle")} <br />
                <span className="text-primary italic font-normal">{t("forgotPassword.leftTitleHighlight")}</span>
              </h2>
              <p className="text-foreground/60 text-lg max-w-md leading-relaxed">
                {t("forgotPassword.leftSubtitle")}
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-foreground/40">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{t("forgotPassword.secureProcess")}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/40">
                <Heart className="w-4 h-4 text-primary fill-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{t("forgotPassword.protectedData")}</span>
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
              Garden <span>of Alliance</span>
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-right-4 duration-700 relative">
          <ImposingFloralCorners size="md" corners={["tr"]} opacity={0.45} className="hidden sm:block" />

          {/* Back to login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-primary text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("forgotPassword.backToLogin")}
          </Link>

          {!success ? (
            <>
              {/* Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
                  <Mail className="w-3.5 h-3.5" />
                  {t("forgotPassword.badge")}
                </div>
                <h1 className="font-headline text-3xl sm:text-5xl font-bold text-foreground">
                  {t("forgotPassword.title")}
                </h1>
                <p className="text-foreground/50 text-base">
                  {t("forgotPassword.subtitle")}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                    {t("forgotPassword.emailLabel")}
                  </Label>
                  <Input
                    type="email"
                    required
                    placeholder={t("forgotPassword.emailPlaceholder")}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => email && validateEmail(email)}
                    className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 text-base"
                  />
                  {emailError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {emailError}
                    </p>
                  )}
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
                  className="w-full h-14 bg-deep-eden hover:bg-deep-eden/90 text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-deep-eden/15 hover:shadow-deep-eden/25 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {t("forgotPassword.sending")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t("forgotPassword.submit")}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">
                  {t("forgotPassword.checkInbox")}
                </h2>
                <p className="text-foreground/50 text-base max-w-sm">
                  {t("forgotPassword.checkInboxDesc", { email: email.trim().toLowerCase() })}
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <Link href={`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`}>
                  <Button className="w-full h-14 bg-deep-eden hover:bg-deep-eden/90 text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-deep-eden/15 hover:shadow-deep-eden/25 transition-all hover:scale-[1.02]">
                    <span className="flex items-center gap-2">
                      {t("forgotPassword.enterCode")}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  </Button>
                </Link>

                <p className="text-center text-foreground/40 text-sm">
                  {t("forgotPassword.noCode")}{" "}
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                    className="text-primary font-bold hover:text-primary/80 transition-colors"
                  >
                    {t("forgotPassword.retry")}
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
