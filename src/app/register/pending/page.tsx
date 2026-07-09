"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Mail, ArrowLeft } from "lucide-react";
import { Monogram } from "@/components/ornaments";

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 group">
          <Monogram className="w-10 h-10 text-primary shrink-0" />
          <span className="font-headline text-2xl font-bold tracking-tight text-foreground">
            Eden <span className="text-primary font-normal italic">Rencontre</span>
          </span>
        </Link>

        {/* Icon */}
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="font-headline text-3xl sm:text-4xl font-bold text-foreground">
            Inscription en cours de vérification
          </h1>
          <p className="text-foreground/50 text-base leading-relaxed">
            Merci pour votre inscription sur Eden Rencontre. Votre compte est actuellement
            en cours de validation par notre équipe.
          </p>
        </div>

        {/* Email notification */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-left">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-5 h-5 text-primary" />
            <p className="font-bold text-sm text-foreground">Confirmation envoyée</p>
          </div>
          <p className="text-sm text-foreground/50 leading-relaxed">
            Un email de confirmation a été envoyé à{" "}
            <span className="text-primary font-medium">{email || "votre adresse email"}</span>.
            Vous recevrez un second email dès que votre compte sera approuvé.
          </p>
        </div>

        {/* What happens next */}
        <div className="space-y-3 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/30">Prochaines étapes</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-foreground/60">Notre équipe examine votre profil</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-foreground/60">Vous recevez un email de confirmation</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-foreground/60">Vous pouvez vous connecter et accéder au Sanctuaire</p>
            </div>
          </div>
        </div>

        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <p className="text-foreground/15 text-[10px] font-medium uppercase tracking-widest">
          Eden Rencontre — Alliance Bénie
        </p>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-[#FF9E45]/20 border-t-[#FF9E45] rounded-full animate-spin" /></div>}>
      <PendingContent />
    </Suspense>
  );
}
