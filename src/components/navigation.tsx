"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Accueil", href: "/" },
    { name: "Le Concept", href: "/concept" },
    { name: "Parcours", href: "/parcours" },
    { name: "Blog", href: "/blog" },
    { name: "Témoignages", href: "/temoignages" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-foreground/5">
      <div className="container mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
          <Monogram className="w-10 h-10 sm:w-12 sm:h-12 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
          <span className="font-headline text-xl sm:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            Eden <span className="text-primary font-normal italic">Rencontre</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-12">
          <div className="flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-xs font-black tracking-[0.2em] uppercase text-foreground/60 hover:text-primary transition-all duration-300 relative group/link"
              >
                {link.name}
                <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover/link:w-full" />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-6 border-l border-foreground/10 pl-12">
            <Button variant="ghost" asChild className="text-foreground hover:text-primary font-bold text-sm tracking-wide transition-colors">
              <Link href="/login">Connexion</Link>
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 h-12 rounded-xl text-sm tracking-tighter shadow-xl shadow-primary/10 group" asChild>
              <Link href="/login" className="flex items-center justify-center">
                Commencer
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="lg:hidden text-foreground p-2 hover:bg-foreground/5 rounded-full transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "lg:hidden fixed inset-x-0 top-20 bg-card border-b border-foreground/10 transition-all duration-500 ease-in-out z-40 overflow-hidden",
          isOpen ? "max-h-[calc(100vh-5rem)] opacity-100 py-10 shadow-2xl overflow-y-auto" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col items-center gap-8 px-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="text-2xl font-headline font-bold text-foreground/80 hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <div className="w-full space-y-4 pt-8 border-t border-foreground/5">
            <Button variant="outline" className="w-full border-primary text-primary h-14 text-base font-bold rounded-2xl" asChild>
              <Link href="/login" onClick={() => setIsOpen(false)}>Se connecter</Link>
            </Button>
            <Button className="w-full bg-primary text-primary-foreground h-14 text-base font-black rounded-2xl shadow-2xl shadow-primary/20" asChild>
              <Link href="/login" onClick={() => setIsOpen(false)}>Commencer mon histoire</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}