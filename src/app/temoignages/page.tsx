"use client";

import { useState, useRef, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart, MessageCircleCode, CheckCircle2, MapPin, Calendar, X, Check, ImageIcon, Loader2, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PageHeader, GardenIllustration } from "@/components/garden";
import { useI18n } from "@/lib/i18n";

interface Testimonial {
  id: number;
  names: string;
  type: "mariage" | "fiancailles";
  location: string;
  date: string;
  avatar: string;
  quote: string;
  story: string;
  duration: string;
}

export default function TemoignagesPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"tous" | "mariage" | "fiancailles">("tous");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    names: "",
    type: "mariage",
    location: "",
    date: "",
    quote: "",
    story: "",
    rating: "5",
  });

  // Load current user session on mount
  useEffect(() => {
    getSession().then((user) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      names: "Samuel & Grâce",
      type: "mariage",
      location: "Paris (France) / Kinshasa (RDC)",
      date: "Mariés en Juin 2025",
      avatar: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=400&h=400&fit=crop",
      quote: "La réponse à nos prières après des années d'attente.",
      story: "Engagés tous deux dans nos églises locales, la distance et le quotidien rendaient les rencontres chrétiennes compliquées. Garden of Alliance nous a permis de connecter directement sur nos valeurs spirituelles. Dès notre premier échange, nous avons parlé de notre vision du ministère et de la famille chrétienne. Un an plus tard, devant Dieu et nos familles, nous célébrions notre mariage béni.",
      duration: "Rencontrés en 8 mois"
    },
    {
      id: 2,
      names: "Jean-Pierre & Rebecca",
      type: "mariage",
      location: "Bruxelles (Belgique) / Abidjan (Côte d'Ivoire)",
      date: "Mariés en Décembre 2025",
      avatar: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=400&h=400&fit=crop",
      quote: "La distance n'est rien quand Dieu conduit les cœurs.",
      story: "Rebecca vivait à Abidjan et moi à Bruxelles. Nous étions sceptiques sur les relations à distance, mais l'intégrité de nos profils certifiés sur Garden of Alliance nous a tout de suite rassurés. Nous avons prié ensemble par appel vidéo chaque semaine avant de nous rencontrer physiquement. Le Seigneur a aplani tous les sentiers, et aujourd'hui nous bâtissons notre foyer ensemble.",
      duration: "Rencontrés en 1 an"
    },
    {
      id: 3,
      names: "Emmanuel & Sarah",
      type: "fiancailles",
      location: "Montréal (Canada) / Douala (Cameroun)",
      date: "Fiancés en Février 2026",
      avatar: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=400&h=400&fit=crop",
      quote: "Une communion spirituelle immédiate.",
      story: "Après plusieurs déceptions sur des applications classiques, j'ai prié pour un cadre sain et spirituel. Sur Garden of Alliance, j'ai vu le profil de Sarah qui affichait clairement son amour pour la parole de Dieu. Nos discussions ont été extrêmement édifiantes dès le premier jour. Nous venons de célébrer nos fiançailles officielles et préparons activement le mariage devant l'autel.",
      duration: "Rencontrés en 6 mois"
    },
    {
      id: 4,
      names: "David & Déborah",
      type: "mariage",
      location: "Lyon (France)",
      date: "Mariés en Avril 2026",
      avatar: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=400&h=400&fit=crop",
      quote: "Un cadre de confiance pour des intentions pures.",
      story: "Ce qui nous a séduit, c'est le sérieux général de la plateforme. Pas de place pour la superficialité. Nous étions là dans un but unique : le mariage honorable selon les Écritures. Nos familles se sont rencontrées très rapidement, ravies de voir notre alignement spirituel. Notre mariage a été une célébration mémorable de la grâce divine.",
      duration: "Rencontrés en 9 mois"
    },
    {
      id: 5,
      names: "Matthieu & Noémie",
      type: "fiancailles",
      location: "Londres (Royaume-Uni) / Lomé (Togo)",
      date: "Fiancés en Octobre 2025",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&h=400&fit=crop",
      quote: "Une vision commune de l'autel familial.",
      story: "En tant que chrétiens de la diaspora, trouver un conjoint qui partage la même foi et les mêmes valeurs n'est pas simple au quotidien. Garden of Alliance a réduit les distances physiques. Noémie est une femme de valeur et de prière, et notre relation s'est construite sur le socle solide de la parole de Dieu. Nous rendons grâce pour cette plateforme bénie.",
      duration: "Rencontrés en 11 mois"
    },
    {
      id: 6,
      names: "Christian & Esther",
      type: "mariage",
      location: "Dakar (Sénégal) / Paris (France)",
      date: "Mariés en Mars 2026",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&fit=crop",
      quote: "Bâtir sur le roc avec clarté dès le début.",
      story: "La sincérité des profils et la modération active nous ont permis d'aborder en confiance les sujets fondamentaux : la spiritualité, la vision du couple chrétien, et les valeurs éthiques. Christian s'est révélé être l'homme intègre et aimant que j'espérais. Grâce à la modération active et aux profils vérifiés, nous avons avancé l'esprit tranquille jusqu'au jour de notre mariage.",
      duration: "Rencontrés en 7 mois"
    }
  ];

  const filteredTestimonials = activeTab === "tous"
    ? testimonials
    : testimonials.filter(testimonial => testimonial.type === activeTab);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setSubmitError(t("testimonials.errorImage"));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError(t("testimonials.errorImageSize"));
      return;
    }

    setImageFile(file);
    setSubmitError(null);

    // Generate preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    if (!userId) {
      setSubmitError(t("testimonials.errorLogin"));
      setIsSubmitting(false);
      return;
    }

    try {
      const body = new FormData();
      body.append("user_id", userId);
      body.append("couple_names", formData.names);
      body.append("title", formData.quote);
      body.append("content", formData.story);
      body.append("rating", formData.rating);
      if (imageFile) {
        body.append("image", imageFile);
      }

      const res = await fetch("/api/testimonials", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("testimonials.errorSubmit"));
      }

      setFormSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("testimonials.errorUnknown");
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      names: "",
      type: "mariage",
      location: "",
      date: "",
      quote: "",
      story: "",
      rating: "5",
    });
    setImageFile(null);
    setImagePreview(null);
    setSubmitError(null);
    setFormSubmitted(false);
    setIsModalOpen(false);
  };

  return (
    <div className="eden-public flex flex-col min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-14 sm:py-20 eden-sky overflow-hidden">

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <GardenIllustration
              src="/image_five_garden.webp"
              placement="centerpiece"
              opacity={1}
              fringe="none"
              width={1254}
              height={1254}
              className="mx-auto w-28 sm:w-40 lg:w-52 mb-6"
            />
            <PageHeader
              eyebrow={t("testimonials.heroBadge")}
              title={t("testimonials.heroTitle")}
              subtitle={t("testimonials.heroSubtitle")}
            />
          </div>

          <div className="absolute bottom-0 left-0 right-0 eden-hairline" aria-hidden="true" />
        </section>

        {/* Testimonials Filter & Main section */}
        <section className="py-12 sm:py-16 container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-14 border-b border-sage/25 pb-8">
            {/* Tabs */}
            <div className="flex bg-muted/70 p-1.5 rounded-2xl border border-sage/25">
              <button
                onClick={() => setActiveTab("tous")}
                className={`px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${
                  activeTab === "tous"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {t("testimonials.filterAll")}
              </button>
              <button
                onClick={() => setActiveTab("mariage")}
                className={`px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${
                  activeTab === "mariage"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {t("testimonials.filterMarriage")}
              </button>
              <button
                onClick={() => setActiveTab("fiancailles")}
                className={`px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${
                  activeTab === "fiancailles"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {t("testimonials.filterEngagement")}
              </button>
            </div>

            {/* Write a testimony button */}
            <Button
              onClick={() => setIsModalOpen(true)}
              className="eden-btn-ghost font-semibold px-6 h-12 rounded-xl"
            >
              {t("testimonials.shareStory")}
            </Button>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTestimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="eden-leaf-card p-8 flex flex-col justify-between relative group overflow-hidden"
              >
                {/* Accent line */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-6">
                  {/* Rating and Type */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Heart key={i} className="w-4 h-4 text-primary fill-primary" />
                      ))}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                      testimonial.type === "mariage"
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-secondary/10 border-secondary/20 text-secondary"
                    }`}>
                      {testimonial.type === "mariage" ? t("testimonials.blessedMarriage") : t("testimonials.engagement")}
                    </span>
                  </div>

                  {/* Quote & Story */}
                  <div className="space-y-3">
                    <p className="font-headline text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      « {testimonial.quote} »
                    </p>
                    <p className="text-foreground/70 leading-relaxed text-sm italic">
                      &ldquo;{testimonial.story}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Couple metadata */}
                <div className="mt-8 pt-6 border-t border-foreground/5 flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-primary/25">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.names}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-headline font-bold text-foreground text-base">{testimonial.names}</h4>
                    <div className="flex flex-col gap-0.5 text-xs text-foreground/40">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" /> {testimonial.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary" /> {testimonial.date}
                      </span>
                      <span className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mt-0.5">
                        {testimonial.duration}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Story submission modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card border border-foreground/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 sm:p-12 relative">
              <button
                onClick={resetForm}
                className="absolute top-6 right-6 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {!formSubmitted ? (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                      <MessageCircleCode className="w-6 h-6" />
                    </div>
                    <h2 className="font-headline text-3xl font-bold text-foreground">{t("testimonials.shareTitle")}</h2>
                    <p className="text-foreground/60 text-sm">
                      {t("testimonials.shareDesc")}
                    </p>
                  </div>

                  {submitError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
                      {submitError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("testimonials.namesLabel")}</label>
                        <input
                          type="text"
                          required
                          value={formData.names}
                          onChange={(e) => setFormData({...formData, names: e.target.value})}
                          placeholder={t("testimonials.namesPlaceholder")}
                          className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("testimonials.typeUnionLabel")}</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value})}
                          className="w-full bg-muted border border-foreground/10 rounded-xl px-4 py-3 text-foreground focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="mariage">{t("testimonials.marriageCelebrated")}</option>
                          <option value="fiancailles">{t("testimonials.engagementSerious")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("testimonials.locationLabel")}</label>
                        <input
                          type="text"
                          required
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          placeholder={t("testimonials.locationExample")}
                          className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("testimonials.dateUnionLabel")}</label>
                        <input
                          type="text"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          placeholder={t("testimonials.dateExample")}
                          className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("testimonials.titleOrKeyPhrase")}</label>
                      <input
                        type="text"
                        required
                        value={formData.quote}
                        onChange={(e) => setFormData({...formData, quote: e.target.value})}
                        placeholder={t("testimonials.quoteExample")}
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("testimonials.storyLabel")}</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.story}
                        onChange={(e) => setFormData({...formData, story: e.target.value})}
                        placeholder={t("testimonials.storyPlaceholderDetail")}
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder-white/20 focus:border-primary focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    {/* Image Upload with Preview */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("testimonials.photoLabel")}</label>

                      {imagePreview ? (
                        <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-foreground/5">
                          {/* Full image preview */}
                          <div className="relative w-full aspect-[4/3]">
                            <img
                              src={imagePreview}
                              alt="Aperçu de la photo du couple"
                              className="w-full h-full object-contain bg-black/5"
                            />
                          </div>
                          <div className="p-3 flex items-center justify-between bg-foreground/5">
                            <p className="text-xs text-foreground/50 truncate">
                              {imageFile?.name}
                            </p>
                            <button
                              type="button"
                              onClick={removeImage}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-foreground/10 hover:border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-foreground/[0.02] hover:bg-foreground/[0.04]"
                        >
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground/60">
                              {t("testimonials.clickToAddPhoto")}
                            </p>
                            <p className="text-xs text-foreground/40 mt-1">
                              {t("testimonials.photoFormat")}
                            </p>
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground font-black h-14 rounded-xl text-base shadow-xl shadow-primary/10 hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t("testimonials.submittingBtn")}
                        </span>
                      ) : (
                        t("testimonials.submitStory")
                      )}
                    </Button>

                    <p className="text-center text-xs text-foreground/40">
                      {t("testimonials.reviewNote")}
                    </p>
                  </form>
                </div>
              ) : (
                <div className="text-center py-8 space-y-6">
                  <div className="w-16 h-16 bg-primary/20 border border-primary/30 text-primary rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="font-headline text-3xl font-bold text-foreground">{t("testimonials.successTitle")}</h2>
                    <p className="text-foreground/60 max-w-md mx-auto text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: t("testimonials.successDesc") }}
                    />
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9E45]/10 border border-[#FF9E45]/20 rounded-xl text-[#FF9E45] text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {t("testimonials.pendingApproval")}
                  </div>
                  <div className="pt-4 max-w-sm mx-auto text-xs text-primary/70 italic bg-primary/5 p-4 rounded-xl border border-primary/10">
                    « {t("testimonials.successQuote")} » <br />
                    <span className="font-bold font-headline block mt-1">{t("testimonials.successReference")}</span>
                  </div>
                  <Button
                    onClick={resetForm}
                    className="bg-primary text-primary-foreground font-bold px-8 h-12 rounded-xl mt-6"
                  >
                    {t("testimonials.closeBtn")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <section className="relative py-16 bg-accent/5 border-t border-foreground/5 overflow-hidden">
          <GardenIllustration
            src="/image_six_garden.webp"
            placement="side-accent"
            corner="br"
            opacity={0.6}
            fringe="light"
            width={1254}
            height={1254}
            className="hidden sm:block absolute bottom-0 right-[4%] w-48 lg:w-64 z-0"
          />
          <div className="container mx-auto px-4 text-center space-y-12 relative z-10">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary fill-primary" />
              </div>
              <h2 className="font-headline text-4xl font-bold text-foreground">{t("testimonials.ctaTitle")}</h2>
              <p className="text-lg text-foreground/60">
                {t("testimonials.ctaDesc")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button size="lg" className="bg-primary text-primary-foreground font-black px-10 h-16 text-lg rounded-xl shadow-2xl shadow-primary/20 hover:scale-105 transition-transform" asChild>
                  <Link href="/login">{t("testimonials.ctaBtn")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 h-16 text-lg rounded-xl" asChild>
                  <Link href="/concept">{t("testimonials.ctaBtnSecondary")}</Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-foreground/40 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t("testimonials.badgeSecure")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{t("testimonials.badgeVerified")}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
