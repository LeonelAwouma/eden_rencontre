
"use client";

import Link from "next/link";
import { Heart, Instagram, Facebook, Twitter } from "lucide-react";
import { useEffect, useState } from "react";
import { Monogram } from "@/components/ornaments";

export function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-background border-t border-foreground/5 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <Monogram className="w-8 h-8 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
              <span className="font-headline text-xl font-bold text-foreground group-hover:text-accent transition-colors">Eden Rencontre</span>
            </Link>
            <p className="text-foreground/60 text-sm leading-relaxed">
              L'alliance bénie commence par une rencontre vraie. Une communauté sacrée pour des mariages basés sur des valeurs bibliques partagées.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-foreground/60 hover:text-primary transition-all hover:scale-110"><Instagram className="w-6 h-6" /></Link>
              <Link href="#" className="text-foreground/60 hover:text-primary transition-all hover:scale-110"><Facebook className="w-6 h-6" /></Link>
              <Link href="#" className="text-foreground/60 hover:text-primary transition-all hover:scale-110"><Twitter className="w-6 h-6" /></Link>
            </div>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6">Plateforme</h4>
            <ul className="space-y-4 text-sm text-foreground/60">
              <li><Link href="/concept" className="hover:text-accent transition-colors">Le Concept</Link></li>
              <li><Link href="/parcours" className="hover:text-accent transition-colors">Parcours de Foi</Link></li>
              <li><Link href="/tarifs" className="hover:text-accent transition-colors">Tarifs</Link></li>
              <li><Link href="/temoignages" className="hover:text-accent transition-colors">Témoignages</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-foreground/60">
              <li><Link href="/faq" className="hover:text-accent transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
              <li><Link href="/securite" className="hover:text-accent transition-colors">Sécurité &amp; confiance</Link></li>
              <li><Link href="/blog" className="hover:text-accent transition-colors">Édification Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline text-foreground font-bold mb-6">Légal</h4>
            <ul className="space-y-4 text-sm text-foreground/60">
              <li><Link href="/mentions" className="hover:text-accent transition-colors">Mentions Légales</Link></li>
              <li><Link href="/confidentialite" className="hover:text-accent transition-colors">Confidentialité (RGPD)</Link></li>
              <li><Link href="/cgu" className="hover:text-accent transition-colors">CGU</Link></li>
              <li><Link href="/charte" className="hover:text-accent transition-colors">Charte Éthique</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-foreground/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-foreground/40 text-xs">
            © {year ?? '...'} Eden Rencontre. Tous droits réservés.
          </p>
          <p className="text-foreground/40 text-xs flex items-center gap-1">
            Fait avec <Heart className="w-3 h-3 text-primary fill-primary" /> pour la gloire de Dieu.
          </p>
        </div>
      </div>
    </footer>
  );
}
