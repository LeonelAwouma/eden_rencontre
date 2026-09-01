"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Home, Search, Users, Heart, MessageCircle, Crown, Zap, Star,
  MapPin, Briefcase, X, ChevronRight, Eye, BookOpen, ArrowUpRight,
  Quote, ScrollText, Menu, Check, Clock, Bell, Lock, Settings,
  Pencil, Filter, ShieldCheck, CheckCircle2, LogOut, Camera,
  HeartHandshake, Hash, Share2, Video, CalendarDays, Church,
  Bookmark, ThumbsUp, Send, ArrowLeft, Smile, ImagePlus, Loader2,
  Trash2, UserPlus, ChurchIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getSession, logout, updateProfile, ageFromBirthDate, type EdenUser } from "@/lib/auth";
import { Textarea } from "@/components/ui/textarea";
import { PROFILES } from "@/lib/profiles";
import { MARRIAGE_VALUES, getValue } from "@/lib/values";
import { computeDisplayMatch, filterAndRankByReciprocalMatch } from "@/lib/matching/adapter";
import { getMyOnboarding, getQuestionnaires, saveOnboarding, type Questionnaire, type Field } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import {
  upsertMyProfile, searchUsers, listConversations, getMessages,
  sendChatMessage, uploadChatImage, uploadAvatar, markConversationRead,
  startConversation, CHAT_EMOJIS, type ChatConversation, type ChatMessage,
  type DirectoryUser, type MemberProfile,
} from "@/lib/chat";
import {
  listMembers, listMyFriendships, listIncomingRequests, sendFriendRequest,
  respondToRequest, buildRelationMap, listFavorites, setFavorite,
  listVisitors, type RelationStatus, type FriendRequest, type Visitor,
} from "@/lib/social";
import { motion, AnimatePresence } from "framer-motion";
import { Monogram, Flourish, VitrailPattern } from "@/components/ornaments";
import { ImposingFloralCorners, ImposingFloralSide } from "@/components/garden";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ChatGuide } from "@/components/dashboard/chat-guide";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { isProfileFullyComplete } from "@/lib/profile-completion";
import { Tab, TABS, ComposerType, FeedPost, EDIT_WINDOW_MS, DAILY_VERSES, VERSE_OF_DAY, getDailyVerses } from "@/components/dashboard/dashboard-types";
import { useI18n } from "@/lib/i18n";

const TAB_LABEL_KEY: Record<string, string> = {
  Home: "dashboardTabs.home", Accueil: "dashboardTabs.home",
  Discover: "dashboardTabs.discover", Découvrir: "dashboardTabs.discover",
  Visitors: "dashboardTabs.visitors", Visiteurs: "dashboardTabs.visitors",
  Favorites: "dashboardTabs.favorites", Favoris: "dashboardTabs.favorites",
  Requests: "dashboardTabs.requests", Demandes: "dashboardTabs.requests",
  Premium: "dashboardTabs.premium",
  Messages: "dashboardTabs.messages",
  Notifications: "dashboardTabs.notifications",
  Profile: "dashboardTabs.profile", Profil: "dashboardTabs.profile",
};

// ── Helper ──
function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

// ── Emoji picker: group the flat list by category once, in source order ──
const EMOJI_CATEGORIES: { category: string; emojis: typeof CHAT_EMOJIS }[] = CHAT_EMOJIS.reduce(
  (groups: { category: string; emojis: typeof CHAT_EMOJIS }[], emoji) => {
    const group = groups.find((g) => g.category === emoji.category);
    if (group) group.emojis.push(emoji);
    else groups.push({ category: emoji.category, emojis: [emoji] });
    return groups;
  },
  []
);

// ── Fluent Emoji ──
function FluentEmoji({ char, url, className }: { char: string; url: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <span className={cn("inline-flex items-center justify-center text-lg leading-none", className)}>{char}</span>;
  return <img src={url} alt={char} loading="lazy" draggable={false} className={className} onError={() => setErr(true)} />;
}

// ── Post Actions ──
function PostActions({ likes, comments, onLike, onComment, onPray, onShare }: {
  likes: number; comments: number; onLike?: () => void; onComment?: () => void; onPray?: () => void; onShare?: () => void;
}) {
  const { t } = useI18n();
  const btn = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.02]";
  return (
    <div className="flex items-center gap-1 px-1 py-2" style={{ borderTop: "1px solid #F0EDE8" }}>
      <button onClick={onLike} className={cn(btn)} style={{ color: "#777777" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#EEF5EC"; e.currentTarget.style.color = "#486B46"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#777777"; }}>
        <Heart className="w-4 h-4" /> {likes}
      </button>
      <button onClick={onComment} className={cn(btn)} style={{ color: "#777777" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#EEF5EC"; e.currentTarget.style.color = "#486B46"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#777777"; }}>
        <MessageCircle className="w-4 h-4" /> {comments}
      </button>
      <button onClick={onPray} className={cn(btn)} style={{ color: "#777777" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#EEF5EC"; e.currentTarget.style.color = "#486B46"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#777777"; }}>
        🙏 {t("dashboard.pray")}
      </button>
      <button onClick={onShare} className={cn(btn)} style={{ color: "#777777" }}
        onMouseEnter={e => { e.currentTarget.style.background = "#EEF5EC"; e.currentTarget.style.color = "#486B46"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#777777"; }}>
        <Share2 className="w-4 h-4" /> {t("dashboard.share")}
      </button>
    </div>
  );
}

// ── Tab Header ──
function TabHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: "#486B46" }} />
        </div>
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <h2 className="font-headline text-2xl sm:text-4xl font-bold text-foreground truncate">{title}</h2>
          <p className="text-sm sm:text-base" style={{ color: "#777777" }}>{subtitle}</p>
        </div>
      </div>
      <span style={{ color: "#C6D4C0" }}><Flourish className="w-40 h-3" /></span>
    </div>
  );
}

// ── Empty State ──
function EmptyState({ icon: Icon, title, text, cta, onClick }: { icon: any; title: string; text: string; cta: string; onClick?: () => void }) {
  return (
    <div className="rounded-[2rem] py-16 px-8 text-center"
      style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
      <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
        <Icon className="w-9 h-9" style={{ color: "#486B46" }} />
      </div>
      <h3 className="font-headline text-2xl font-bold text-foreground mb-2">{title}</h3>
      <p className="max-w-md mx-auto mb-5 leading-relaxed" style={{ color: "#777777" }}>{text}</p>
      <span style={{ color: "#C6D4C0" }}><Flourish className="w-32 h-3 mx-auto mb-6" /></span>
      <Button onClick={onClick} className="font-bold h-14 px-8 rounded-xl gap-2"
        style={{ background: "#486B46", color: "#FFFFFF" }}>
        {cta} <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}

// ── Member Card ──
function MemberCard({ m, isFavorite, onToggleFav, onOpen, action, match }: {
  m: MemberProfile; isFavorite: boolean; onToggleFav: () => void; onOpen: () => void;
  action?: React.ReactNode; match?: number | null;
}) {
  const { t } = useI18n();
  const loc = [m.city, m.country].filter(Boolean).join(", ");
  return (
    <div className="group overflow-hidden rounded-2xl flex flex-col transition-all duration-200 cursor-pointer"
      style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(72,107,70,0.12)"; e.currentTarget.style.borderColor = "#C6D4C0"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)"; e.currentTarget.style.borderColor = "#E8E5E0"; }}>
      <div className="relative aspect-[4/5]">
        <button onClick={onOpen} className="absolute inset-0 w-full h-full text-left">
          {m.avatar_url ? (
            <Image src={m.avatar_url} alt={m.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-headline text-5xl font-bold"
              style={{ background: "linear-gradient(135deg, #EEF5EC, #FAF9F6)", color: "#6E8B63" }}>
              {m.name?.[0]?.toUpperCase() || "?"}
            </span>
          )}
          {typeof match === "number" && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1"
              style={{ background: "#486B46", color: "#FFFFFF" }}>
              <Heart className="w-3 h-3" style={{ fill: "#FFFFFF" }} /> {match}%
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <h4 className="font-headline text-sm sm:text-lg font-bold text-white truncate group-hover:transition-colors inline-flex items-center gap-1">
              {m.name}
              {m.verification_status === "verified" && isProfileFullyComplete(m) && <VerifiedBadge size={14} />}
            </h4>
            {loc && <div className="flex items-center gap-1 text-white/80 text-[9px] sm:text-xs font-bold tracking-wide uppercase truncate">
              <MapPin className="w-3 h-3 shrink-0" /> {loc}
            </div>}
          </div>
        </button>
        <button onClick={onToggleFav} aria-label={isFavorite ? t("memberCard.removeFavorite") : t("memberCard.addFavorite")}
          className={cn("absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl transition-all",
            isFavorite ? "text-white" : "bg-black/30 text-white hover:text-white")}
          style={isFavorite ? { background: "#C6A15B" } : {}}>
          <Star className={cn("w-4 h-4", isFavorite && "fill-white")} />
        </button>
      </div>
      <div className="p-3 sm:p-4 flex flex-col gap-3" style={{ background: "#FAF9F6", borderTop: "1px solid #E8E5E0" }}>
        {m.profession && (
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "#777777" }}>
            <Briefcase className="w-3.5 h-3.5 shrink-0" style={{ color: "#6E8B63" }} />
            <span className="truncate">{m.profession}</span>
          </div>
        )}
        {action}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { t, locale } = useI18n();
  const tabLabel = (tab: Tab) => t(TAB_LABEL_KEY[tab] || tab);
  const [activeTab, setActiveTab] = useState<Tab>("Accueil");
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);
  const [dailyQuote, setDailyQuote] = useState<{ text: string; ref: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [discoverFilter, setDiscoverFilter] = useState("all");
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [discoverCount, setDiscoverCount] = useState(24);
  const [user, setUser] = useState<EdenUser | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<DirectoryUser[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", city: "", country: "", civilStatus: "", profession: "", bio: "", marriageVision: [] as string[] });
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, any>>({});
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<string | null>(null);
  const [localQAnswers, setLocalQAnswers] = useState<Record<string, any>>({});
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);
  const [expandedQuestionnaire, setExpandedQuestionnaire] = useState<string | null>(null);
  const chatChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const lastTypingRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  // Feed
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<ComposerType>("Publication");
  const [composerText, setComposerText] = useState("");
  const [composerImage, setComposerImage] = useState<string | null>(null);
  const [composerImageFile, setComposerImageFile] = useState<File | null>(null);
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);
  const composerImageRef = useRef<HTMLInputElement | null>(null);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [editPostImage, setEditPostImage] = useState<string | null>(null);
  const [pendingConv, setPendingConv] = useState<string | null>(null);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState<number | null>(null);

  // Social
  const [discoverMembers, setDiscoverMembers] = useState<MemberProfile[]>([]);
  const [relations, setRelations] = useState<Record<string, { status: RelationStatus; requestId: string }>>({});
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteMembers, setFavoriteMembers] = useState<MemberProfile[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [profileCompletionPct, setProfileCompletionPct] = useState<number | null>(null);

  const meId = user?.id || "";
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);
  const visitsThisWeek = visitors.filter((v) => Date.now() - new Date(v.viewedAt).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const messageNotifs = conversations.filter((c) => c.unread > 0);
  const displayName = user?.name || "Membre";

  // Meeting notifications
  const [meetingNotifs, setMeetingNotifs] = useState<{ id: string; meeting_id: string; notification_type: string; title: string; message: string; is_read: boolean; created_at: string }[]>([]);

  // Blog notifications
  const [blogNotifs, setBlogNotifs] = useState<{ id: string; blog_post_id: string | null; title: string; message: string; thumbnail_url: string | null; link: string | null; is_read: boolean; created_at: string }[]>([]);

  // Verification notifications
  const [verificationNotifs, setVerificationNotifs] = useState<{ id: string; notification_type: string; title: string; message: string; is_read: boolean; created_at: string }[]>([]);

  // Verification status
  const [verificationStatus, setVerificationStatus] = useState<string>("none");
  const [verificationRejectionReason, setVerificationRejectionReason] = useState<string | null>(null);

  // Upcoming events
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; event_date: string; location: string | null; meeting_link: string | null; cover_image_url: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/events?limit=3")
      .then((r) => r.json())
      .then((d) => { if (d.events) setUpcomingEvents(d.events); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== "Notifications" || !user?.id) return;
    fetch(`/api/meetings/notifications?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.notifications) setMeetingNotifs(d.notifications); })
      .catch(() => {});
    fetch(`/api/blog/notifications?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.notifications) setBlogNotifs(d.notifications); })
      .catch(() => {});
    fetch(`/api/meetings/notifications?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) {
          const vNotifs = d.notifications.filter((n: any) =>
            n.notification_type === "verification_approved" || n.notification_type === "verification_rejected" || n.notification_type === "verification_pending"
          );
          setVerificationNotifs(vNotifs);
        }
      })
      .catch(() => {});
  }, [activeTab, user?.id]);

  // Fetch verification status on mount
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/user/verification-status?user_id=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.verification_status) setVerificationStatus(d.verification_status);
        if (d.verification_rejection_reason) setVerificationRejectionReason(d.verification_rejection_reason);
      })
      .catch(() => {});
  }, [user?.id]);

  const unreadMeetingNotifs = meetingNotifs.filter((n) => !n.is_read && n.notification_type !== "verification_approved" && n.notification_type !== "verification_rejected" && n.notification_type !== "verification_pending");
  const unreadBlogNotifs = blogNotifs.filter((n) => !n.is_read);
  const unreadVerificationNotifs = verificationNotifs.filter((n) => !n.is_read);
  const notifCount = unreadMeetingNotifs.length + unreadBlogNotifs.length + unreadVerificationNotifs.length;

  const markMeetingNotifsRead = async () => {
    if (!user?.id || unreadMeetingNotifs.length === 0) return;
    setMeetingNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    fetch("/api/meetings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all: true, user_id: user.id }),
    }).catch(() => {});
  };
  const markBlogNotifsRead = async () => {
    if (!user?.id || unreadBlogNotifs.length === 0) return;
    setBlogNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    fetch("/api/blog/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all: true, user_id: user.id }),
    }).catch(() => {});
  };
  const markVerificationNotifsRead = async () => {
    if (!user?.id || unreadVerificationNotifs.length === 0) return;
    setVerificationNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    fetch("/api/meetings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_ids: verificationNotifs.map((n) => n.id) }),
    }).catch(() => {});
  };
  const displayInitial = displayName.charAt(0).toUpperCase();
  const myAvatar = user?.avatar_url || undefined;
  const displayLocation = user ? [user.city, user.country].filter(Boolean).join(", ") || "Eden" : "Eden";

  // ── Data loading ──
  const loadConversations = async () => {
    if (!meId) return;
    setConversations(await listConversations(meId));
  };

  const openConversation = async (convId: string) => {
    setActiveConvId(convId);
    setPartnerTyping(false);
    setChatInput("");
    clearPendingImage();
    setMessages(await getMessages(convId, meId));
    await markConversationRead(convId, meId);
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c)));
  };

  const handleStartConversation = async (other: DirectoryUser) => {
    const convId = await startConversation(other.id);
    if (!convId) {
      toast({ title: t("dashboard.toastFriendsOnlyTitle"), description: t("dashboard.toastFriendsOnlyDesc", { name: other.name }), variant: "destructive" });
      return;
    }
    setShowNewChat(false); setUserQuery(""); setUserResults([]);
    await loadConversations();
    await openConversation(convId);
  };

  const handleChatInput = (v: string) => {
    setChatInput(v);
    const now = Date.now();
    if (chatChannelRef.current && now - lastTypingRef.current > 1500) {
      lastTypingRef.current = now;
      chatChannelRef.current.send({ type: "broadcast", event: "typing", payload: { from: meId } });
    }
  };

  const insertEmoji = (char: string) => handleChatInput(chatInput + char);

  useEffect(() => {
    if (!showEmoji) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji]);

  const clearPendingImage = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(null);
    setPendingPreview(null);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if ((!text && !pendingImage) || !activeConvId || uploading) return;
    setShowEmoji(false);
    if (pendingImage) {
      setUploading(true);
      const res = await uploadChatImage(pendingImage, activeConvId);
      setUploading(false);
      if (res.error || !res.url) {
        toast({ title: t("dashboard.toastUploadFailed"), description: res.error || t("dashboard.toastPleaseRetry"), variant: "destructive" });
        return;
      }
    const sentImg = await sendChatMessage(activeConvId, text, res.url, meId, activeConv?.otherId);
      if (sentImg.error) { notifySendError(sentImg.error); return; }
      if (sentImg.message) appendMessage(sentImg.message);
      clearPendingImage(); setChatInput(""); loadConversations();
      return;
    }
    setChatInput("");
    const sent = await sendChatMessage(activeConvId, text, null, meId, activeConv?.otherId);
    if (sent.error) { setChatInput(text); notifySendError(sent.error); return; }
    if (sent.message) appendMessage(sent.message);
    loadConversations();
  };

  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
  };

  const notifySendError = (error: string) => {
    if (/row-level|policy|not_friends|permission/i.test(error)) {
      const name = activeConv?.name || t("dashboard.thisMember");
      toast({ title: t("dashboard.toastBecomeFriendsTitle"), description: t("dashboard.toastBecomeFriendsDesc", { name }) });
      return;
    }
    toast({ title: t("dashboard.toastMessageNotSent"), description: error, variant: "destructive" });
  };

  const handlePickImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: t("dashboard.toastUnsupportedFormat"), variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: t("dashboard.toastImageTooLarge"), variant: "destructive" }); return; }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const startEditProfile = () => {
    setProfileForm({ name: user?.name || "", city: user?.city || "", country: user?.country || "", civilStatus: user?.civilStatus || "", profession: user?.profession || "", bio: user?.bio || "", marriageVision: user?.marriageVision || [] });
    setEditingProfile(true);
  };

  const toggleProfileValue = (id: string) => {
    setProfileForm((prev) => {
      const current = prev.marriageVision;
      if (current.includes(id)) return { ...prev, marriageVision: current.filter((v) => v !== id) };
      if (current.length >= 3) { toast({ title: t("dashboard.toastMax3Values") }); return prev; }
      return { ...prev, marriageVision: [...current, id] };
    });
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) { toast({ title: t("dashboard.toastNameRequired"), variant: "destructive" }); return; }
    setSavingProfile(true);
    const res = await updateProfile({
      name: profileForm.name.trim(), city: profileForm.city.trim(), country: profileForm.country.trim(),
      civilStatus: profileForm.civilStatus, profession: profileForm.profession.trim(),
      bio: profileForm.bio.trim(), marriageVision: profileForm.marriageVision,
    });
    setSavingProfile(false);
    if (!res.ok) { toast({ title: t("dashboard.toastFailed"), description: res.error, variant: "destructive" }); return; }
    setUser(res.user); setEditingProfile(false);
    toast({ title: t("dashboard.toastProfileUpdated") });
  };

  const handlePickAvatar = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast({ title: t("dashboard.toastUnsupportedFormat"), variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: t("dashboard.toastImageTooLarge"), variant: "destructive" }); return; }
    setUploadingAvatar(true);
    const up = await uploadAvatar(file, user.id || "anon");
    setUploadingAvatar(false);
    if (up.error || !up.url) { toast({ title: t("dashboard.toastFailed"), description: up.error || t("dashboard.toastPleaseRetry"), variant: "destructive" }); return; }
    const res = await updateProfile({ avatar_url: up.url });
    if (!res.ok) { toast({ title: t("dashboard.toastFailed"), description: res.error, variant: "destructive" }); return; }
    setUser(res.user);
    toast({ title: t("dashboard.toastPhotoUpdated") });
  };

  // ── Social ──
  const loadSocial = async () => {
    if (!meId) return;
    setSocialLoading(true);
    const [members, friendships, incoming, favs, vis] = await Promise.all([
      listMembers(meId), listMyFriendships(meId), listIncomingRequests(meId), listFavorites(meId), listVisitors(meId),
    ]);
    const opposite = user?.gender === "homme" ? "femme" : user?.gender === "femme" ? "homme" : null;
    const filtered = opposite ? members.filter((m) => m.gender === opposite) : members;
    setDiscoverMembers(user ? filterAndRankByReciprocalMatch({ ...user, questionnaire: questionnaireAnswers }, filtered) : filtered);
    setRelations(buildRelationMap(meId, friendships));
    setIncomingRequests(incoming);
    setFavoriteMembers(favs);
    setFavoriteIds(new Set(favs.map((m) => m.id)));
    setVisitors(vis);
    setSocialLoading(false);
  };

  const handleToggleFavorite = async (member: MemberProfile) => {
    const isFav = favoriteIds.has(member.id);
    setFavoriteIds((prev) => { const n = new Set(prev); isFav ? n.delete(member.id) : n.add(member.id); return n; });
    setFavoriteMembers((prev) => (isFav ? prev.filter((m) => m.id !== member.id) : [member, ...prev]));
    const res = await setFavorite(member.id, !isFav);
    if (!res.ok) {
      setFavoriteIds((prev) => { const n = new Set(prev); isFav ? n.add(member.id) : n.delete(member.id); return n; });
      setFavoriteMembers((prev) => (isFav ? [member, ...prev] : prev.filter((m) => m.id !== member.id)));
      toast({ title: t("dashboard.toastFailed"), description: res.error || t("dashboard.toastPleaseRetry"), variant: "destructive" });
    }
  };

  const handleAddFriend = async (member: MemberProfile) => {
    setRelations((prev) => ({ ...prev, [member.id]: { status: "pending_out", requestId: prev[member.id]?.requestId || "" } }));
    const res = await sendFriendRequest(member.id);
    if (!res.ok) {
      setRelations((prev) => { const n = { ...prev }; delete n[member.id]; return n; });
      toast({ title: t("dashboard.toastFailed"), description: res.error || t("dashboard.toastPleaseRetry"), variant: "destructive" }); return;
    }
    toast({ title: t("dashboard.toastInvitationSent") });
  };

  const handleRespondRequest = async (req: FriendRequest, accept: boolean) => {
    const res = await respondToRequest(req.id, accept);
    if (!res.ok) { toast({ title: t("dashboard.toastFailed"), description: res.error, variant: "destructive" }); return; }
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
    setRelations((prev) => ({ ...prev, [req.requester.id]: { status: accept ? "friends" : "declined", requestId: req.id } }));
    toast({ title: accept ? t("dashboard.toastAllianceAccepted") : t("dashboard.toastRequestDeclined") });
  };

  const openComposer = (type: ComposerType) => { setComposerType(type); setComposerOpen(true); };

  const handleComposerImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: t("dashboard.toastUnsupportedFormat"), variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: t("dashboard.toastImageTooLarge10"), variant: "destructive" }); return; }
    setComposerImageFile(file);
    const reader = new FileReader();
    reader.onload = () => { setComposerImage(reader.result as string); setComposerOpen(true); };
    reader.readAsDataURL(file);
  };

  const resetComposer = () => {
    setComposerOpen(false);
    setComposerText("");
    setComposerImage(null);
    setComposerImageFile(null);
    setComposerType("Publication");
    setTestimonialSubmitted(false);
    setTestimonialSubmitting(false);
  };

  const publishPost = async () => {
    if (!composerText.trim() && !composerImage) { toast({ title: t("dashboard.toastNothingToPublish"), variant: "destructive" }); return; }

    // For "Témoignage" type: submit to the API with pending_review status
    if (composerType === "Témoignage" && user?.id) {
      setTestimonialSubmitting(true);
      try {
        const body = new FormData();
        body.append("user_id", user.id);
        body.append("couple_names", displayName);
        body.append("content", composerText.trim());
        body.append("rating", "5");
        if (composerImageFile) {
          body.append("image", composerImageFile);
        }

        const res = await fetch("/api/testimonials", { method: "POST", body });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || t("dashboard.toastSubmissionError"));
        }

        setTestimonialSubmitted(true);
        setTestimonialSubmitting(false);
        toast({ title: t("dashboard.toastTestimonySubmitted"), description: t("dashboard.toastTestimonySubmittedDesc") });
        return;
      } catch (err) {
        setTestimonialSubmitting(false);
        const message = err instanceof Error ? err.message : t("dashboard.toastUnknownError");
        toast({ title: t("dashboard.toastSubmissionFailed"), description: message, variant: "destructive" });
        return;
      }
    }

    // For other types: local feed post
    const newPost: FeedPost = {
      id: `post-${Date.now()}`, type: composerType, name: displayName, avatar: myAvatar ?? null,
      when: "À l'instant", text: composerText.trim(), image: composerImage, likes: 0, comments: 0, mine: true, createdAt: Date.now(),
    };
    setFeed((prev) => [newPost, ...prev]);
    resetComposer();
    toast({ title: t("dashboard.toastPostShared") });
  };

  const myPosts = feed.filter((p) => p.mine);
  const canEditPost = (p: FeedPost) => !!p.createdAt && Date.now() - p.createdAt < EDIT_WINDOW_MS;
  const deletePost = (id: string) => {
    if (!window.confirm(t("dashboard.confirmDeletePost"))) return;
    setFeed((prev) => prev.filter((p) => p.id !== id));
    if (editingPostId === id) cancelEditPost();
    toast({ title: t("dashboard.toastPostDeleted") });
  };
  const startEditPost = (p: FeedPost) => {
    if (!canEditPost(p)) { toast({ title: t("dashboard.toastEditExpired"), variant: "destructive" }); return; }
    setEditingPostId(p.id); setEditPostText(p.text); setEditPostImage(p.image ?? null);
  };
  const cancelEditPost = () => { setEditingPostId(null); setEditPostText(""); setEditPostImage(null); };
  const saveEditPost = () => {
    if (!editingPostId) return;
    const target = feed.find((p) => p.id === editingPostId);
    if (target && !canEditPost(target)) { toast({ title: t("dashboard.toastEditExpired"), variant: "destructive" }); cancelEditPost(); return; }
    if (!editPostText.trim() && !editPostImage) { toast({ title: t("dashboard.toastEmptyPost"), variant: "destructive" }); return; }
    setFeed((prev) => prev.map((p) => (p.id === editingPostId ? { ...p, text: editPostText.trim(), image: editPostImage, when: "Modifié à l'instant" } : p)));
    cancelEditPost();
    toast({ title: t("dashboard.toastPostEdited") });
  };

  // ── Effects ──
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    // Use a temporary placeholder; will be updated once user loads with gender
    const defaultVerses = getDailyVerses(null);
    setDailyQuote(defaultVerses[dayOfYear % defaultVerses.length]);
    getSession().then(setUser);
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && (TABS as string[]).includes(tabParam)) setActiveTab(tabParam as Tab);
    const conv = params.get("conv");
    if (conv) setPendingConv(conv);
  }, []);

  useEffect(() => {
    if (!pendingConv || !meId) return;
    setActiveTab("Messages");
    openConversation(pendingConv);
    loadConversations();
    setPendingConv(null);
  }, [pendingConv, meId]);

  // Update daily verse once user (with gender) is available
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const genderVerses = getDailyVerses(user.gender);
    setDailyQuote(genderVerses[dayOfYear % genderVerses.length]);
  }, [user?.gender]);

  useEffect(() => {
    if (!user?.id) return;
    upsertMyProfile(user).then((r) => {
      if (r.error) toast({ title: t("dashboard.toastDirectoryUnavailable"), description: r.error, variant: "destructive" });
      else loadSocial();
    });
    loadConversations();
    getMyOnboarding().then(({ answers, completed }) => {
      setQuestionnaireAnswers(answers);
      const skipped = typeof window !== "undefined" && localStorage.getItem("eden_onboarding_skipped") === "1";
      if (!completed && !skipped) router.replace("/onboarding");
    });

    // Fetch full profile data to calculate real completion percentage
    if (supabase) {
      supabase.from("profiles")
        .select("avatar_url, name, bio, city, profession, civil_status, marriage_vision, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const checks = [
            !!data.avatar_url,
            !!data.name,
            !!data.bio,
            !!data.city,
            !!data.profession,
            !!data.civil_status,
            !!(data.marriage_vision && (data.marriage_vision as string[]).length > 0),
            !!data.onboarding_completed,
          ];
          const done = checks.filter(Boolean).length;
          setProfileCompletionPct(Math.round((done / checks.length) * 100));
        });
    }
  }, [user]);

  // Le questionnaire ("me") arrive après le premier classement des profils (loadSocial) : on
  // reclasse la liste déjà chargée dès que les réponses sont disponibles, sans tout recharger.
  useEffect(() => {
    if (!user || discoverMembers.length === 0) return;
    setDiscoverMembers((prev) => filterAndRankByReciprocalMatch({ ...user, questionnaire: questionnaireAnswers }, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaireAnswers]);

  useEffect(() => {
    if (activeTab === "Messages" || activeTab === "Notifications" || activeTab === "Accueil" || activeTab === "Home") loadConversations();
    if (["Découvrir", "Discover", "Demandes", "Requests", "Notifications", "Favoris", "Favorites", "Visiteurs", "Visitors", "Accueil", "Home"].includes(activeTab)) loadSocial();
  }, [activeTab]);

  useEffect(() => {
    if (!showNewChat) return;
    let active = true;
    const timer = setTimeout(async () => {
      const res = await searchUsers(userQuery, meId);
      if (active) { setUserResults(res.users); setSearchError(res.error || null); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [userQuery, showNewChat]);

  useEffect(() => {
    setPartnerTyping(false);
    if (!supabase || !activeConvId || !meId) return;
    const convId = activeConvId;
    const channel = supabase
      .channel(`conv-${convId}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        const m: any = payload.new;
        const msg: ChatMessage = { id: m.id, from: m.sender_id === meId ? "me" : "them", text: m.content, time: formatTime(m.created_at), imageUrl: m.image_url };
        setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
        if (m.sender_id !== meId) markConversationRead(convId, meId);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.from && payload.from !== meId) {
          setPartnerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 2500);
        }
      })
      .subscribe();
    chatChannelRef.current = channel;
    return () => { chatChannelRef.current = null; if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); supabase?.removeChannel(channel); };
  }, [activeConvId, meId]);

  const convIdsKey = conversations.map((c) => c.id).join(",");
  useEffect(() => {
    if (!supabase || !meId) return;
    const ids = conversations.map((c) => c.id);
    let channel = supabase.channel(`inbox-${meId}`);
    if (ids.length) {
      channel = channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=in.(${ids.join(",")})` }, (payload) => {
        const m: any = payload.new;
        if (m.sender_id === meId) return;
        loadConversations();
        if (activeConvId !== m.conversation_id) {
          const conv = conversations.find((c) => c.id === m.conversation_id);
          toast({ title: conv ? t("dashboard.toastNewMessageFrom", { name: conv.name }) : t("dashboard.toastNewMessage"), description: m.image_url ? t("dashboard.toastNewMessagePhoto") : m.content });
        }
      });
    }
    channel = channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_members", filter: `user_id=eq.${meId}` }, () => loadConversations());
    channel.subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [convIdsKey, meId, activeConvId]);

  useEffect(() => {
    if (!supabase || !meId) return;
    const channel = supabase
      .channel(`friendships-${meId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${meId}` }, (payload) => {
        if (payload.eventType === "INSERT") toast({ title: t("dashboard.toastNewAllianceRequest") });
        loadSocial();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `requester_id=eq.${meId}` }, () => loadSocial())
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [meId]);

  const handleLogout = async () => { await logout(); router.push("/login"); };

  // ── Questionnaire handlers ──
  const startEditQuestionnaire = (qKey: string) => {
    setLocalQAnswers({ ...questionnaireAnswers });
    setEditingQuestionnaire(qKey);
  };

  const handleQFieldChange = (fieldId: string, value: any) => {
    setLocalQAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleQMultiToggle = (fieldId: string, option: string, max?: number) => {
    const current: string[] = localQAnswers[fieldId] || [];
    if (current.includes(option)) { handleQFieldChange(fieldId, current.filter(x => x !== option)); return; }
    if (max && current.length >= max) return;
    handleQFieldChange(fieldId, [...current, option]);
  };

  const handleSaveQuestionnaire = async () => {
    setSavingQuestionnaire(true);
    try {
      const result = await saveOnboarding(localQAnswers, true);
      if (!result.ok) throw new Error(result.error);
      setQuestionnaireAnswers(localQAnswers);
      setEditingQuestionnaire(null);
      toast({ title: t("dashboard.toastFaithJourneyUpdated") });
    } catch (e: any) {
      toast({ title: t("dashboard.toastError"), description: e.message, variant: "destructive" });
    } finally {
      setSavingQuestionnaire(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ background: "#FAF9F6" }}>
      {/* ══ LAYER 1: SIDEBAR ══ */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        displayName={displayName}
        displayInitial={displayInitial}
        myAvatar={myAvatar}
        displayLocation={displayLocation}
        totalUnread={totalUnread}
        incomingRequestCount={incomingRequests.length}
        notifCount={notifCount}
        onLogout={handleLogout}
      />

      {/* ══ MAIN CONTENT (Layers 2 + 3) ══ */}
      <div className="lg:pl-[280px] pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8"
          style={{ background: "rgba(250,249,246,0.92)", borderBottom: "1px solid #E8E5E0" }}>
          {/* Mobile logo */}
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <Monogram className="w-8 h-7 text-primary shrink-0" />
            <span className="font-headline text-lg font-bold text-foreground">Eden <span>Connexion</span></span>
          </Link>
          {/* Desktop page title */}
          <h1 className="hidden lg:block font-headline text-xl font-bold" style={{ color: "#2F2F2F" }}>{tabLabel(activeTab)}</h1>
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-colors"
              style={{ background: "#EEF5EC", color: "#486B46", border: "1px solid #C6D4C0" }}>
              <Zap className="w-3.5 h-3.5" style={{ fill: "#C6A15B", color: "#C6A15B" }} /> {t("dashboard.boost")}
            </button>
            <button onClick={() => setActiveTab("Notifications")} title={t("dashboardTabs.notifications")}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: "#777777" }}>
              <MessageCircle className="w-5 h-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[9px] font-black rounded-full flex items-center justify-center"
                  style={{ background: "#486B46", color: "#FFFFFF" }}>{totalUnread}</span>
              )}
            </button>
            <button onClick={() => setActiveTab("Profil")} className="rounded-full">
              <Avatar className="w-9 h-9" style={{ border: "1px solid #E8E5E0" }}>
                <AvatarImage src={myAvatar} />
                <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{displayInitial}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] backdrop-blur-xl lg:hidden flex flex-col p-8 pt-24 space-y-7 animate-in fade-in duration-300 overflow-y-auto"
            style={{ background: "rgba(250,249,246,0.98)" }}>
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-8 right-8 text-foreground"><X className="w-10 h-10" /></button>
            {(["Accueil", "Découvrir", "Messages", "Demandes", "Visiteurs", "Favoris", "Notifications", "Premium", "Profil"] as Tab[]).map((name) => (
              <button key={name} onClick={() => { setActiveTab(name); setMobileMenuOpen(false); }}
                className={cn("flex items-center gap-6 text-2xl font-headline font-bold transition-colors",
                  activeTab === name ? "text-foreground" : "text-foreground/60")}
                style={activeTab === name ? { color: "#486B46" } : {}}>
                {tabLabel(name)}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* THREE-LAYER CONTENT */}
        {/* ═══════════════════════════════════════════════════ */}
        {(activeTab === "Accueil" || activeTab === "Home") ? (
          /* ══ HOME: 3-COLUMN LAYOUT ══ */
          <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1400px] mx-auto">
            <div className="flex gap-6 items-start">
              {/* ─── LAYER 2: MAIN FEED (≈65%) ─── */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* Section 1: Daily Verse Banner */}
                <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                  className="relative overflow-hidden rounded-3xl px-6 py-8 sm:py-10 text-center"
                  style={{ background: "linear-gradient(135deg, #EEF5EC 0%, #FAF9F6 60%, #EEF5EC 100%)", border: "1px solid #C6D4C0" }}>
                  <VitrailPattern className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-32 rounded-full pointer-events-none opacity-30"
                    style={{ background: "radial-gradient(circle, #486B46 0%, transparent 70%)", filter: "blur(40px)" }} />
                  <div className="relative z-10 flex flex-col items-center">
                    <Monogram className="w-10 h-8 mb-4" style={{ color: "#6E8B63" }} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] mb-4" style={{ color: "#6E8B63" }}>
                      {t("dashboard.wordOfDay")}
                    </span>
                    <p key={(dailyQuote ?? VERSE_OF_DAY).ref} className="font-headline text-xl sm:text-2xl lg:text-[1.75rem] italic leading-relaxed max-w-xl animate-in fade-in duration-700"
                      style={{ color: "#2F2F2F" }}>
                      &ldquo;{(dailyQuote ?? VERSE_OF_DAY).text}&rdquo;
                    </p>
                    <p className="text-xs font-bold tracking-[0.28em] uppercase mt-4" style={{ color: "#6E8B63" }}>
                      {(dailyQuote ?? VERSE_OF_DAY).ref}
                    </p>
                    <span style={{ color: "#C6D4C0" }}><Flourish className="w-36 h-3 mt-4" /></span>
                    <p className="text-sm mt-3" style={{ color: "#777777" }}>
                      {t("dashboard.peaceBeWith")} <span className="font-semibold" style={{ color: "#2F2F2F" }}>{displayName}</span>.
                    </p>
                  </div>
                </motion.section>

                {/* Section 2: Create Post */}
                <div className="rounded-2xl p-5"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <input ref={composerImageRef} type="file" accept="image/*" className="hidden" onChange={handleComposerImage} />
                  <div className={cn("flex gap-3", composerOpen ? "items-start" : "items-center")}>
                    <Avatar className="w-10 h-10 shrink-0" style={{ border: "1px solid #E8E5E0" }}>
                      <AvatarImage src={myAvatar} />
                      <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{displayInitial}</AvatarFallback>
                    </Avatar>
                    {composerOpen ? (
                      <div className="flex-1 min-w-0 space-y-3">
                        {testimonialSubmitted ? (
                          /* Success state for testimonial submission */
                          <div className="text-center py-6 space-y-4">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
                              <CheckCircle2 className="w-7 h-7" style={{ color: "#486B46" }} />
                            </div>
                            <div className="space-y-1">
                              <p className="font-headline text-lg font-bold" style={{ color: "#2F2F2F" }}>{t("dashboard.thankYouTestimony")}</p>
                              <p className="text-sm" style={{ color: "#777777" }}>
                                {t("dashboard.testimonyPendingPrefix")}{" "}
                                <strong style={{ color: "#C6A15B" }}>{t("dashboard.testimonyPending")}</strong> {t("dashboard.testimonyPendingRest")}
                              </p>
                            </div>
                            <button onClick={resetComposer} className="h-10 px-6 rounded-xl text-sm font-bold transition-colors" style={{ background: "#486B46", color: "#FFFFFF" }}>
                              {t("dashboard.close")}
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              {(["Post", "Testimony", "Prayer"] as ComposerType[]).map((ct) => (
                                <button key={ct} onClick={() => setComposerType(ct)}
                                  className="px-3 h-7 rounded-full text-[11px] font-bold transition-colors"
                                  style={composerType === ct
                                    ? { background: "#486B46", color: "#FFFFFF" }
                                    : { border: "1px solid #C6D4C0", color: "#486B46" }}>
                                  {ct === "Post" ? t("dashboard.typePost") : ct === "Testimony" ? t("dashboard.typeTestimony") : t("dashboard.typePrayer")}
                                </button>
                              ))}
                            </div>
                            <Textarea autoFocus value={composerText} onChange={(e) => setComposerText(e.target.value)}
                              placeholder={composerType === "Testimony" ? t("dashboard.testimonyPlaceholder") : t("dashboard.sharePostPlaceholder")}
                              className="min-h-[88px] rounded-xl text-sm resize-none"
                              style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                            {composerImage && (
                              <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid #E8E5E0" }}>
                                <img src={composerImage} alt="Aperçu" className="w-full max-h-80 object-contain" style={{ background: "#FAF9F6" }} />
                                <button onClick={() => { setComposerImage(null); setComposerImageFile(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur flex items-center justify-center"
                                  style={{ background: "rgba(250,249,246,0.8)" }}>
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <button onClick={() => composerImageRef.current?.click()}
                                className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-bold transition-colors"
                                style={{ color: "#777777" }}>
                                <ImagePlus className="w-4 h-4" style={{ color: "#486B46" }} /> {composerImage ? t("dashboard.changePhoto") : t("dashboard.photo")}
                              </button>
                              <div className="flex items-center gap-2">
                                <button onClick={resetComposer} className="h-9 px-4 rounded-lg text-sm font-bold transition-colors" style={{ color: "#777777" }}>{t("dashboard.cancel")}</button>
                                <Button onClick={publishPost} disabled={(!composerText.trim() && !composerImage) || testimonialSubmitting}
                                  className="h-9 px-5 font-bold rounded-lg gap-2 text-sm disabled:opacity-50"
                                  style={{ background: "#486B46", color: "#FFFFFF" }}>
                                  {testimonialSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> {t("dashboard.sending")}</>
                                  ) : composerType === "Testimony" ? (
                                    <>{t("dashboard.submit")} <Send className="w-4 h-4" /></>
                                  ) : (
                                    <>{t("dashboard.post")} <Send className="w-4 h-4" /></>
                                  )}
                                </Button>
                              </div>
                            </div>
                            {composerType === "Testimony" && (
                              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                                {t("dashboard.testimonyReviewNotice")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => openComposer("Post")}
                        className="flex-1 text-left h-11 px-4 rounded-full text-sm transition-colors truncate"
                        style={{ background: "#FAF9F6", color: "#777777" }}>
                        {t("dashboard.sharePlaceholder")}
                      </button>
                    )}
                  </div>
                  {!composerOpen && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #F0EDE8" }}>
                      {[
                        { label: t("dashboard.typeTestimony"), icon: Quote, type: "Testimony" as ComposerType, photo: false },
                        { label: t("dashboard.typePrayer"), icon: HeartHandshake, type: "Prayer" as ComposerType, photo: false },
                        { label: t("dashboard.photo"), icon: Camera, type: "Post" as ComposerType, photo: true },
                      ].map((b) => (
                        <button key={b.label} onClick={() => { openComposer(b.type); if (b.photo) composerImageRef.current?.click(); }}
                          className="flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold transition-colors"
                          style={{ color: "#777777" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#EEF5EC"; e.currentTarget.style.color = "#486B46"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#777777"; }}>
                          <b.icon className="w-4 h-4" style={{ color: "#486B46" }} /> {b.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Social Feed */}
                {feed.length > 0 && feed.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.4, delay: i * 0.04 }}>
                    <div className="rounded-2xl overflow-hidden"
                      style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                      <div className="p-5 flex items-center gap-3">
                        <Avatar className="w-11 h-11 shrink-0" style={{ border: "1px solid #E8E5E0" }}>
                          <AvatarImage src={p.avatar || undefined} />
                          <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{p.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: "#2F2F2F" }}>{p.name}</p>
                          <p className="text-xs" style={{ color: "#777777" }}>{p.when}</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={p.type === "Testimony" ? { background: "#EEF5EC", color: "#486B46" } : { background: "#F5EDE8", color: "#C6A15B" }}>
                          {p.type}
                        </span>
                      </div>
                      {p.text && <div className="px-5 pb-3"><p className="text-sm leading-relaxed" style={{ color: "#2F2F2F" }}>{p.text}</p></div>}
                      {p.image && <img src={p.image} alt="" className="w-full h-auto max-h-[60vh] object-cover" style={{ background: "#FAF9F6" }} />}
                      <PostActions likes={p.likes} comments={p.comments} />
                    </div>
                  </motion.div>
                ))}

                {/* Empty feed state */}
                {feed.length === 0 && (
                  <div className="text-center py-8 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                    <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#C6D4C0" }} />
                    <p className="text-sm" style={{ color: "#777777" }}>{t("dashboard.emptyFeed")}</p>
                  </div>
                )}

                {/* Section 4: Recommended Profiles */}
                {discoverMembers.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-headline text-lg font-bold" style={{ color: "#2F2F2F" }}>{t("dashboard.recommendedProfiles")}</h3>
                        <p className="text-xs" style={{ color: "#777777" }}>{t("dashboard.recommendedProfilesDesc")}</p>
                      </div>
                      <button onClick={() => setActiveTab("Discover")} className="text-xs font-bold flex items-center gap-1 transition-colors"
                        style={{ color: "#486B46" }}>
                        {t("dashboard.seeAll")} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {discoverMembers.slice(0, 3).map((m) => (
                        <MemberCard key={m.id} m={m}
                          match={user ? computeDisplayMatch({ ...user, questionnaire: questionnaireAnswers }, m).score : null}
                          isFavorite={favoriteIds.has(m.id)}
                          onToggleFav={() => handleToggleFavorite(m)}
                          onOpen={() => router.push(`/dashboard/profile/${m.id}`)} />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* ─── LAYER 3: INFORMATION PANEL (≈320px) ─── */}
              <aside className="hidden xl:block w-[320px] shrink-0 space-y-4 sticky top-20">
                {/* Card 1: Profile Completion — hidden when profile is 100% complete */}
                {profileCompletionPct !== null && profileCompletionPct < 100 && (
                <div className="rounded-2xl p-5"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <div className="flex justify-between items-end mb-3">
                    <span className="font-headline font-bold text-sm" style={{ color: "#2F2F2F" }}>{t("dashboard.profileCompleted")}</span>
                    <span className="font-black text-xl" style={{ color: "#486B46" }}>{profileCompletionPct}%</span>
                  </div>
                  <Progress value={profileCompletionPct} className="h-2" style={{ background: "#F0EDE8" }} />
                  <p className="text-xs mt-3 leading-relaxed" style={{ color: "#777777" }}>
                    {t("dashboard.profileCompletedDesc", { pct: 100 - profileCompletionPct })}
                  </p>
                  <Button onClick={() => setActiveTab("Profil")} variant="outline"
                    className="w-full mt-3 h-9 rounded-xl font-bold text-xs"
                    style={{ borderColor: "#C6D4C0", color: "#486B46", background: "transparent" }}>
                    {t("dashboard.completeMyProfile")}
                  </Button>
                </div>
                )}

                {/* Card 2: Profile Visibility — real visitor count, not a fabricated percentage */}
                <div className="rounded-2xl p-5"
                  style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #EEF5EC 100%)", border: "1px solid #C6D4C0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <p className="font-headline font-bold text-sm mb-3" style={{ color: "#2F2F2F" }}>{t("dashboard.profileVisibility")}</p>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#FFFFFF", border: "1px solid #C6D4C0" }}>
                      <Eye className="w-7 h-7" style={{ color: "#486B46" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-2xl leading-none" style={{ color: "#486B46" }}>{visitsThisWeek}</p>
                      <p className="text-xs font-medium mt-1" style={{ color: "#777777" }}>{t("dashboard.visitsThisWeek")}</p>
                    </div>
                  </div>
                  <Button onClick={() => setActiveTab("Visitors")} variant="outline"
                    className="w-full mt-3 h-9 rounded-xl font-bold text-xs"
                    style={{ borderColor: "#C6D4C0", color: "#486B46", background: "transparent" }}>
                    {t("dashboard.seeMyVisitors")}
                  </Button>
                </div>

                {/* Verification Status Card */}
                {verificationStatus !== "none" && !(verificationStatus === "verified" && profileCompletionPct !== null && profileCompletionPct < 100) && (
                  <div className="rounded-2xl p-5"
                    style={{
                      background: verificationStatus === "verified" ? "linear-gradient(135deg, #EEF5EC 0%, #FAF9F6 100%)"
                        : verificationStatus === "rejected" ? "linear-gradient(135deg, #FEF2F2 0%, #FAF9F6 100%)"
                        : "linear-gradient(135deg, #FFFBEB 0%, #FAF9F6 100%)",
                      border: `1px solid ${verificationStatus === "verified" ? "#C6D4C0" : verificationStatus === "rejected" ? "#FECACA" : "#FDE68A"}`,
                      boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)"
                    }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: verificationStatus === "verified" ? "#EEF5EC" : verificationStatus === "rejected" ? "#FEF2F2" : "#FFFBEB" }}>
                        <ShieldCheck className="w-4 h-4"
                          style={{ color: verificationStatus === "verified" ? "#38C172" : verificationStatus === "rejected" ? "#EF4444" : "#D97706" }} />
                      </div>
                      <p className="font-headline font-bold text-sm" style={{ color: "#2F2F2F" }}>
                        {verificationStatus === "verified" && t("dashboard.verifiedProfileBadge")}
                        {verificationStatus === "under_review" && t("dashboard.verificationInProgress")}
                        {verificationStatus === "rejected" && t("dashboard.verificationNotApproved")}
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "#777777" }}>
                      {verificationStatus === "verified" && t("dashboard.verifiedDesc")}
                      {verificationStatus === "under_review" && t("dashboard.underReviewDesc")}
                      {verificationStatus === "rejected" && (verificationRejectionReason
                        ? `${t("dashboard.rejectedReasonPrefix")} ${verificationRejectionReason}`
                        : t("dashboard.rejectedDescDefault"))}
                    </p>
                    {verificationStatus === "rejected" && (
                      <Button onClick={() => router.push("/dashboard/profile")} variant="outline"
                        className="w-full mt-3 h-9 rounded-xl font-bold text-xs"
                        style={{ borderColor: "#C6D4C0", color: "#486B46", background: "transparent" }}>
                        {t("dashboard.updateMyProfile")}
                      </Button>
                    )}
                  </div>
                )}

                {/* Card 3: Upcoming Events */}
                <div className="rounded-2xl p-5"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <p className="font-headline font-bold text-sm flex items-center gap-2 mb-3" style={{ color: "#2F2F2F" }}>
                    <CalendarDays className="w-4 h-4" style={{ color: "#486B46" }} /> {t("dashboard.upcomingEvents")}
                  </p>
                  <div className="space-y-3">
                    {upcomingEvents.length > 0 ? upcomingEvents.map((e) => {
                      const evDate = new Date(e.event_date);
                      const formattedEvDate = evDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                      return (
                        <div key={e.id} className="flex items-center gap-3 group cursor-pointer">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                            style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
                            {e.cover_image_url ? (
                              <img src={e.cover_image_url} alt="" className="w-9 h-9 object-cover" />
                            ) : (
                              <CalendarDays className="w-4 h-4" style={{ color: "#486B46" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:transition-colors" style={{ color: "#2F2F2F" }}>{e.title}</p>
                            <p className="text-[11px]" style={{ color: "#777777" }}>{formattedEvDate}{e.location ? ` · ${e.location}` : ""}</p>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-xs text-center py-2" style={{ color: "#9CA3AF" }}>{t("dashboard.noEventsScheduled")}</p>
                    )}
                  </div>
                </div>

                {/* Card 4: Recent Activity */}
                <div className="rounded-2xl p-5"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <p className="font-headline font-bold text-sm mb-3" style={{ color: "#2F2F2F" }}>{t("dashboard.recentActivity")}</p>
                  <div className="space-y-3">
                    {visitors.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EEF5EC" }}>
                          <Eye className="w-4 h-4" style={{ color: "#486B46" }} />
                        </div>
                        <p className="text-xs flex-1" style={{ color: "#2F2F2F" }}>
                          <span className="font-bold">{visitors.length}</span> {t("dashboard.recentVisitors")}
                        </p>
                      </div>
                    )}
                    {favoriteMembers.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F5EDE8" }}>
                          <Heart className="w-4 h-4" style={{ color: "#C6A15B" }} />
                        </div>
                        <p className="text-xs flex-1" style={{ color: "#2F2F2F" }}>
                          <span className="font-bold">{favoriteMembers.length}</span> {t("dashboard.favoritesCount")}
                        </p>
                      </div>
                    )}
                    {incomingRequests.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EEF5EC" }}>
                          <Star className="w-4 h-4" style={{ color: "#C6A15B" }} />
                        </div>
                        <p className="text-xs flex-1" style={{ color: "#2F2F2F" }}>
                          <span className="font-bold">{incomingRequests.length}</span> {t("dashboard.allianceRequests")}
                        </p>
                      </div>
                    )}
                    {totalUnread > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EEF5EC" }}>
                          <MessageCircle className="w-4 h-4" style={{ color: "#486B46" }} />
                        </div>
                        <p className="text-xs flex-1" style={{ color: "#2F2F2F" }}>
                          <span className="font-bold">{totalUnread}</span> {t("dashboard.unreadMessages")}
                        </p>
                      </div>
                    )}
                    {unreadBlogNotifs.length > 0 && (
                      <button onClick={() => setActiveTab("Notifications")} className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EEF5EC" }}>
                          <BookOpen className="w-4 h-4" style={{ color: "#486B46" }} />
                        </div>
                        <p className="text-xs flex-1 text-left" style={{ color: "#2F2F2F" }}>
                          <span className="font-bold">{unreadBlogNotifs.length}</span> {t("dashboard.newBlogArticles")}
                        </p>
                      </button>
                    )}
                    {visitors.length === 0 && favoriteMembers.length === 0 && incomingRequests.length === 0 && totalUnread === 0 && unreadBlogNotifs.length === 0 && (
                      <p className="text-xs" style={{ color: "#777777" }}>{t("dashboard.noRecentActivity")}</p>
                    )}
                  </div>
                </div>

                {/* Card 5: Dashboard Statistics */}
                <div className="rounded-2xl p-5"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <p className="font-headline font-bold text-sm mb-4" style={{ color: "#2F2F2F" }}>{t("dashboard.statistics")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t("dashboard.statMessages"), value: totalUnread, icon: MessageCircle },
                      { label: t("dashboard.statVisitors"), value: visitors.length, icon: Eye },
                      { label: t("dashboard.statFavorites"), value: favoriteMembers.length, icon: Heart },
                      { label: t("dashboard.statRequests"), value: incomingRequests.length, icon: Star },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#FAF9F6" }}>
                        <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: "#486B46" }} />
                        <p className="font-black text-xl" style={{ color: "#2F2F2F" }}>{s.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#777777" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          /* ══ OTHER TABS: SINGLE COLUMN ══ */
          <main className="px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                {renderOtherTabs()}
              </motion.div>
            </AnimatePresence>
          </main>
        )}
      </div>

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl h-[76px] flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]"
        style={{ background: "rgba(255,255,255,0.95)", borderTop: "1px solid #E8E5E0" }}>
        {(["Accueil", "Découvrir", "Messages", "Favoris"] as Tab[]).map((name) => {
          const active = activeTab === name;
          return (
            <button key={name} onClick={() => setActiveTab(name)}
              className="flex flex-col items-center justify-center gap-1 w-full h-full transition-colors"
              style={{ color: active ? "#486B46" : "#777777" }}>
              {name === "Accueil" && <Home className="w-5 h-5" />}
              {name === "Découvrir" && <Search className="w-5 h-5" />}
              {name === "Messages" && <MessageCircle className="w-5 h-5" />}
              {name === "Favoris" && <Heart className="w-5 h-5" />}
              <span className="text-[9px] font-bold uppercase tracking-wider">{tabLabel(name)}</span>
            </button>
          );
        })}
        <button onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 w-full h-full transition-colors"
          style={{ color: "#777777" }}>
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{t("dashboard.menu")}</span>
        </button>
      </nav>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER OTHER TABS (non-Home)
  // ═══════════════════════════════════════════════════════════
  function renderOtherTabs() {
    switch (activeTab) {
      case "Découvrir":
      case "Discover": {
        const q = discoverSearch.trim().toLowerCase();
        const scoreOf = (m: MemberProfile) => (user ? computeDisplayMatch({ ...user, questionnaire: questionnaireAnswers }, m).score : 0);
        const discoverResults = discoverMembers.filter((m) => {
          if (q && !((m.name || "").toLowerCase().includes(q) || (m.city || "").toLowerCase().includes(q) || (m.country || "").toLowerCase().includes(q) || (m.profession || "").toLowerCase().includes(q))) return false;
          if (discoverFilter === "nearMe" && !(user?.country && m.country && user.country.toLowerCase() === m.country.toLowerCase())) return false;
          if (discoverFilter === "highAffinity" && scoreOf(m) < 75) return false;
          if (discoverFilter === "verified" && !m.avatar_url) return false;
          return true;
        });
        const shown = discoverResults.slice(0, discoverCount);
        const discoverFilters = [
          { key: "all", label: t("dashboard.filterAll") },
          { key: "nearMe", label: t("dashboard.filterNearMe") },
          { key: "new", label: t("dashboard.filterNew") },
          { key: "highAffinity", label: t("dashboard.filterHighAffinity") },
          { key: "verified", label: t("dashboard.filterVerified") },
        ];
        return (
          <div className="space-y-6">
            <TabHeader icon={Search} title={t("dashboard.discoverTitle")} subtitle={t("dashboard.discoverSubtitle")} />
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#486B46" }} />
              <Input value={discoverSearch} onChange={(e) => { setDiscoverSearch(e.target.value); setDiscoverCount(24); }}
                placeholder={t("dashboard.discoverSearchPlaceholder")}
                className="h-12 pl-12 pr-12 rounded-2xl text-sm"
                style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }} />
              {discoverSearch && <button onClick={() => setDiscoverSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#777777" }}><X className="w-4 h-4" /></button>}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {discoverFilters.map((filter) => (
                <button key={filter.key} onClick={() => setDiscoverFilter(filter.key)}
                  className="shrink-0 px-5 h-10 rounded-full text-xs font-bold transition-all flex items-center gap-2"
                  style={discoverFilter === filter.key
                    ? { background: "#486B46", color: "#FFFFFF" }
                    : { background: "#FFFFFF", color: "#777777", border: "1px solid #E8E5E0" }}>
                  {filter.label}
                </button>
              ))}
            </div>
            {socialLoading && discoverMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#486B46" }} />
                <p className="text-sm" style={{ color: "#777777" }}>{t("dashboard.loadingMembers")}</p>
              </div>
            ) : shown.length === 0 ? (
              <EmptyState icon={Search} title={t("dashboard.noProfilesFound")} text={t("dashboard.inviteLovedOnes")} cta={t("dashboard.explore")} />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {shown.map((m) => {
                  const status = relations[m.id]?.status ?? "none";
                  return (
                    <MemberCard key={m.id} m={m} match={scoreOf(m)} isFavorite={favoriteIds.has(m.id)}
                      onToggleFav={() => handleToggleFavorite(m)}
                      onOpen={() => router.push(`/dashboard/profile/${m.id}`)}
                      action={
                        status === "friends" ? (
                          <Button onClick={() => router.push(`/dashboard/profile/${m.id}`)} variant="outline"
                            className="h-9 rounded-xl font-bold gap-1.5 text-xs" style={{ borderColor: "#C6D4C0", color: "#486B46" }}>
                            <Check className="w-3.5 h-3.5" /> {t("dashboard.friends")}
                          </Button>
                        ) : status === "pending_out" ? (
                          <Button disabled variant="outline" className="h-9 rounded-xl font-bold gap-1.5 text-xs" style={{ borderColor: "#E8E5E0", color: "#777777" }}>
                            <Check className="w-3.5 h-3.5" /> {t("dashboard.sent")}
                          </Button>
                        ) : (
                          <Button onClick={() => handleAddFriend(m)} className="h-9 rounded-xl font-bold gap-1.5 text-xs" style={{ background: "#486B46", color: "#FFFFFF" }}>
                            <UserPlus className="w-3.5 h-3.5" /> {t("dashboard.add")}
                          </Button>
                        )
                      } />
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case "Visitors":
      case "Visiteurs":
        return (
          <div className="space-y-6">
            <TabHeader icon={Eye} title={t("dashboard.visitorsTitle")} subtitle={t("dashboard.visitorsSubtitle")} />
            {socialLoading && visitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#486B46" }} />
                <p className="text-sm" style={{ color: "#777777" }}>{t("dashboard.loading")}</p>
              </div>
            ) : visitors.length === 0 ? (
              <EmptyState icon={Eye} title={t("dashboard.noVisitors")} text={t("dashboard.noVisitorsDesc")} cta={t("dashboard.discoverProfiles")} onClick={() => setActiveTab("Discover")} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {visitors.map((v) => (
                  <div key={v.member.id} onClick={() => router.push(`/dashboard/profile/${v.member.id}`)}
                    className="group overflow-hidden rounded-2xl cursor-pointer transition-all duration-200"
                    style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                    <div className="relative aspect-[3/4]">
                      {v.member.avatar_url ? (
                        <Image src={v.member.avatar_url} alt={v.member.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-headline text-4xl font-bold"
                          style={{ background: "linear-gradient(135deg, #EEF5EC, #FAF9F6)", color: "#6E8B63" }}>{v.member.name?.[0]?.toUpperCase()}</span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <h4 className="font-headline text-base font-bold text-white truncate inline-flex items-center gap-1">
                          {v.member.name}
                          {v.member.verification_status === "verified" && isProfileFullyComplete(v.member) && <VerifiedBadge size={14} />}
                        </h4>
                      </div>
                    </div>
                    <div className="px-3 py-2 flex items-center gap-1.5 text-[11px]" style={{ background: "#FAF9F6", borderTop: "1px solid #E8E5E0", color: "#777777" }}>
                      <Clock className="w-3 h-3" /> {v.when}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "Favorites":
      case "Favoris":
        return (
          <div className="space-y-6">
            <TabHeader icon={Heart} title={t("dashboard.favoritesTitle")} subtitle={t("dashboard.favoritesSubtitle")} />
            {socialLoading && favoriteMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#486B46" }} />
                <p className="text-sm" style={{ color: "#777777" }}>{t("dashboard.loading")}</p>
              </div>
            ) : favoriteMembers.length === 0 ? (
              <EmptyState icon={Heart} title={t("dashboard.noFavorites")} text={t("dashboard.noFavoritesDesc")} cta={t("dashboard.discoverProfiles")} onClick={() => setActiveTab("Discover")} />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {favoriteMembers.map((m) => (
                  <MemberCard key={m.id} m={m} isFavorite={favoriteIds.has(m.id)}
                    onToggleFav={() => handleToggleFavorite(m)}
                    onOpen={() => router.push(`/dashboard/profile/${m.id}`)}
                    action={
                      <Button onClick={() => router.push(`/dashboard/profile/${m.id}`)} variant="outline"
                        className="h-9 rounded-xl font-bold gap-1.5 text-xs" style={{ borderColor: "#C6D4C0", color: "#486B46" }}>
                        <Eye className="w-3.5 h-3.5" /> {t("dashboard.viewProfile")}
                      </Button>
                    } />
                ))}
              </div>
            )}
          </div>
        );

      case "Requests":
      case "Demandes":
        return (
          <div className="space-y-6">
            <TabHeader icon={Star} title={t("dashboard.requestsTitle")} subtitle={t("dashboard.requestsSubtitle")} />
            {socialLoading && incomingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#486B46" }} />
                <p className="text-sm" style={{ color: "#777777" }}>{t("dashboard.loading")}</p>
              </div>
            ) : incomingRequests.length === 0 ? (
              <EmptyState icon={Star} title={t("dashboard.noPendingRequests")} text={t("dashboard.noPendingRequestsDesc")} cta={t("dashboard.discoverProfiles")} onClick={() => setActiveTab("Discover")} />
            ) : (
              <div className="space-y-4">
                {incomingRequests.map((r) => {
                  const m = r.requester;
                  const loc = [m.city, m.country].filter(Boolean).join(", ");
                  return (
                    <div key={r.id} className="rounded-2xl p-5 sm:p-6"
                      style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                      <div className="flex flex-col sm:flex-row gap-5">
                        <button onClick={() => router.push(`/dashboard/profile/${m.id}`)}
                          className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 mx-auto sm:mx-0"
                          style={{ border: "2px solid #E8E5E0" }}>
                          {m.avatar_url ? <Image src={m.avatar_url} alt={m.name} fill className="object-cover" unoptimized /> :
                            <span className="absolute inset-0 flex items-center justify-center font-headline text-2xl font-bold" style={{ background: "#EEF5EC", color: "#486B46" }}>{m.name?.[0]?.toUpperCase()}</span>}
                        </button>
                        <div className="flex-1 space-y-3 text-center sm:text-left">
                          <div>
                            <h4 className="font-headline text-lg font-bold inline-flex items-center gap-1.5" style={{ color: "#2F2F2F" }}>
                              {m.name}
                              {m.verification_status === "verified" && isProfileFullyComplete(m) && <VerifiedBadge size={16} />}
                            </h4>
                            {loc && <p className="text-xs flex items-center gap-1 justify-center sm:justify-start" style={{ color: "#777777" }}>
                              <MapPin className="w-3 h-3" /> {loc}{m.profession ? ` • ${m.profession}` : ""}
                            </p>}
                          </div>
                          {r.message && <p className="italic leading-relaxed text-sm" style={{ color: "#2F2F2F" }}>&ldquo;{r.message}&rdquo;</p>}
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <Button onClick={() => router.push(`/dashboard/profile/${m.id}`)} variant="outline"
                              className="h-10 px-5 rounded-xl font-bold gap-1.5" style={{ borderColor: "#C6D4C0", color: "#486B46" }}>
                              <Eye className="w-4 h-4" /> {t("dashboard.profile")}
                            </Button>
                            <Button onClick={() => handleRespondRequest(r, true)}
                              className="h-10 px-5 rounded-xl font-bold gap-1.5" style={{ background: "#486B46", color: "#FFFFFF" }}>
                              <Check className="w-4 h-4" /> {t("dashboard.accept")}
                            </Button>
                            <Button onClick={() => handleRespondRequest(r, false)} variant="outline"
                              className="h-10 px-5 rounded-xl font-bold gap-1.5" style={{ borderColor: "#E8E5E0", color: "#777777" }}>
                              <X className="w-4 h-4" /> {t("dashboard.decline")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "Messages":
        return (
          <div className="rounded-2xl overflow-hidden flex h-[calc(100vh-8rem)] min-h-[520px]"
            style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
            {/* Conversation list */}
            <div className={cn("w-full md:w-[320px] flex-col shrink-0", activeConvId !== null ? "hidden md:flex" : "flex")}
              style={{ borderRight: "1px solid #E8E5E0" }}>
              {showNewChat ? (
                <>
                  <div className="p-3 flex items-center gap-2" style={{ borderBottom: "1px solid #E8E5E0" }}>
                    <button onClick={() => { setShowNewChat(false); setUserQuery(""); setUserResults([]); }} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ color: "#777777" }}>
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#777777" }} />
                      <Input autoFocus value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder={t("dashboard.nameOrEmail")} className="pl-9 h-10 rounded-xl text-sm" style={{ background: "#FAF9F6", border: "none" }} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {userResults.length === 0 ? (
                      <p className="p-4 text-sm" style={{ color: "#777777" }}>{userQuery.trim().length < 2 ? t("dashboard.enterAtLeast2Chars") : t("dashboard.noMembersFound")}</p>
                    ) : userResults.map((u) => (
                      <button key={u.id} onClick={() => handleStartConversation(u)} className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                        onMouseEnter={e => e.currentTarget.style.background = "#FAF9F6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <Avatar className="w-10 h-10" style={{ border: "1px solid #E8E5E0" }}>
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{u.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: "#2F2F2F" }}>{u.name}</p>
                          <p className="text-xs truncate" style={{ color: "#777777" }}>{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3" style={{ borderBottom: "1px solid #E8E5E0" }}>
                    <Button onClick={() => setShowNewChat(true)} className="w-full h-10 font-bold rounded-xl gap-2 text-sm" style={{ background: "#486B46", color: "#FFFFFF" }}>
                      {t("dashboard.newConversation")}
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                      <div className="p-6 text-center">
                        <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#C6D4C0" }} />
                        <p className="text-sm" style={{ color: "#777777" }}>{t("dashboard.noConversationsYet")}</p>
                      </div>
                    ) : conversations.map((c) => {
                      const sel = activeConvId === c.id;
                      return (
                        <button key={c.id} onClick={() => openConversation(c.id)}
                          className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                          style={{ background: sel ? "#EEF5EC" : "transparent", borderLeft: sel ? "3px solid #486B46" : "3px solid transparent" }}>
                          <Avatar className="w-11 h-11 shrink-0" style={{ border: "1px solid #E8E5E0" }}>
                            <AvatarImage src={c.avatar || undefined} />
                            <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{c.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-bold text-sm truncate" style={{ color: sel ? "#486B46" : "#2F2F2F" }}>{c.name}</h4>
                              <span className="text-[10px] shrink-0" style={{ color: "#777777" }}>{c.when}</span>
                            </div>
                            <p className="text-xs truncate mt-0.5" style={{ color: (sel ? 0 : c.unread) > 0 ? "#2F2F2F" : "#777777" }}>{c.last}</p>
                          </div>
                          {c.unread > 0 && !sel && (
                            <span className="shrink-0 w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center"
                              style={{ background: "#486B46", color: "#FFFFFF" }}>{c.unread}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Chat thread */}
            <div className={cn("flex-1 flex-col min-w-0", activeConvId === null ? "hidden md:flex" : "flex")}>
              {activeConv ? (
                <>
                  <div className="flex items-center gap-3 p-3" style={{ borderBottom: "1px solid #E8E5E0" }}>
                    <button onClick={() => setActiveConvId(null)} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ color: "#777777" }}>
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => activeConv.otherId && router.push(`/dashboard/profile/${activeConv.otherId}`)} className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
                      <Avatar className="w-9 h-9 shrink-0" style={{ border: "1px solid #E8E5E0" }}>
                        <AvatarImage src={activeConv.avatar || undefined} />
                        <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{activeConv.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-left min-w-0">
                        <h4 className="font-bold text-sm truncate" style={{ color: "#2F2F2F" }}>{activeConv.name}</h4>
                        <p className="text-[11px]" style={{ color: partnerTyping ? "#486B46" : "#777777" }}>
                          {partnerTyping ? t("dashboard.typing") : t("dashboard.viewProfile")}
                        </p>
                      </div>
                    </button>
                  </div>
                  <div className="relative flex-1 min-h-0" style={{ background: "#FAF9F6" }}>
                    <VitrailPattern className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]" />
                    <div className="relative h-full overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {messages.length === 0 && !guideDismissed && <ChatGuide onDismiss={() => setGuideDismissed(true)} />}
                      {messages.length === 0 && guideDismissed && <p className="text-center text-xs py-8" style={{ color: "#777777" }}>{t("dashboard.sayHelloKindly")}</p>}
                      {messages.map((m) => (
                        <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[80%] rounded-2xl text-sm leading-relaxed overflow-hidden", m.imageUrl ? "p-1.5" : "px-4 py-2.5")}
                            style={m.from === "me"
                              ? { background: "#486B46", color: "#FFFFFF", borderBottomRightRadius: "6px" }
                              : { background: "#FFFFFF", border: "1px solid #E8E5E0", color: "#2F2F2F", borderBottomLeftRadius: "6px" }}>
                            {m.imageUrl && <a href={m.imageUrl} target="_blank" rel="noopener noreferrer"><img src={m.imageUrl} alt="Photo" className="rounded-xl max-h-56 w-auto object-cover" /></a>}
                            {m.text && <p className={cn(m.imageUrl && "px-2.5 pt-1.5")}>{m.text}</p>}
                            <span className={cn("block text-[9px] mt-1 text-right", m.imageUrl && "px-2.5 pb-1")}
                              style={{ color: m.from === "me" ? "rgba(255,255,255,0.6)" : "#777777" }}>{m.time}</span>
                          </div>
                        </div>
                      ))}
                      {partnerTyping && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#777777", animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#777777", animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#777777", animationDelay: "300ms" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Message input */}
                  <div className="relative" style={{ borderTop: "1px solid #E8E5E0" }}>
                    <AnimatePresence>
                      {showEmoji && (
                        <motion.div
                          ref={emojiPickerRef}
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-3 mb-2 w-[300px] sm:w-[340px] max-h-[320px] overflow-y-auto custom-scrollbar rounded-2xl z-20"
                          style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 8px 32px rgba(72,107,70,0.12)" }}
                        >
                          {EMOJI_CATEGORIES.map((group) => (
                            <div key={group.category} className="px-3 pt-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9CA3AF" }}>
                                {group.category}
                              </p>
                              <div className="grid grid-cols-7 gap-0.5 pb-1">
                                {group.emojis.map((e) => (
                                  <button key={e.char} type="button" onClick={() => insertEmoji(e.char)}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-colors hover:bg-[#F0FDF4]">
                                    <FluentEmoji char={e.char} url={e.url} className="w-6 h-6" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {pendingPreview && (
                      <div className="px-3 pt-3 flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img src={pendingPreview} alt="Aperçu" className="h-16 w-16 rounded-xl object-cover" style={{ border: "1px solid #E8E5E0" }} />
                          <button type="button" onClick={clearPendingImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                            style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", color: "#777777" }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    <form onSubmit={sendMessage} className="p-3 flex items-center gap-1.5">
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { handlePickImage(e.target.files?.[0]); e.target.value = ""; }} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                        style={{ color: "#777777" }}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                      </button>
                      <button type="button" onClick={() => setShowEmoji((v) => !v)}
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                        style={showEmoji ? { color: "#486B46", background: "#EEF5EC" } : { color: "#777777" }}>
                        <Smile className="w-4 h-4" />
                      </button>
                      <Input value={chatInput} onChange={(e) => handleChatInput(e.target.value)}
                        placeholder={pendingImage ? t("dashboard.captionPlaceholder") : t("dashboard.typeMessagePlaceholder")}
                        className="flex-1 h-10 rounded-full px-4 text-sm"
                        style={{ background: "#FAF9F6", border: "none" }} />
                      <Button type="submit" disabled={(!chatInput.trim() && !pendingImage) || uploading}
                        className="w-10 h-10 rounded-full p-0 shrink-0"
                        style={{ background: "#486B46", color: "#FFFFFF" }}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: "#EEF5EC" }}>
                    <MessageCircle className="w-8 h-8" style={{ color: "#486B46" }} />
                  </div>
                  <h3 className="font-headline text-xl font-bold mb-1" style={{ color: "#2F2F2F" }}>{t("dashboard.yourConversations")}</h3>
                  <p className="text-sm max-w-xs" style={{ color: "#777777" }}>{t("dashboard.selectOrStartConversation")}</p>
                </div>
              )}
            </div>
          </div>
        );

      case "Notifications":
        // Mark notifications as read when viewing
        if (unreadMeetingNotifs.length > 0) markMeetingNotifsRead();
        if (unreadBlogNotifs.length > 0) markBlogNotifsRead();
        if (unreadVerificationNotifs.length > 0) markVerificationNotifsRead();

        return (
          <div className="space-y-6">
            <TabHeader icon={Bell} title={t("dashboard.notificationsTitle")} subtitle={t("dashboard.notificationsSubtitle")} />

            {/* Verification status notifications */}
            {verificationNotifs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] px-1" style={{ color: "#486B46" }}>{t("dashboard.profileVerificationLabel")}</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                  {verificationNotifs.map((n) => {
                    const notifDate = new Date(n.created_at);
                    const formattedDate = notifDate.toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                    const isApproved = n.notification_type === "verification_approved";
                    return (
                      <div key={n.id} className="flex items-start gap-4 p-4 transition-colors"
                        style={{ borderLeft: n.is_read ? "3px solid transparent" : "3px solid #486B46" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: isApproved ? "#EEF5EC" : "#FEF2F2" }}>
                          <ShieldCheck className="w-5 h-5" style={{ color: isApproved ? "#38C172" : "#EF4444" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#2F2F2F" }}>{n.title}</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#4B5563" }}>{n.message}</p>
                          <p className="text-[10px] mt-1.5" style={{ color: "#9CA3AF" }}>{formattedDate}</p>
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: "#486B46" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meeting invitation notifications */}
            {meetingNotifs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] px-1" style={{ color: "#486B46" }}>{t("dashboard.videoMeetingInvitationsLabel")}</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                  {meetingNotifs.map((n) => {
                    const notifDate = new Date(n.created_at);
                    const formattedDate = notifDate.toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                    const typeIcon = n.notification_type === "created" ? Video
                      : n.notification_type === "cancelled" ? X
                      : n.notification_type === "rescheduled" ? Clock
                      : n.notification_type === "meet_invitation" ? Video
                      : n.notification_type === "event_notification" ? CalendarDays
                      : Bell;
                    const typeColor = n.notification_type === "created" ? "#38C172"
                      : n.notification_type === "cancelled" ? "#EF4444"
                      : n.notification_type === "rescheduled" ? "#8B5CF6"
                      : n.notification_type === "meet_invitation" ? "#2D5016"
                      : n.notification_type === "event_notification" ? "#F59E0B"
                      : "#486B46";
                    const typeBg = n.notification_type === "created" ? "#EEF5EC"
                      : n.notification_type === "cancelled" ? "#FEF2F2"
                      : n.notification_type === "rescheduled" ? "#F5F3FF"
                      : n.notification_type === "meet_invitation" ? "#EEF5EC"
                      : n.notification_type === "event_notification" ? "#FFFBEB"
                      : "#EEF5EC";

                    return (
                      <div key={n.id} className="flex items-start gap-4 p-4 transition-colors"
                        style={{ borderLeft: n.is_read ? "3px solid transparent" : "3px solid #486B46" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: typeBg }}>
                          {(() => { const Icon = typeIcon; return <Icon className="w-5 h-5" style={{ color: typeColor }} />; })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#2F2F2F" }}>{n.title}</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#4B5563" }}>{n.message}</p>
                          <p className="text-[10px] mt-1.5" style={{ color: "#9CA3AF" }}>{formattedDate}</p>
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: "#486B46" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message notifications */}
            {messageNotifs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] px-1" style={{ color: "#486B46" }}>{t("dashboard.newMessagesLabel")}</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                  {messageNotifs.map((c) => (
                    <button key={c.id} onClick={() => { setActiveTab("Messages"); openConversation(c.id); }}
                      className="w-full flex items-center gap-4 p-4 text-left transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = "#FAF9F6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <Avatar className="w-11 h-11 shrink-0" style={{ border: "1px solid #E8E5E0" }}>
                        <AvatarImage src={c.avatar || undefined} />
                        <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{c.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: "#2F2F2F" }}><span className="font-bold">{c.name}</span> {c.unread > 1 ? t("dashboard.sentYouMessages", { count: c.unread }) : t("dashboard.sentYouAMessage")}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color: "#777777" }}>{c.last}</p>
                      </div>
                      <span className="text-[11px] shrink-0" style={{ color: "#777777" }}>{c.when}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Blog article notifications */}
            {blogNotifs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] px-1" style={{ color: "#486B46" }}>{t("dashboard.blogArticlesLabel")}</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                  {blogNotifs.map((n) => {
                    const notifDate = new Date(n.created_at);
                    const formattedDate = notifDate.toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                    return (
                      <Link key={n.id} href={n.link || "/blog"} className="flex items-start gap-4 p-4 transition-colors"
                        style={{ borderLeft: n.is_read ? "3px solid transparent" : "3px solid #486B46" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FAF9F6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "#EEF5EC" }}>
                          {n.thumbnail_url ? <img src={n.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5" style={{ color: "#486B46" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#2F2F2F" }}>{n.title}</p>
                          <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "#4B5563" }}>{n.message}</p>
                          <p className="text-[10px] mt-1.5" style={{ color: "#9CA3AF" }}>{formattedDate}</p>
                        </div>
                        {!n.is_read && <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: "#486B46" }} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state when no notifications at all */}
            {meetingNotifs.length === 0 && messageNotifs.length === 0 && blogNotifs.length === 0 && verificationNotifs.length === 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
                {[
                  { icon: Heart, text: t("dashboard.viewActivityNotifsHere"), when: "" },
                ].map((n, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEF5EC" }}>
                      <n.icon className="w-5 h-5" style={{ color: "#486B46" }} />
                    </div>
                    <p className="flex-1 text-sm" style={{ color: "#2F2F2F" }}>{n.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "Premium":
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ background: "#EEF5EC", color: "#486B46", border: "1px solid #C6D4C0" }}>
                <Crown className="w-3.5 h-3.5" style={{ color: "#C6A15B" }} /> {t("dashboard.ourPlans")}
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-bold" style={{ color: "#2F2F2F" }}>{t("dashboard.elevateYourPath")}</h2>
              <p className="text-base" style={{ color: "#777777" }}>{t("dashboard.accessFullMeasure")}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { name: t("dashboard.planDiscoveryName"), price: t("dashboard.planFree"), period: "", accent: false, features: [t("dashboard.planFeatureBasicProfile"), t("dashboard.planFeature5Matches"), t("dashboard.planFeatureLimitedMessages"), t("dashboard.planFeaturePublicEvents")], cta: t("dashboard.planCurrentPlan"), current: true },
                { name: t("dashboard.planGrowthName"), price: "5,000", period: "FCFA/month", accent: true, features: [t("dashboard.planFeatureUnlimitedMatches"), t("dashboard.planFeatureUnlimitedMessages"), t("dashboard.planFeatureVerifiedProfile"), t("dashboard.planFeatureAdvancedFilters"), t("dashboard.planFeaturePrioritySupport")], cta: t("dashboard.planChooseGrowth"), current: false },
                { name: t("dashboard.planBlessingName"), price: "40,000", period: "FCFA/year", accent: false, badge: t("dashboard.planBadgeBest"), features: [t("dashboard.planFeatureAllPremium"), t("dashboard.planFeatureFreeCounseling"), t("dashboard.planFeatureVipEvents"), t("dashboard.planFeaturePriorityMatching"), t("dashboard.planFeatureSpiritualResources")], cta: t("dashboard.planChooseBlessing"), current: false },
              ].map((plan) => (
                <div key={plan.name} className="rounded-2xl p-6 sm:p-8 overflow-hidden relative"
                  style={{ background: plan.accent ? "linear-gradient(135deg, #FFFFFF 0%, #EEF5EC 100%)" : "#FFFFFF", border: `1px solid ${plan.accent ? "#C6D4C0" : "#E8E5E0"}`, boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline text-xl font-bold flex items-center gap-2" style={{ color: "#2F2F2F" }}>
                        {plan.accent && <Crown className="w-5 h-5" style={{ color: "#C6A15B" }} />}
                        {plan.name}
                      </h3>
                      {plan.badge && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: "#C6A15B", color: "#FFFFFF" }}>{plan.badge}</span>}
                    </div>
                    <div className="flex items-end gap-1.5">
                      <span className="font-headline text-4xl font-black" style={{ color: "#2F2F2F" }}>{plan.price}</span>
                      {plan.period && <span className="mb-2 text-sm" style={{ color: "#777777" }}>{plan.period}</span>}
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#2F2F2F" }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#EEF5EC" }}>
                            <Check className="w-3 h-3" style={{ color: "#486B46" }} />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button disabled={plan.current}
                      onClick={() => toast({ title: t("dashboard.toastSecurePaymentSoon") })}
                      className="w-full h-12 rounded-xl font-bold text-sm gap-2"
                      style={plan.accent ? { background: "#486B46", color: "#FFFFFF" } : { background: "#FAF9F6", color: "#777777" }}>
                      {plan.accent && <Crown className="w-4 h-4" />}
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "#777777" }}>
              <ShieldCheck className="w-4 h-4" style={{ color: "#486B46" }} /> {t("dashboard.securePaymentCancel")}
            </div>
          </div>
        );

      case "Profile":
      case "Profil":
        return (
          <div className="space-y-6">
            <TabHeader icon={Settings} title={t("dashboard.myProfileTitle")} subtitle={t("dashboard.myProfileSubtitle")} />
            <div className="rounded-2xl p-6 sm:p-8"
              style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
              {!editingProfile ? (
                <>
                  <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                    <div className="relative shrink-0">
                      <Avatar className="w-24 h-24 shadow-lg" style={{ border: "3px solid #E8E5E0" }}>
                        <AvatarImage src={myAvatar} />
                        <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>{displayInitial}</AvatarFallback>
                      </Avatar>
                      <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                        style={{ background: "#486B46", color: "#FFFFFF" }}>
                        {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      </button>
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { handlePickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h3 className="font-headline text-2xl font-bold" style={{ color: "#2F2F2F" }}>{displayName}</h3>
                        {verificationStatus === "verified" && profileCompletionPct === 100 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1" style={{ background: "#EEF5EC", color: "#486B46" }}>
                            <CheckCircle2 className="w-3 h-3" /> {t("dashboard.verifiedProfileBadge")}
                          </span>
                        )}
                        {verificationStatus === "under_review" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1" style={{ background: "#FFFBEB", color: "#D97706" }}>
                            <Clock className="w-3 h-3" /> {t("dashboard.verificationInProgress")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm flex items-center gap-1.5 justify-center sm:justify-start" style={{ color: "#777777" }}>
                        <MapPin className="w-3.5 h-3.5" style={{ color: "#486B46" }} /> {displayLocation}
                      </p>
                      {user?.email && <p className="text-xs" style={{ color: "#777777" }}>{user.email}</p>}
                    </div>
                    <Button onClick={startEditProfile} className="h-10 px-5 rounded-xl font-bold gap-1.5" style={{ background: "#486B46", color: "#FFFFFF" }}>
                      <Pencil className="w-3.5 h-3.5" /> {t("dashboard.edit")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline text-lg font-bold" style={{ color: "#2F2F2F" }}>
                      <Pencil className="w-4 h-4 inline mr-2" style={{ color: "#486B46" }} />
                      {t("dashboard.editMyProfile")}
                    </h3>
                    <button onClick={() => setEditingProfile(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: "#777777" }}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Identity section */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 pb-2" style={{ color: "#486B46", borderBottom: "1px solid #F0EDE8" }}>
                      {t("dashboard.sectionIdentity")}
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "#777777" }}>{t("dashboard.fullName")}</label>
                        <Input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder={t("dashboard.fullNamePlaceholder")} className="h-11 rounded-xl text-sm" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "#777777" }}>{t("dashboard.civilStatus")}</label>
                          <select value={profileForm.civilStatus} onChange={(e) => setProfileForm((f) => ({ ...f, civilStatus: e.target.value }))}
                            className="w-full h-11 rounded-xl px-4 text-sm" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0", color: "#2F2F2F" }}>
                            <option value="">{t("dashboard.select")}</option>
                            {[
                              { value: "Single", key: "civilStatusSingle" },
                              { value: "Divorced", key: "civilStatusDivorced" },
                              { value: "Widowed", key: "civilStatusWidowed" },
                              { value: "Separated", key: "civilStatusSeparated" },
                            ].map((o) => <option key={o.value} value={o.value}>{t(`dashboard.${o.key}`)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "#777777" }}>{t("dashboard.professionLabel")}</label>
                          <Input value={profileForm.profession} onChange={(e) => setProfileForm((f) => ({ ...f, profession: e.target.value }))}
                            placeholder={t("dashboard.professionPlaceholder")} className="h-11 rounded-xl text-sm" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location section */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 pb-2" style={{ color: "#486B46", borderBottom: "1px solid #F0EDE8" }}>
                      {t("dashboard.sectionLocation")}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "#777777" }}>{t("dashboard.city")}</label>
                        <Input value={profileForm.city} onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                          placeholder={t("dashboard.cityPlaceholder")} className="h-11 rounded-xl text-sm" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: "#777777" }}>{t("dashboard.country")}</label>
                        <Input value={profileForm.country} onChange={(e) => setProfileForm((f) => ({ ...f, country: e.target.value }))}
                          placeholder={t("dashboard.countryPlaceholder")} className="h-11 rounded-xl text-sm" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                      </div>
                    </div>
                  </div>

                  {/* Bio section */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 pb-2" style={{ color: "#486B46", borderBottom: "1px solid #F0EDE8" }}>
                      {t("dashboard.sectionAboutMe")}
                    </h4>
                    <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                      rows={4} placeholder={t("dashboard.bioPlaceholder")}
                      className="rounded-xl text-sm resize-none" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                  </div>

                  {/* Marriage vision */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 pb-2 flex items-center gap-2" style={{ color: "#486B46", borderBottom: "1px solid #F0EDE8" }}>
                      <Heart className="w-3.5 h-3.5" /> {t("dashboard.marriageVisionLabel")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {MARRIAGE_VALUES.map((v) => (
                        <button key={v.id} onClick={() => toggleProfileValue(v.id)}
                          className="px-4 py-2 rounded-full text-xs font-medium transition-all"
                          style={profileForm.marriageVision.includes(v.id)
                            ? { background: "#486B46", color: "#FFFFFF" }
                            : { background: "#F5F3F0", color: "#777777", border: "1px solid #E8E5E0" }}>
                          {profileForm.marriageVision.includes(v.id) ? "✓ " : ""}{v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: "1px solid #F0EDE8" }}>
                    <Button onClick={() => setEditingProfile(false)} variant="outline" className="h-10 px-5 rounded-xl font-bold text-sm"
                      style={{ borderColor: "#E8E5E0", color: "#777777" }}>
                      <X className="w-4 h-4 mr-1.5" /> {t("dashboard.cancel")}
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={savingProfile}
                      className="h-10 px-6 rounded-xl font-bold text-sm gap-2"
                      style={{ background: "#486B46", color: "#FFFFFF" }}>
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {t("dashboard.save")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {/* Questionnaire / Parcours de Foi */}
            {!editingProfile && getQuestionnaires(locale).map((q) => {
              const isExpanded = expandedQuestionnaire === q.key;
              const isEditing = editingQuestionnaire === q.key;
              const answers = isEditing ? localQAnswers : questionnaireAnswers;
              const allFields = q.sections.flatMap(s => s.fields);
              const filled = allFields.filter(f => {
                const v = answers[f.id];
                return v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
              }).length;
              return (
                <div key={q.key} className="rounded-2xl overflow-hidden"
                  style={{ background: "#FFFFFF", border: "1px solid #E8E5E0", boxShadow: "0 1px 3px rgba(72,107,70,0.04), 0 4px 16px rgba(72,107,70,0.06)" }}>
                  <button onClick={() => setExpandedQuestionnaire(isExpanded ? null : q.key)}
                    className="w-full flex items-center justify-between p-5 text-left hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
                        <BookOpen className="w-5 h-5" style={{ color: "#486B46" }} />
                      </div>
                      <div>
                        <h4 className="font-headline font-bold text-sm" style={{ color: "#2F2F2F" }}>{q.title}</h4>
                        <p className="text-xs" style={{ color: "#777777" }}>{q.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold" style={{ color: "#486B46" }}>{filled}/{allFields.length}</span>
                      <ChevronRight className={cn("w-5 h-5 transition-transform", isExpanded && "rotate-90")} style={{ color: "#777777" }} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5" style={{ borderTop: "1px solid #F0EDE8" }}>
                      {q.note && (
                        <div className="mt-4 mb-3 px-4 py-3 rounded-xl text-center" style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
                          <p className="text-xs font-semibold leading-relaxed" style={{ color: "#486B46" }}>
                            {q.note}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-4 mb-4">
                        {!isEditing ? (
                          <button onClick={() => startEditQuestionnaire(q.key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                            style={{ background: "#486B46", color: "#FFFFFF" }}>
                            <Pencil className="w-3.5 h-3.5" /> {t("dashboard.edit")}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => { setEditingQuestionnaire(null); setLocalQAnswers({}); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ border: "1px solid #E8E5E0", color: "#777777" }}>
                              <X className="w-3.5 h-3.5" /> {t("dashboard.cancel")}
                            </button>
                            <button onClick={handleSaveQuestionnaire} disabled={savingQuestionnaire}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "#486B46", color: "#FFFFFF" }}>
                              {savingQuestionnaire ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {t("dashboard.save")}
                            </button>
                          </>
                        )}
                      </div>
                      {q.sections.map((section) => (
                        <div key={section.key} className="mb-5">
                          <h5 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2" style={{ color: "#486B46" }}>
                            {section.title}
                            {section.private && <Lock className="w-3 h-3" style={{ color: "#C6A15B" }} />}
                          </h5>
                          {section.intro && <p className="text-[11px] italic mb-3" style={{ color: "#777777" }}>{section.intro}</p>}
                          <div className="space-y-3">
                            {section.fields.map((field) => {
                              const value = answers[field.id];
                              if (isEditing) {
                                return (
                                  <div key={field.id}>
                                    <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "#777777" }}>{field.label}</label>
                                    {(field.type === "text" || field.type === "agerange") ? (
                                      <Input value={value || ""} onChange={(e) => handleQFieldChange(field.id, e.target.value)}
                                        placeholder={field.placeholder || field.label}
                                        className="h-10 rounded-xl text-sm" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                                    ) : field.type === "textarea" ? (
                                      <>
                                        <Textarea value={value || ""} onChange={(e) => handleQFieldChange(field.id, e.target.value)}
                                          rows={3} placeholder={field.placeholder || field.label}
                                          className="rounded-xl text-sm resize-none" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }} />
                                        {field.help && <p className="text-[11px] mt-1" style={{ color: "#999" }}>{field.help}</p>}
                                      </>
                                    ) : field.type === "single" || field.type === "qcm" ? (
                                      <div className="space-y-1.5">
                                        {field.options?.map((opt) => (
                                          <button key={opt} onClick={() => handleQFieldChange(field.id, opt)}
                                            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                                            style={value === opt ? { background: "#486B46", color: "#FFFFFF" } : { background: "#F5F3F0", color: "#2F2F2F" }}>
                                            {opt}
                                          </button>
                                        ))}
                                      </div>
                                    ) : field.type === "multi" ? (
                                      <>
                                        <div className="flex flex-wrap gap-2">
                                          {field.options?.map((opt) => {
                                            const selected = Array.isArray(value) && value.includes(opt);
                                            const maxReached = !!field.max && !selected && (localQAnswers[field.id]?.length || 0) >= field.max;
                                            return (
                                              <button key={opt} disabled={maxReached} onClick={() => handleQMultiToggle(field.id, opt, field.max)}
                                                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={selected ? { background: "#486B46", color: "#FFFFFF" } : { background: "#F5F3F0", color: "#777777", border: "1px solid #E8E5E0" }}>
                                                {selected ? "✓ " : ""}{opt}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {field.help && <p className="text-[11px] mt-1" style={{ color: "#999" }}>{field.help}</p>}
                                      </>
                                    ) : null}
                                  </div>
                                );
                              }
                              // Display mode
                              const displayVal = Array.isArray(value) ? value.join(", ") : String(value || "");
                              return (
                                <div key={field.id} className="py-2" style={{ borderBottom: "1px solid #F5F3F0" }}>
                                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#777777" }}>{field.label}</p>
                                  {displayVal && displayVal !== "" ? (
                                    <p className="text-sm" style={{ color: "#2F2F2F" }}>{displayVal}</p>
                                  ) : (
                                    <p className="text-sm italic" style={{ color: "#BBBBBB" }}>{t("dashboard.notSpecified")}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Logout */}
            {!editingProfile && (
              <Button onClick={handleLogout} variant="outline"
                className="w-full h-12 rounded-xl font-bold"
                style={{ borderColor: "#E8E5E0", color: "#777777" }}>
                {t("dashboard.logOut")}
              </Button>
            )}
          </div>
        );

      default:
        return <div className="py-20 text-center" style={{ color: "#777777" }}>{t("dashboard.contentUnderDevelopment")}</div>;
    }
  }
}