"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, ShieldCheck, Heart, MailCheck, KeyRound } from "lucide-react";
import { Monogram } from "@/components/ornaments";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSent(true);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Image & Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
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
                Reprenez le <br />
                <span className="text-primary italic font-normal">chemin.</span>
              </h2>
              <p className="text-foreground/60 text-lg max-w-md leading-relaxed">
                Un instant d'égarement n'efface pas votre alliance. Réinitialisez votre accès en toute sérénité.
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-foreground/40">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">Lien sécurisé</span>
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
        <div className="lg:hidden absolute top-7 left-5">
          <Link href="/" className="flex items-center gap-3 group">
            <Monogram className="w-8 h-8 text-primary shrink-0" />
            <span className="font-headline text-xl font-bold text-foreground">
              Eden <span>Connexion</span>
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
          {!sent ? (
            <>
              {/* Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  Récupération
                </div>
                <h1 className="font-headline text-3xl sm:text-5xl font-bold text-foreground">
                  Mot de passe oublié ?
                </h1>
                <p className="text-foreground/50 text-base">
                  Entrez votre adresse email. Nous vous enverrons un lien pour rétablir votre accès au sanctuaire.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                    Adresse email
                  </Label>
                  <Input
                    type="email"
                    required
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30 text-base"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:shadow-primary/25 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Envoyer le lien
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Back to login */}
              <div className="text-center pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-foreground/40 hover:text-primary font-medium text-sm transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Retour à la connexion
                </Link>
              </div>
            </>
          ) : (
            /* Confirmation state */
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20">
                <MailCheck className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="font-headline text-3xl sm:text-4xl font-bold text-foreground">
                  Vérifiez vos emails
                </h1>
                <p className="text-foreground/50 text-base leading-relaxed">
                  Si un compte est associé à{" "}
                  <span className="text-primary font-bold">{email}</span>, un lien de réinitialisation vient d'être envoyé. Pensez à consulter vos courriers indésirables.
                </p>
              </div>

              <div className="bg-card border border-foreground/5 rounded-2xl p-5 flex items-start gap-4 text-left">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/40 leading-relaxed">
                  Le lien expire dans 30 minutes pour garantir la sécurité de votre alliance. Vous n'avez rien reçu ?{" "}
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary hover:text-primary/80 font-bold transition-colors"
                  >
                    Renvoyer
                  </button>
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-foreground/40 hover:text-primary font-medium text-sm transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Retour à la connexion
              </Link>
            </div>
          )}

          {/* Footer info */}
          <p className="text-center text-foreground/20 text-[10px] font-medium uppercase tracking-widest pt-4">
            Besoin d'aide ?{" "}
            <Link href="/concept" className="text-foreground/30 hover:text-primary/60 transition-colors">Contactez le sanctuaire</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
