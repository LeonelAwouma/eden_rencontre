"use client";

import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PageHeader } from "@/components/garden";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";

const FAQ_COUNT = 7;

export default function FAQPage() {
  const { t } = useI18n();

  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`faq.q${i + 1}`),
    a: t(`faq.a${i + 1}`),
  }));

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1">
        <section className="relative eden-sky py-12 sm:py-16 overflow-hidden">

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <PageHeader
              eyebrow={t("faq.eyebrow")}
              title={t("faq.title")}
              highlight={t("faq.titleHighlight")}
              subtitle={t("faq.subtitle")}
            />

            {/* ── Les questions, repliées par défaut : la page reste courte et lisible ── */}
            <div className="max-w-3xl mx-auto mt-14 sm:mt-20">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="eden-leaf-card border-none px-6 sm:px-8 data-[state=open]:border-sage/45"
                  >
                    <AccordionTrigger className="py-5 sm:py-6 text-left hover:no-underline gap-4 [&>svg]:text-primary/60 [&>svg]:w-5 [&>svg]:h-5">
                      <span className="font-headline text-lg sm:text-xl font-bold text-foreground tracking-tight">
                        {faq.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 sm:pb-7 pr-6">
                      <div className="eden-hairline mb-5" aria-hidden="true" />
                      <p className="text-[0.95rem] sm:text-base text-muted-foreground leading-relaxed font-body">
                        {faq.a}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* ── Sortie de secours vers le support ── */}
              <div className="mt-12 text-center">
                <p className="text-sm sm:text-base text-muted-foreground font-body">
                  {t("faq.stillStuck")}{" "}
                  <Link
                    href="/contact"
                    className="growing-underline text-primary font-medium hover:text-deep-eden transition-colors"
                  >
                    {t("faq.contactLink")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
