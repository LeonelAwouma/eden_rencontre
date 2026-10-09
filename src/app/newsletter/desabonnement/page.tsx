"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { GardenSection, PageHeader } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

// Confirmation explicite (bouton) plutôt qu'un désabonnement au simple chargement :
// les antivirus de messagerie ouvrent les liens et désabonneraient à tort.
function UnsubscribeContent() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const email = sp.get("e") || "";
  const token = sp.get("t") || "";
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(email && token ? "idle" : "error");

  const confirm = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/blog/newsletter/unsubscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
  };

  return (
    <div className="eden-leaf-card max-w-xl mx-auto p-8 text-center">
      {state === "done" ? (
        <>
          <h2 className="font-headline text-2xl font-bold text-deep-eden mb-4">{t("newsletterUnsubscribe.doneTitle")}</h2>
          <p className="text-muted-foreground font-body mb-6">{t("newsletterUnsubscribe.doneDesc")}</p>
          <Link href="/blog" className="text-primary hover:text-deep-eden underline">{t("newsletterUnsubscribe.backToBlog")}</Link>
        </>
      ) : state === "error" ? (
        <>
          <h2 className="font-headline text-2xl font-bold text-deep-eden mb-4">{t("newsletterUnsubscribe.errorTitle")}</h2>
          <p className="text-muted-foreground font-body mb-6">{t("newsletterUnsubscribe.errorDesc")}</p>
          <a href="mailto:contact@gardenofalliance.com" className="text-primary hover:text-deep-eden underline">contact@gardenofalliance.com</a>
        </>
      ) : (
        <>
          <p className="text-muted-foreground font-body mb-2">{t("newsletterUnsubscribe.confirmDesc")}</p>
          <p className="font-semibold text-foreground mb-8 break-all">{email}</p>
          <Button onClick={confirm} disabled={state === "loading"} size="lg" className="bg-deep-eden hover:bg-deep-eden/90 text-background font-bold">
            {state === "loading" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("newsletterUnsubscribe.confirmButton")}
          </Button>
        </>
      )}
    </div>
  );
}

export default function NewsletterUnsubscribePage() {
  const { t } = useI18n();
  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />
      <main className="flex-1">
        <GardenSection variant="garden" className="py-12 sm:py-16 relative">
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <PageHeader eyebrow={t("newsletterUnsubscribe.eyebrow")} title={t("newsletterUnsubscribe.title")} className="mb-10 sm:mb-14" />
            <Suspense fallback={<div className="h-48 max-w-xl mx-auto rounded-2xl animate-pulse bg-muted/70" />}>
              <UnsubscribeContent />
            </Suspense>
          </div>
        </GardenSection>
      </main>
      <Footer />
    </div>
  );
}
