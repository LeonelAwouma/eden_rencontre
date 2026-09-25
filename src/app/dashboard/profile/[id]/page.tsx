"use client";

import { use, useState, useEffect } from "react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  MapPin,
  Heart,
  MessageCircle,
  Lightbulb,
  UserPlus,
  Briefcase,
  Copy,
  Check,
  Loader2,
  Church,
  Star,
  ZoomIn,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { canOptimizeImage } from "@/lib/avatar";
import { generateMessageIdeas } from "@/ai/flows/generate-message-ideas-flow";
import { useToast } from "@/hooks/use-toast";
import { getProfileById, startConversation, type MemberProfile } from "@/lib/chat";
import { sendFriendRequest, getRelationStatus, recordProfileView, isFavorited, setFavorite, type RelationStatus } from "@/lib/social";
import { getValue } from "@/lib/values";
import { ageFromBirthDate } from "@/lib/auth";
import { PROFILES } from "@/lib/profiles";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { isProfileFullyComplete } from "@/lib/profile-completion";
import { useI18n } from "@/lib/i18n";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useI18n();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showIdeasDialog, setShowIdeasDialog] = useState(false);
  const [messageSuggestions, setMessageSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [friendSent, setFriendSent] = useState(false);
  const [sendingFriend, setSendingFriend] = useState(false);
  const [relation, setRelation] = useState<RelationStatus>("none");
  const [favorite, setFavoriteState] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    // Real member (Supabase uuid id)
    if (UUID_RE.test(id)) {
      getProfileById(id).then(({ profile, error }) => {
        if (!active) return;
        if (error) setLoadError(error);
        setMember(profile ?? null);
        setLoading(false);
      });
      getRelationStatus(id).then((s) => { if (active) setRelation(s); });
      isFavorited(id).then((f) => { if (active) setFavoriteState(f); });
      recordProfileView(id); // records the visit (feeds the Visitors tab)
      return () => { active = false; };
    }

    // Demo profile (numeric id) — fallback to mock contacts
    const mock = PROFILES.find((p) => String(p.id) === id);
    setMember(
      mock
        ? {
            id: String(mock.id),
            name: mock.name,
            email: "",
            city: mock.location,
            country: mock.country,
            region: null,
            gender: mock.gender,
            civilStatus: "Single",
            profession: mock.profession,
            bio: mock.bio,
            marriageVision: null,
            avatar_url: mock.image,
          }
        : null
    );
    setLoading(false);
    return () => { active = false; };
  }, [id]);

  const pronoun = member?.gender === "femme" ? t("profileDetail.pronounShe") : member?.gender === "homme" ? t("profileDetail.pronounHe") : t("profileDetail.pronounThey");
  const genderLabel = member?.gender === "homme" ? t("profilePage.genderMale") : member?.gender === "femme" ? t("profilePage.genderFemale") : null;
  const location = member ? [member.city, member.country].filter(Boolean).join(", ") : "";
  const initial = member?.name?.charAt(0)?.toUpperCase() || "?";
  const memberAge = ageFromBirthDate(member?.birthDate);
  const effStatus: RelationStatus = friendSent ? "pending_out" : relation;
  const areFriends = effStatus === "friends";

  async function handleGenerateIdeas() {
    if (!member) return;
    setIsGenerating(true);
    try {
      const result = await generateMessageIdeas({
        profileName: member.name,
        visionMarriage: member.bio || "Building a Christian home founded on faith.",
        search: member.bio || "A sincere person who shares the same values.",
      });
      setMessageSuggestions(result.suggestions);
      setShowIdeasDialog(true);
    } catch (error) {
      toast({
        title: t("dashboard.toastError"),
        description: t("profileDetail.errorGeneratingIdeas"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleToggleFavorite() {
    if (!member) return;
    if (!UUID_RE.test(member.id)) {
      toast({ title: t("profileDetail.demoProfileTitle"), description: t("profileDetail.demoProfileFavDesc") });
      return;
    }
    const next = !favorite;
    setFavoriteState(next);
    const res = await setFavorite(member.id, next);
    if (!res.ok) {
      setFavoriteState(!next);
      toast({ title: t("dashboard.toastFailed"), description: res.error || t("dashboard.toastPleaseRetry"), variant: "destructive" });
    }
  }

  async function handleSendMessage() {
    if (!member) return;
    if (relation !== "friends") {
      toast({ title: t("dashboard.toastFriendsOnlyTitle"), description: t("profileDetail.toastFriendsOnlyDesc", { name: member.name }) });
      return;
    }
    setStartingChat(true);
    const convId = await startConversation(member.id);
    setStartingChat(false);
    router.push(convId ? `/dashboard?tab=Messages&conv=${convId}` : "/dashboard?tab=Messages");
  }

  async function handleAddFriend() {
    if (!member) return;
    // Demo profile (non-uuid id): no real request possible
    if (!UUID_RE.test(member.id)) {
      toast({ title: t("profileDetail.demoProfileTitle"), description: t("profileDetail.demoProfileFriendDesc") });
      return;
    }
    setSendingFriend(true);
    const res = await sendFriendRequest(member.id);
    setSendingFriend(false);
    if (!res.ok) {
      toast({ title: t("dashboard.toastFailed"), description: res.error || t("dashboard.toastPleaseRetry"), variant: "destructive" });
      return;
    }
    setFriendSent(true);
    toast({ title: t("dashboard.toastInvitationSent"), description: t("profileDetail.toastInvitationSentDesc", { name: member.name, pronoun }) });
  }

  function copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({ title: t("profileDetail.toastCopied"), description: t("profileDetail.toastCopiedDesc") });
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  // ── Loading / not found states ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-foreground/50 text-sm">{t("profileDetail.loadingProfile")}</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center"><UserPlus className="w-8 h-8 text-foreground/30" /></div>
        <div className="space-y-1">
          <h1 className="font-headline text-2xl font-bold text-foreground">{t("profileDetail.profileNotFoundTitle")}</h1>
          <p className="text-foreground/50 text-sm max-w-sm">
            {loadError ? `${t("profileDetail.errorPrefix")} ${loadError}` : t("profileDetail.profileNotFoundDesc")}
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 rounded-xl gap-2">
          <Link href="/dashboard"><ArrowLeft className="w-4 h-4" /> {t("profilePage.backToDashboard")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8 pb-24">
        {/* Back Button */}
        <Button variant="ghost" asChild className="text-foreground/40 hover:text-primary hover:bg-transparent group pl-0">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t("profileDetail.backToProfiles")}
          </Link>
        </Button>

        {/* Profile Header Image / Avatar */}
        <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border border-secondary/15">
          {member.avatar_url ? (
            <>
              <button
                onClick={() => setShowImagePreview(true)}
                className="group/preview absolute inset-0 w-full h-full cursor-zoom-in"
                aria-label={t("profileDetail.previewPhoto")}
              >
                <Image src={member.avatar_url} alt={member.name} fill className="object-cover" priority unoptimized={!canOptimizeImage(member.avatar_url)} sizes="(min-width: 1024px) 40vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity">
                    <ZoomIn className="w-6 h-6 text-white" />
                  </div>
                </div>
              </button>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/15 to-card flex items-center justify-center">
              <span className="font-headline text-7xl font-bold text-secondary/70">{initial}</span>
            </div>
          )}
        </div>

        {/* Main Info Card */}
        <Card className="bg-card border border-secondary/15 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <h1 className="text-4xl font-black text-foreground font-headline inline-flex items-center gap-2">
                  {member.name}
                  {member.verification_status === "verified" && isProfileFullyComplete(member) && <VerifiedBadge size={28} />}
                </h1>

                <div className="space-y-1 text-muted-foreground font-medium">
                  {location && (
                    <p className="flex items-center gap-1.5 text-lg">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span>{location}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {memberAge && (
                    <Badge className="bg-primary/15 text-primary border-none rounded-xl px-4 py-2 font-bold text-sm">{t("profileDetail.yearsOld", { age: memberAge })}</Badge>
                  )}
                  {member.civilStatus && (
                    <Badge className="bg-primary/15 text-primary border-none rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      {member.civilStatus}
                    </Badge>
                  )}
                  {genderLabel && (
                    <Badge className="bg-secondary/10 text-secondary border border-secondary/25 rounded-xl px-4 py-2 font-bold text-sm">
                      {genderLabel}
                    </Badge>
                  )}
                  {member.profession && (
                    <Badge className="bg-foreground/5 text-foreground/80 border-foreground/10 rounded-xl px-4 py-2 flex items-center gap-2 font-medium text-sm">
                      <Briefcase className="w-4 h-4 text-foreground/40" />
                      {member.profession}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={handleToggleFavorite}
                aria-label={favorite ? t("memberCard.removeFavorite") : t("memberCard.addFavorite")}
                className={cn(
                  "shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                  favorite ? "bg-primary text-primary-foreground border-primary" : "bg-foreground/5 text-foreground/40 border-foreground/10 hover:text-primary hover:border-primary/40"
                )}
              >
                <Star className={cn("w-6 h-6", favorite && "fill-primary-foreground")} />
              </button>
            </div>

            {/* Action Banner — depends on relationship */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                {areFriends ? <Check className="w-5 h-5 text-primary-foreground" /> : <UserPlus className="w-5 h-5 text-primary-foreground" />}
              </div>
              <p className="text-primary text-sm font-bold leading-relaxed">
                {areFriends
                  ? <>{t("profileDetail.friendsWithBanner", { name: member.name })} <span className="font-medium text-primary/70">{t("profileDetail.canExchangeMessages")}</span></>
                  : effStatus === "pending_out"
                  ? <>{t("profileDetail.requestSentBanner", { name: member.name })} <span className="font-medium text-primary/70">{t("profileDetail.messagingOpensOnceAccepts", { pronoun })}</span></>
                  : effStatus === "pending_in"
                  ? <>{t("profileDetail.pendingInBanner", { name: member.name })} <span className="font-medium text-primary/70">{t("profileDetail.acceptToChat")}</span></>
                  : <>{t("profileDetail.addFreeBanner", { name: member.name })} <span className="font-medium text-primary/70">{t("profileDetail.ifAcceptsCanExchange", { pronoun })}</span></>}
              </p>
            </div>

            {/* Primary Action Buttons — relation-aware */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {areFriends ? (
                <Button disabled className="bg-secondary/10 text-secondary border border-secondary/25 font-bold h-16 rounded-2xl gap-3 text-lg disabled:opacity-100">
                  <Check className="w-6 h-6" /> {t("profileDetail.friends")}
                </Button>
              ) : effStatus === "pending_out" ? (
                <Button disabled className="bg-primary/80 text-primary-foreground font-bold h-16 rounded-2xl gap-3 text-lg disabled:opacity-70">
                  <Check className="w-6 h-6" /> {t("profileDetail.requestSent")}
                </Button>
              ) : effStatus === "pending_in" ? (
                <Button
                  onClick={() => router.push("/dashboard?tab=Requests")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-16 rounded-2xl gap-3 shadow-xl shadow-primary/15 text-lg"
                >
                  <Star className="w-6 h-6" /> {t("profileDetail.respondToRequest")}
                </Button>
              ) : (
                <Button
                  onClick={handleAddFriend}
                  disabled={sendingFriend}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-16 rounded-2xl gap-3 shadow-xl shadow-primary/15 text-lg disabled:opacity-70"
                >
                  {sendingFriend ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6" />}
                  {t("profileDetail.addAsFriend")}
                </Button>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={startingChat}
                variant="outline"
                className={cn(
                  "font-bold h-16 rounded-2xl gap-3 text-lg disabled:opacity-70",
                  areFriends
                    ? "border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:text-secondary"
                    : "border-foreground/10 bg-transparent text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                )}
              >
                {startingChat ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />} {t("profileDetail.sendAMessage")}
              </Button>
            </div>

            {/* AI Assistant Button */}
            <Button
              variant="ghost"
              onClick={handleGenerateIdeas}
              disabled={isGenerating}
              className="w-full bg-foreground/5 text-foreground/80 hover:bg-foreground/10 hover:text-foreground h-14 rounded-2xl gap-2 text-xs font-bold uppercase tracking-widest"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4 text-primary" />}
              {t("profileDetail.messageIdeas")}
            </Button>
          </CardContent>
        </Card>

        {/* Valeurs & croyances */}
        <Card className="bg-card border border-secondary/15 rounded-[2.5rem] shadow-xl">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/10 border border-secondary/25 rounded-2xl flex items-center justify-center">
                <Church className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle className="text-secondary font-bold text-xl">{t("profileDetail.valuesBeliefs")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-6">
            {member.marriageVision && member.marriageVision.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {member.marriageVision.map((vid) => {
                  const v = getValue(vid);
                  return (
                    <span key={vid} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-secondary/10 border border-secondary/25 text-secondary text-sm font-bold">
                      <span>{v.icon}</span> {v.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground italic">{t("profileDetail.noValuesSpecified")}</p>
            )}
          </CardContent>
        </Card>

        {/* Vision du foyer (bio) */}
        {member.bio && (
          <Card className="bg-card border border-secondary/15 rounded-[2.5rem] shadow-xl">
            <CardHeader className="p-8 pb-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary fill-primary" />
                </div>
                <CardTitle className="text-primary font-bold text-xl">{t("profileDetail.visionForHome")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <p className="text-muted-foreground leading-relaxed text-lg italic">&ldquo;{member.bio}&rdquo;</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog for full-size photo preview */}
      {member.avatar_url && (
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className="max-w-3xl bg-transparent border-none shadow-none p-0 [&>button]:hidden">
            <DialogTitle className="sr-only">{member.name}</DialogTitle>
            <DialogDescription className="sr-only">{t("profileDetail.previewPhoto")}</DialogDescription>
            <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl">
              <Image src={member.avatar_url} alt={member.name} fill className="object-contain bg-card" unoptimized={!canOptimizeImage(member.avatar_url)} sizes="(min-width: 1024px) 40vw, 100vw" />
            </div>
            <div>
              <button
                onClick={() => setShowImagePreview(false)}
                aria-label={t("dashboard.close")}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-card border border-secondary/15 shadow-xl flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog for AI Message Ideas */}
      <Dialog open={showIdeasDialog} onOpenChange={setShowIdeasDialog}>
        <DialogContent className="max-w-md bg-card text-foreground border border-secondary/15 rounded-[2.5rem] p-8">
          <DialogHeader className="space-y-4">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">{t("profileDetail.edenSuggestions")}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center">
              {t("profileDetail.suggestionsDesc", { name: member.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            {messageSuggestions.map((suggestion, index) => (
              <Card key={index} className="bg-foreground/5 border-foreground/10 hover:border-primary/30 transition-all rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-foreground/80 leading-relaxed italic">&ldquo;{suggestion}&rdquo;</p>
                  <Button
                    variant="ghost"
                    onClick={() => copyToClipboard(suggestion, index)}
                    className="w-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-bold gap-2 h-10 rounded-xl text-xs uppercase tracking-widest"
                  >
                    {copiedIndex === index ? (
                      <><Check className="w-4 h-4" /> {t("profileDetail.copied")}</>
                    ) : (
                      <><Copy className="w-4 h-4" /> {t("profileDetail.copyMessage")}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={() => setShowIdeasDialog(false)}
            className="w-full mt-6 text-foreground/40 hover:text-primary hover:bg-transparent"
          >
            {t("dashboard.close")}
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
