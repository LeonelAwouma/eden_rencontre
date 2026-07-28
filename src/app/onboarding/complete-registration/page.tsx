"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getSession, ageFromBirthDate, MIN_AGE } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { MARRIAGE_VALUES } from "@/lib/values";
import { Monogram } from "@/components/ornaments";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  Upload,
  Star,
  CheckCircle2,
  X,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Plus,
  Search,
  MapPin,
  ShieldCheck,
  Heart,
} from "lucide-react";

// TikTok Logo SVG
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.06-.03-.11-.07-.17-.1v9.99c-.05 2.33-.85 4.59-2.63 6.18-2.25 2.01-5.51 2.53-8.23 1.5-2.73-1.02-4.75-3.66-4.93-6.63-.2-3.32 1.83-6.49 4.96-7.56.88-.3 1.82-.44 2.75-.43V11c-.99.04-1.95.33-2.8.85-1.19.72-1.99 1.94-2.14 3.32-.19 1.7.53 3.39 1.87 4.43 1.34 1.05 3.2 1.25 4.7 0.51 1.13-.56 1.88-1.68 1.96-2.93.02-1.6.01-3.21.01-4.81 0-3.37.01-6.74.01-10.11z"/>
  </svg>
);

const COUNTRIES_DATA: Record<string, string[]> = {
  "Sénégal": ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Mbour", "Kaolack", "Kolda", "Touba", "Louga"],
  "Côte d'Ivoire": ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo", "Daloa", "Man"],
  "Cameroun": ["Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua", "Bafoussam", "Ngaoundéré"],
  "RD Congo": ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Goma", "Kisangani", "Bukavu", "Kananga"],
  "Gabon": ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Moanda"],
  "Mali": ["Bamako", "Sikasso", "Mopti", "Koutiala", "Kayes", "Ségou", "Gao"],
  "Bénin": ["Cotonou", "Porto-Novo", "Parakou", "Djougou", "Abomey-Calavi"],
  "Togo": ["Lomé", "Sokodé", "Kara", "Atakpamé", "Kpalimé"],
  "Burkina Faso": ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya", "Banfora"],
  "Congo-Brazzaville": ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi"],
  "Guinée": ["Conakry", "Nzérékoré", "Kankan", "Kindia", "Labé"],
  "Niger": ["Niamey", "Zinder", "Maradi", "Agadez", "Tahoua"],
  "France": ["Paris", "Lyon", "Marseille", "Lille", "Bordeaux", "Nantes", "Strasbourg", "Montpellier"],
  "Belgique": ["Bruxelles", "Anvers", "Liège", "Charleroi", "Gand"],
  "Canada": ["Montréal", "Toronto", "Ottawa", "Québec", "Calgary", "Vancouver"],
  "USA": ["New York", "Washington", "Atlanta", "Chicago", "Houston", "Miami", "Los Angeles"],
  "Suisse": ["Genève", "Lausanne", "Zurich", "Bâle"],
  "Royaume-Uni": ["Londres", "Birmingham", "Manchester", "Glasgow"]
};

const AFRICAN_COUNTRIES = [
  "Sénégal", "Côte d'Ivoire", "Cameroun", "RD Congo", "Gabon", "Mali", "Bénin", "Togo", "Burkina Faso", "Congo-Brazzaville", "Guinée", "Niger"
];

const DIASPORA_COUNTRIES = [
  "France", "Belgique", "Canada", "USA", "Suisse", "Royaume-Uni"
];

const STEP_TITLES = [
  "Votre identité",
  "Comment nous avez-vous trouvé ?",
  "Votre situation",
  "Votre résidence",
  "Votre pays",
  "Votre ville",
  "Vos informations",
  "Vos valeurs",
  "Charte d'engagement",
  "Bienvenue !",
];

export default function CompleteRegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingGender, setPendingGender] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [formData, setFormData] = useState({
    gender: "",
    discoverySource: "",
    civilStatus: "",
    region: "",
    country: "",
    city: "",
    birthDate: "",
    marriageVision: [] as string[],
    charterAuthorizeVerification: false,
    charterCommitRespectful: false,
    charterAcceptFull: false,
  });

  const age = ageFromBirthDate(formData.birthDate);
  const ageValid = age !== null && age >= MIN_AGE;

  const totalSteps = 10;
  const progress = ((step + 1) / totalSteps) * 100;

  // Verify user is authenticated (came from Google OAuth)
  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      // Check if profile is already complete (user already filled this out)
      if (session.gender && session.region && session.country && session.city && session.birthDate) {
        router.replace("/onboarding");
        return;
      }
      setUserEmail(session.email || "");
      setUserName(session.name || "");
      setLoading(false);
    })();
  }, [router]);

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleGenderSelection = (gender: "homme" | "femme") => {
    setPendingGender(gender);
    setShowConfirmDialog(true);
  };

  const confirmGender = () => {
    if (pendingGender) {
      setFormData({ ...formData, gender: pendingGender });
      setShowConfirmDialog(false);
      nextStep();
    }
  };

  const toggleValue = (val: string) => {
    setFormData((prev) => {
      const current = prev.marriageVision;
      if (current.includes(val)) return { ...prev, marriageVision: current.filter((v) => v !== val) };
      if (current.length >= 3) return prev;
      return { ...prev, marriageVision: [...current, val] };
    });
  };

  const handleRegionSelect = (region: string) => {
    setFormData({ ...formData, region, country: "", city: "" });
    nextStep();
  };

  const handleCountrySelect = (country: string) => {
    setFormData({ ...formData, country, city: "" });
    nextStep();
  };

  const handleCitySelect = (city: string) => {
    setFormData({ ...formData, city });
    nextStep();
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleComplete = async () => {
    setSaveError(null);
    setSaving(true);

    try {
      // Get the current Supabase session to include the access token
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch("/api/auth/google-onboarding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          gender: formData.gender,
          birthDate: formData.birthDate,
          discoverySource: formData.discoverySource,
          civilStatus: formData.civilStatus,
          region: formData.region,
          country: formData.country,
          city: formData.city,
          marriageVision: formData.marriageVision,
          charterAuthorizeVerification: formData.charterAuthorizeVerification,
          charterCommitRespectful: formData.charterCommitRespectful,
          charterAcceptFull: formData.charterAcceptFull,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Erreur lors de l'enregistrement.");
        setSaving(false);
        return;
      }

      // Redirect to the standard onboarding questionnaire
      router.push("/onboarding");
    } catch {
      setSaveError("Erreur de connexion au serveur.");
      setSaving(false);
    }
  };

  const availableCountries = formData.region === "Afrique" ? AFRICAN_COUNTRIES : DIASPORA_COUNTRIES;
  const filteredCountries = availableCountries.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()));

  const availableCities = formData.country ? COUNTRIES_DATA[formData.country] || [] : [];
  const filteredCities = availableCities.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()));

  const discoverySources = [
    { name: "TikTok", icon: <TikTokIcon className="w-5 h-5 text-[#ff0050]" /> },
    { name: "Instagram", icon: <Instagram className="w-5 h-5 text-[#E4405F]" /> },
    { name: "Facebook", icon: <Facebook className="w-5 h-5 text-[#1877F2]" /> },
    { name: "Bouche à oreille", icon: <MessageCircle className="w-5 h-5 text-primary" /> },
    { name: "YouTube", icon: <Youtube className="w-5 h-5 text-[#FF0000]" /> },
    { name: "Autre", icon: <Plus className="w-5 h-5 text-foreground/40" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <Monogram className="w-14 h-14 text-primary animate-pulse" style={{ animationDuration: "2s" }} />
        <p className="text-foreground/50 text-sm tracking-wide">Chargement de votre profil…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Image & Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] relative overflow-hidden">
        <Image
          src="/mariage.png"
          alt="Eden Connexion — Alliance Bénie"
          fill
          className="object-cover object-center"
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
                Complétez votre <br />
                <span className="text-primary italic font-normal">profil sacré.</span>
              </h2>
              <p className="text-foreground/60 text-lg max-w-md leading-relaxed">
                Bienvenue {userName} ! Quelques informations supplémentaires sont nécessaires pour rejoindre la communauté Eden.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-foreground/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Vérification d'identité par IA</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-primary fill-primary" />
                </div>
                <span className="text-sm font-medium">Affinités spirituelles avancées</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Communauté modérée 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Completion Form */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-foreground/5">
          <Link href="/" className="flex items-center gap-3 group">
            <Monogram className="w-8 h-8 text-primary shrink-0" />
            <span className="font-headline text-lg font-bold text-foreground">
              Eden <span>Connexion</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-5 sm:px-12 lg:px-16 xl:px-20 py-8 sm:py-10">
          <div className="w-full max-w-lg space-y-7 sm:space-y-8">
            {/* Welcome banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary text-sm">Connexion Google réussie</p>
                <p className="text-xs text-foreground/40">{userEmail}</p>
              </div>
            </div>

            {/* Progress Bar */}
            {step <= 9 && (
              <div className="space-y-3 animate-in fade-in duration-500">
                <Progress value={progress} className="h-1.5 bg-foreground/5" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                    Étape {step + 1} / {totalSteps}
                  </span>
                  <span className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">
                    {Math.round(progress)}% complété
                  </span>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 0 — Gender Selection */}
            {/* ============================================================ */}
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Confirmons une chose</h1>
                  <p className="text-foreground/50 text-base">Cette information est cruciale pour votre recherche d'alliance.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleGenderSelection("homme")}
                    className="bg-card hover:bg-foreground/5 transition-all p-8 sm:p-10 rounded-3xl text-center border border-foreground/5 group shadow-xl hover:border-primary/50 hover:shadow-primary/5"
                  >
                    <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">👦</span>
                    <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Homme</p>
                    <p className="text-primary/50 text-xs mt-1 font-medium">Je verrai des femmes</p>
                  </button>

                  <button
                    onClick={() => handleGenderSelection("femme")}
                    className="bg-card hover:bg-foreground/5 transition-all p-8 sm:p-10 rounded-3xl text-center border border-foreground/5 group shadow-xl hover:border-primary/50 hover:shadow-primary/5"
                  >
                    <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">👧</span>
                    <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Femme</p>
                    <p className="text-primary/50 text-xs mt-1 font-medium">Je verrai des hommes</p>
                  </button>
                </div>

                <div className="flex justify-center">
                  <div className="bg-olive/10 border border-olive/20 rounded-full py-2 px-5 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-olive" />
                    <p className="text-olive/80 text-[10px] font-bold uppercase tracking-widest">Information définitive</p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 1 — Discovery Source */}
            {/* ============================================================ */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Votre venue parmi nous</h1>
                  <p className="text-foreground/50 text-base">Comment avez-vous découvert Eden Connexion ?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {discoverySources.map((source) => (
                    <Button
                      key={source.name}
                      variant="outline"
                      onClick={() => { setFormData({ ...formData, discoverySource: source.name }); nextStep(); }}
                      className="h-14 rounded-xl border-foreground/5 bg-card hover:bg-foreground/5 hover:border-primary/50 text-base font-medium text-foreground/80 gap-3 group"
                    >
                      <span className="group-hover:scale-110 transition-transform">{source.icon}</span>
                      <span className="group-hover:text-primary transition-colors">{source.name}</span>
                    </Button>
                  ))}
                </div>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 2 — Civil Status */}
            {/* ============================================================ */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Votre situation actuelle</h1>
                  <p className="text-foreground/50 text-base">Pour mieux comprendre votre parcours de vie.</p>
                </div>
                <div className="space-y-3">
                  {["Célibataire", "Veuf / Veuve", "Divorcé(e)"].map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      onClick={() => { setFormData({ ...formData, civilStatus: s }); nextStep(); }}
                      className="w-full h-16 rounded-xl border-foreground/5 bg-card hover:bg-foreground/5 hover:border-primary/50 text-lg font-bold text-foreground hover:text-primary"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 3 — Region */}
            {/* ============================================================ */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Votre résidence</h1>
                  <p className="text-foreground/50 text-base">Où vivez-vous actuellement ?</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRegionSelect("Afrique")}
                    className="bg-card border-foreground/5 p-10 rounded-3xl text-center hover:border-primary/50 border cursor-pointer transition-all group shadow-xl"
                  >
                    <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">🌍</span>
                    <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Afrique</p>
                  </button>
                  <button
                    onClick={() => handleRegionSelect("Diaspora")}
                    className="bg-card border-foreground/5 p-10 rounded-3xl text-center hover:border-primary/50 border cursor-pointer transition-all group shadow-xl"
                  >
                    <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">✈️</span>
                    <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Diaspora</p>
                  </button>
                </div>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 4 — Country */}
            {/* ============================================================ */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Sélectionnez votre pays</h1>
                  <p className="text-foreground/50 text-base">Votre pays de résidence en {formData.region}.</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 w-5 h-5" />
                  <Input
                    placeholder="Rechercher un pays..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="pl-12 h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredCountries.map((country) => (
                    <Button
                      key={country}
                      variant="outline"
                      onClick={() => handleCountrySelect(country)}
                      className="h-14 rounded-xl border-foreground/5 bg-card hover:bg-foreground/5 hover:border-primary/50 text-base font-bold text-foreground/80 group text-left justify-start px-6"
                    >
                      <MapPin className="w-4 h-4 text-primary/40 group-hover:text-primary mr-2" />
                      <span className="group-hover:text-primary transition-colors">{country}</span>
                    </Button>
                  ))}
                </div>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 5 — City */}
            {/* ============================================================ */}
            {step === 5 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Dans quelle ville ?</h1>
                  <p className="text-foreground/50 text-base">Précisez votre localisation à {formData.country}.</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 w-5 h-5" />
                  <Input
                    placeholder="Rechercher une ville..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="pl-12 h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredCities.map((city) => (
                    <Button
                      key={city}
                      variant="outline"
                      onClick={() => handleCitySelect(city)}
                      className="h-14 rounded-xl border-foreground/5 bg-card hover:bg-foreground/5 hover:border-primary/50 text-base font-bold text-foreground/80 group text-left justify-start px-6"
                    >
                      <MapPin className="w-4 h-4 text-primary/40 group-hover:text-primary mr-2" />
                      <span className="group-hover:text-primary transition-colors">{city}</span>
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => handleCitySelect(citySearch || "Autre")}
                    className="h-14 rounded-xl border-foreground/5 bg-card hover:bg-foreground/5 hover:border-primary/50 text-base font-bold text-foreground/40 group text-left justify-start px-6 italic"
                  >
                    <Plus className="w-4 h-4 text-foreground/20 group-hover:text-primary mr-2" />
                    Saisir "{citySearch || "autre ville"}"
                  </Button>
                </div>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 6 — Birth Date */}
            {/* ============================================================ */}
            {step === 6 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Vos informations</h1>
                  <p className="text-foreground/50 text-base">Ces informations resteront confidentielles.</p>
                </div>
                <div className="space-y-5">
                  <div className="bg-card border border-foreground/10 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-primary text-sm font-bold">@</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{userName}</p>
                      <p className="text-xs text-foreground/40">{userEmail}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Date de naissance</Label>
                    <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30"
                    />
                    {formData.birthDate && !ageValid && (
                      <p className="text-xs text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Vous devez avoir au moins {MIN_AGE} ans pour rejoindre Eden.</p>
                    )}
                    {formData.birthDate && ageValid && (
                      <p className="text-[11px] text-foreground/30 uppercase tracking-widest">{age} ans</p>
                    )}
                  </div>
                  <Button
                    onClick={nextStep}
                    disabled={!ageValid}
                    className="w-full h-14 bg-primary text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Continuer <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 7 — Values Selection */}
            {/* ============================================================ */}
            {step === 7 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Vos valeurs</h1>
                  <p className="text-foreground/50 text-base">Choisissez ce qui définit le mieux votre vision du foyer (max 3).</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MARRIAGE_VALUES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleValue(item.id)}
                      className={cn(
                        "h-16 px-5 rounded-xl border-2 transition-all flex items-center gap-3 text-left",
                        formData.marriageVision.includes(item.id)
                          ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5"
                          : "bg-card border-foreground/5 text-foreground/60 hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-bold text-sm">{item.label}</span>
                      {formData.marriageVision.includes(item.id) && (
                        <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={nextStep}
                  disabled={formData.marriageVision.length === 0}
                  className="w-full h-14 bg-primary text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  Continuer <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 8 — Charter Acceptance */}
            {/* ============================================================ */}
            {step === 8 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">Charte d&#39;Engagement</h1>
                  <p className="text-foreground/50 text-sm">Lisez attentivement et acceptez chaque engagement pour accéder au Sanctuaire.</p>
                </div>

                {/* Charter content — scrollable */}
                <div className="bg-card border border-foreground/10 rounded-2xl p-5 max-h-[340px] overflow-y-auto custom-scrollbar space-y-5 text-sm text-foreground/70 leading-relaxed">
                  <div className="space-y-3">
                    <h3 className="font-headline font-bold text-deep-eden text-base sticky top-0 bg-card pb-1">AXE I — Authenticité et Vérification</h3>
                    <p><strong>Art. 1.</strong> L&#39;utilisateur s&#39;engage à fournir des informations rigoureusement exactes, à jour et conformes à sa situation réelle (identité, âge, statut matrimonial, situation professionnelle, engagement ecclésial). Tout mensonge volontaire entraînera l&#39;exclusion immédiate.</p>
                    <p><strong>Art. 2.</strong> L&#39;utilisateur donne son accord formel aux administrateurs pour procéder à la vérification de l&#39;ensemble des informations fournies, y compris l&#39;exigence de pièces justificatives ou le contact des référents pastoraux.</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-headline font-bold text-deep-eden text-base sticky top-0 bg-card pb-1">AXE II — Alignement Spirituel</h3>
                    <p><strong>Art. 3.</strong> L&#39;utilisateur reconnaît la Bible comme autorité suprême. Sa démarche et ses critères de recherche doivent être alignés sur les principes des Saintes Écritures concernant la pureté, le mariage et les relations humaines.</p>
                    <p><strong>Art. 4.</strong> Toutes les interactions doivent être empreintes de dignité et de bienveillance chrétienne. Sont strictement interdits : propos grossiers, insinuations sexuelles, harcèlement, intimidation et chantage.</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-headline font-bold text-deep-eden text-base sticky top-0 bg-card pb-1">AXE III — Confidentialité</h3>
                    <p><strong>Art. 5.</strong> Toutes les informations concernant d&#39;autres membres doivent rester strictement confidentielles. Il est interdit de capturer ou divulguer des éléments de profil sans accord écrit.</p>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.charterAuthorizeVerification}
                      onChange={() => setFormData({ ...formData, charterAuthorizeVerification: !formData.charterAuthorizeVerification })}
                      className="mt-1 w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary/30 shrink-0"
                    />
                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                      J&#39;autorise expressément les administrateurs à vérifier la véracité de mes informations personnelles et ecclésiales.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.charterCommitRespectful}
                      onChange={() => setFormData({ ...formData, charterCommitRespectful: !formData.charterCommitRespectful })}
                      className="mt-1 w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary/30 shrink-0"
                    />
                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                      Je m&#39;engage à maintenir des conversations saines et respectueuses, soumises à la Parole de Dieu.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.charterAcceptFull}
                      onChange={() => setFormData({ ...formData, charterAcceptFull: !formData.charterAcceptFull })}
                      className="mt-1 w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary/30 shrink-0"
                    />
                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                      J&#39;ai lu, compris et j&#39;accepte l&#39;intégralité de la présente charte d&#39;engagement.
                    </span>
                  </label>
                </div>

                <Button
                  onClick={nextStep}
                  disabled={!formData.charterAuthorizeVerification || !formData.charterCommitRespectful || !formData.charterAcceptFull}
                  className="w-full h-14 bg-primary text-primary-foreground font-black rounded-xl text-base shadow-xl shadow-primary/15 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  Accepter et continuer <ShieldCheck className="w-5 h-5 ml-2" />
                </Button>
                <button onClick={prevStep} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            )}

            {/* ============================================================ */}
            {/* Step 9 — Completion / Summary */}
            {/* ============================================================ */}
            {step >= 9 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* Success Banner */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm uppercase tracking-wider">Profil complété avec succès</p>
                    <p className="text-xs text-foreground/40 mt-0.5">Votre chemin vers l'alliance est ouvert — {formData.city}, {formData.country}.</p>
                  </div>
                </div>

                <div className="space-y-3 text-center">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">Bienvenue dans Eden !</h1>
                  <p className="text-foreground/50 text-base">
                    Votre profil est maintenant complet. Vous allez être redirigé vers le questionnaire de personnalité pour affiner vos suggestions d'affinité.
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-card border border-foreground/10 rounded-2xl p-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Genre</span>
                    <span className="font-bold text-foreground capitalize">{formData.gender === "homme" ? "Homme" : "Femme"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Résidence</span>
                    <span className="font-bold text-foreground">{formData.city}, {formData.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Situation</span>
                    <span className="font-bold text-foreground">{formData.civilStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/40">Âge</span>
                    <span className="font-bold text-foreground">{age} ans</span>
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive/90">{saveError}</p>
                  </div>
                )}

                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg rounded-2xl gap-3 shadow-2xl shadow-primary/25 hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:hover:scale-100"
                >
                  {saving ? (
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Enregistrement…
                    </span>
                  ) : (
                    <>Continuer vers le questionnaire <Heart className="w-6 h-6 fill-primary-foreground" /></>
                  )}
                </Button>
              </div>
            )}

            {/* Login link on steps 0-8 */}
            {step <= 8 && (
              <div className="text-center pt-2">
                <p className="text-foreground/30 text-sm">
                  Besoin d'aide ?{" "}
                  <Link href="/contact" className="text-primary font-bold hover:text-primary/80 transition-colors">
                    Contactez-nous
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer for terms */}
        {step <= 8 && (
          <div className="px-6 py-4 border-t border-foreground/5">
            <p className="text-center text-foreground/15 text-[10px] font-medium uppercase tracking-widest">
              En complétant votre profil, vous acceptez notre{" "}
              <Link href="/charte" className="text-foreground/25 hover:text-primary/60 transition-colors">Charte Éthique</Link>
              {" "}et nos{" "}
              <Link href="/cgu" className="text-foreground/25 hover:text-primary/60 transition-colors">CGU</Link>.
            </p>
          </div>
        )}
      </div>

      {/* Gender Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md bg-card text-foreground border-foreground/5 rounded-[2rem] p-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-5xl">
              {pendingGender === "homme" ? "👦" : "👧"}
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-foreground">Est-ce bien cela ?</DialogTitle>
              <DialogDescription className="text-foreground/50">
                Vous avez sélectionné <span className="font-bold text-primary uppercase">{pendingGender === "homme" ? "Homme" : "Femme"}</span>.
              </DialogDescription>
            </div>
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs text-foreground/40 italic">
                Ce choix est <span className="text-foreground font-bold">définitif</span> pour garantir l'intégrité de notre communauté.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <Button onClick={confirmGender} className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors">
                Je confirme
              </Button>
              <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="w-full text-foreground/40 hover:text-primary transition-colors">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(145 22% 62% / 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(145 22% 62% / 0.4);
        }
      `}</style>
    </div>
  );
}