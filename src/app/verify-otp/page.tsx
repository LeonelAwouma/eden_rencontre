"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Heart,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Monogram } from "@/components/ornaments";
import { ImposingFloralCorners } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

// ── OTP Duration ────────────────────────────────────────────
const OTP_DURATION = 10 * 60; // 10 minutes in seconds

// ── Inner component that uses useSearchParams ───────────────
function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const emailFromQuery = searchParams.get("email") || "";

  const [email] = useState(emailFromQuery);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(OTP_DURATION);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Countdown Timer ──────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // ── Enable resend after timer expires ─────────────────────
  useEffect(() => {
    if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft]);

  // ── Resend cooldown timer ────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Focus first input on mount ───────────────────────────
  useEffect(() => {
    if (emailFromQuery) {
      inputRefs.current[0]?.focus();
    }
  }, [emailFromQuery]);

  // ── Format time ──────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Handle OTP input change ──────────────────────────────
  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      if (value && !/^\d$/.test(value)) return;

      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      setError(null);

      // Move to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  // ── Handle key events ────────────────────────────────────
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === "ArrowRight" && index < 5) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  // ── Handle paste ─────────────────────────────────────────
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").trim();

      // Extract only digits from pasted content
      const digits = pasted.replace(/\D/g, "").slice(0, 6);

      if (digits.length === 0) return;

      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || "";
      }
      setOtp(newOtp);
      setError(null);

      // Focus the last filled input or the next empty one
      const focusIndex = Math.min(digits.length, 5);
      inputRefs.current[focusIndex]?.focus();
    },
    [otp]
  );

  // ── Submit OTP ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError(t("verifyOtp.incompleteCode"));
      return;
    }

    if (!email) {
      setError(t("verifyOtp.missingEmail"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await res.json();

      if (!res.ok || !data.verified) {
        setError(data.message || t("verifyOtp.verificationFailed"));
        setIsLoading(false);
        // Clear OTP on error for security
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Success — redirect to reset password with token
      const token = encodeURIComponent(data.temporaryResetToken);
      router.push(`/reset-password?token=${token}`);
    } catch {
      setError(t("verifyOtp.serverError"));
      setIsLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────
  const handleResend = async () => {
    if (isResending || resendCooldown > 0) return;

    setIsResending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("verifyOtp.resendFailed"));
        setIsResending(false);
        return;
      }

      // Reset timer and OTP
      setTimeLeft(OTP_DURATION);
      setCanResend(false);
      setResendCooldown(60); // 60 second cooldown before next resend
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError(t("verifyOtp.serverError"));
    } finally {
      setIsResending(false);
    }
  };

  // Redirect if no email
  if (!email) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-foreground/50">{t("verifyOtp.missingEmail")}</p>
          <Link href="/forgot-password">
            <Button variant="outline">{t("verifyOtp.back")}</Button>
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
        <div className="absolute inset-0 animate-breathe">
          <Image
            src="/mariage.webp"
            alt="Garden of Alliance — Union Bénie"
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
                {t("verifyOtp.leftTitle")} <br />
                <span className="text-primary italic font-normal"> {t("verifyOtp.leftTitleHighlight")}</span>
              </h2>
              <p className="text-foreground/60 text-lg max-w-md leading-relaxed">
                {t("verifyOtp.leftSubtitle")}
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-foreground/40">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{t("verifyOtp.uniqueCode")}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/40">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">{t("verifyOtp.expiresIn10")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — OTP Form */}
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

          {/* Back */}
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-primary text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("verifyOtp.back")}
          </Link>

          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t("verifyOtp.badge")}
            </div>
            <h1 className="font-headline text-3xl sm:text-5xl font-bold text-foreground">
              {t("verifyOtp.title")}
            </h1>
            <p className="text-foreground/50 text-base">
              {t("verifyOtp.subtitleSentTo")}{" "}
              <strong className="text-foreground/70">{email}</strong>
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border ${
                timeLeft > 0
                  ? "bg-primary/5 border-primary/20 text-primary"
                  : "bg-destructive/5 border-destructive/20 text-destructive"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono text-2xl font-bold tracking-wider">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* OTP Input */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-card border-2 rounded-xl text-foreground focus:border-primary focus-visible:ring-primary/30 transition-all ${
                    digit ? "border-primary/40 bg-primary/5" : "border-foreground/10"
                  } ${error ? "border-destructive/40" : ""}`}
                  disabled={isLoading || timeLeft === 0}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive/90 leading-relaxed">{error}</p>
              </div>
            )}

            {timeLeft === 0 && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive/90 leading-relaxed">
                  {t("verifyOtp.codeExpired")}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || timeLeft === 0 || otp.join("").length !== 6}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:shadow-primary/25 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t("verifyOtp.verifying")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t("verifyOtp.verifyCode")}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Resend */}
          <div className="text-center space-y-2 pt-2">
            <p className="text-foreground/40 text-sm">
              {t("verifyOtp.noCode")}
            </p>
            {resendCooldown > 0 ? (
              <p className="text-foreground/40 text-sm">
                {t("verifyOtp.newCodeIn")}{" "}
                <span className="font-mono font-bold text-primary">{resendCooldown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-2 text-primary font-bold text-base hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`}
                />
                {isResending ? t("verifyOtp.sending") : t("verifyOtp.resend")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page component with Suspense boundary ───────────────────
export default function VerifyOTPPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
          <Monogram
            className="w-14 h-14 text-primary animate-pulse"
            style={{ animationDuration: "2s" }}
          />
          <p className="text-foreground/50 text-sm tracking-wide">{t("verifyOtp.loading")}</p>
        </div>
      }
    >
      <VerifyOTPContent />
    </Suspense>
  );
}
