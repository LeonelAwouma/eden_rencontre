"use client";

import Link from "next/link";
import { Heart, Leaf } from "lucide-react";
import { useEffect, useState } from "react";
import { Monogram } from "@/components/ornaments";

export function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative bg-background border-t border-sage/10 py-16 overflow-hidden">
      {/* Subtle botanical background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 110 Q55 80 60 50 Q65 30 60 10' stroke='hsl(155 42%25 18%25)' stroke-width='0.4' fill='none'/%3E%3Cellipse cx='50' cy='40' rx='10' ry='5' fill='hsl(145 22%25 62%25)' opacity='0.3' transform='rotate(-30 50 40)'/%3E%3Cellipse cx='72' cy='70' rx='8' ry='4' fill='hsl(95 28%25 38%25)' opacity='0.2' transform='rotate(25 72 70)'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 120px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <Monogram className="w-8 h-8 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
              <span className="font-headline text-xl font-bold text-foreground group-hover:text-deep-eden transition-colors">
                Eden <span>Connexion</span>
              </span>
            </Link>
            <p className="text-foreground/60 text-sm leading-relaxed font-body">
              L'alliance bénie commence par une rencontre vraie. Une communauté sacrée pour des mariages basés sur des valeurs bibliques partagées.
            </p>
            <div className="flex gap-4">
              {/* Botanical-style social icons */}
              <Link href="#" className="w-9 h-9 rounded-full bg-deep-eden/5 flex items-center justify-center text-foreground/50 hover:text-deep-eden hover:bg-deep-eden/10 transition-all" aria-label="Instagram">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1"/></svg>
              </Link>
              <Link href="#" className="w-9 h-9 rounded-full bg-deep-eden/5 flex items-center justify-center text-foreground/50 hover:text-deep-eden hover:bg-deep-eden/10 transition-all" aria-label="Facebook">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </Link>
              <Link href="#" className="w-9 h-9 rounded-full bg-deep-eden/5 flex items-center justify-center text-foreground/50 hover:text-deep-eden hover:bg-deep-eden/10 transition-all" aria-label="Twitter">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6 text-base">Plateforme</h4>
            <ul className="space-y-4 text-sm text-foreground/60 font-body">
              <li><Link href="/concept" className="growing-underline hover:text-deep-eden transition-colors">Le Concept</Link></li>
              <li><Link href="/parcours" className="growing-underline hover:text-deep-eden transition-colors">Parcours de Foi</Link></li>
              <li><Link href="/tarifs" className="growing-underline hover:text-deep-eden transition-colors">Tarifs</Link></li>
              <li><Link href="/temoignages" className="growing-underline hover:text-deep-eden transition-colors">Témoignages</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6 text-base">Support</h4>
            <ul className="space-y-4 text-sm text-foreground/60 font-body">
              <li><Link href="/faq" className="growing-underline hover:text-deep-eden transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="growing-underline hover:text-deep-eden transition-colors">Contact</Link></li>
              <li><Link href="/securite" className="growing-underline hover:text-deep-eden transition-colors">Sécurité & confiance</Link></li>
              <li><Link href="/blog" className="growing-underline hover:text-deep-eden transition-colors">Édification Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6 text-base">Légal</h4>
            <ul className="space-y-4 text-sm text-foreground/60 font-body">
              <li><Link href="/mentions" className="growing-underline hover:text-deep-eden transition-colors">Mentions Légales</Link></li>
              <li><Link href="/confidentialite" className="growing-underline hover:text-deep-eden transition-colors">Confidentialité (RGPD)</Link></li>
              <li><Link href="/cgu" className="growing-underline hover:text-deep-eden transition-colors">CGU</Link></li>
              <li><Link href="/charte" className="growing-underline hover:text-deep-eden transition-colors">Charte Éthique</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with botanical divider */}
        <div className="mt-16 pt-8 border-t border-sage/8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-foreground/40 text-xs font-body">
            © {year ?? '...'} Eden Connexion. Tous droits réservés.
          </p>
          <p className="text-foreground/40 text-xs flex items-center gap-1.5 font-body">
            Fait avec <Heart className="w-3 h-3 text-pomegranate" /> et <Leaf className="w-3 h-3 text-olive" /> pour la gloire de Dieu.
          </p>
        </div>
      </div>
    </footer>
  );
}