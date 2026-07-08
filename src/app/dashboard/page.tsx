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
  Home, 
  Search, 
  Users, 
  Heart, 
  MessageCircle, 
  Crown, 
  Zap, 
  Star,
  MapPin,
  Briefcase,
  X,
  ChevronRight,
  Eye,
  BookOpen,
  ArrowUpRight,
  Quote,
  ScrollText,
  Menu,
  Check,
  Clock,
  Bell,
  Lock,
  Settings,
  Pencil,
  Filter,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Camera,
  HeartHandshake,
  Hash,
  Share2,
  Video,
  CalendarDays,
  Church,
  Bookmark,
  ThumbsUp,
  Send,
  ArrowLeft,
  Smile,
  ImagePlus,
  Loader2,
  Trash2,
  UserPlus
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
import { computeMatchScore, rankByMatch } from "@/lib/matching";
import { getMyOnboarding } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import {
  upsertMyProfile,
  searchUsers,
  listConversations,
  getMessages,
  sendChatMessage,
  uploadChatImage,
  uploadAvatar,
  markConversationRead,
  startConversation,
  CHAT_EMOJIS,
  type ChatConversation,
  type ChatMessage,
  type DirectoryUser,
  type MemberProfile,
} from "@/lib/chat";
import {
  listMembers,
  listMyFriendships,
  listIncomingRequests,
  sendFriendRequest,
  respondToRequest,
  buildRelationMap,
  listFavorites,
  setFavorite,
  listVisitors,
  type RelationStatus,
  type FriendRequest,
  type Visitor,
} from "@/lib/social";
import { motion, AnimatePresence } from "framer-motion";
import { Monogram, Flourish, VitrailPattern } from "@/components/ornaments";
import { ImposingFloralCorners, ImposingFloralSide } from "@/components/garden";

type Tab = "Accueil" | "Découvrir" | "Visiteurs" | "Favoris" | "Demandes" | "Premium" | "Messages" | "Notifications" | "Profil";

const TABS: Tab[] = ["Accueil", "Découvrir", "Visiteurs", "Favoris", "Demandes", "Premium", "Messages", "Notifications", "Profil"];

type FeedPost = {
  id: string;
  type: string;
  name: string;
  avatar?: string | null;
  when: string;
  text: string;
  image?: string | null;
  likes: number;
  comments: number;
  mine?: boolean;
  createdAt?: number;
};

const EDIT_WINDOW_MS = 10 * 60 * 1000; // modification possible pendant 10 min

type ComposerType = "Publication" | "Témoignage" | "Prière";

const CHRISTIAN_QUOTES = [
  { text: "L'amour est patient, il est plein de bonté.", ref: "1 Corinthiens 13:4" },
  { text: "Que tout ce que vous faites se fasse avec amour.", ref: "1 Corinthiens 16:14" },
  { text: "Celui que Dieu a choisi, nul ne peut l'écarter.", ref: "Proverbe de Sagesse" },
  { text: "Confie-toi en l'Éternel de tout ton cœur.", ref: "Proverbes 3:5" },
  { text: "L'Éternel est ma force et mon bouclier.", ref: "Psaume 28:7" },
  { text: "Tout est possible à celui qui croit.", ref: "Marc 9:23" },
  { text: "La joie de l'Éternel sera votre force.", ref: "Néhémie 8:10" },
  { text: "Je puis tout par celui qui me fortifie.", ref: "Philippiens 4:13" },
  { text: "Le Seigneur est mon berger, je ne manquerai de rien.", ref: "Psaume 23:1" },
  { text: "Fais de l'Éternel tes délices, et il te donnera ce que ton cœur désire.", ref: "Psaume 37:4" }
];

// 100 contacts fictifs (voir src/lib/profiles.ts)
const DISCOVER_PROFILES = PROFILES;

const DISCOVER_FILTERS = ["Tous", "Proches de moi", "Nouveaux profils", "Affinité élevée", "Vérifiés"];

const VISITORS = [
  { id: 3, name: "Ndeye M.", age: 20, location: "Diourbel", when: "Il y a 2h", image: "https://picsum.photos/seed/ndeye/200/200", locked: false },
  { id: 5, name: "Aïcha S.", age: 22, location: "Abidjan", when: "Il y a 5h", image: "https://picsum.photos/seed/aicha/200/200", locked: false },
  { id: 6, name: "Grâce K.", age: 24, location: "Yaoundé", when: "Hier", image: "https://picsum.photos/seed/grace/200/200", locked: true },
  { id: 7, name: "Esther M.", age: 26, location: "Kinshasa", when: "Hier", image: "https://picsum.photos/seed/esther/200/200", locked: true },
  { id: 8, name: "Ruth B.", age: 23, location: "Cotonou", when: "Il y a 2 jours", image: "https://picsum.photos/seed/ruth/200/200", locked: true },
];

const REQUESTS = [
  { id: 2, name: "Awa N.", age: 19, location: "Dakar", profession: "Responsable", match: "90%", message: "Bonjour, ta vision du foyer m'a touchée. J'aimerais échanger.", image: "https://picsum.photos/seed/awa/200/200" },
  { id: 4, name: "Fama N.", age: 20, location: "Diourbel", profession: "Étudiant", match: "86%", message: "Que la paix soit avec toi. Ton profil reflète de belles valeurs.", image: "https://picsum.photos/seed/fama/200/200" },
];

const CONVERSATIONS = [
  { id: 1, name: "Daba D.", last: "Merci pour ton message, c'était très touchant 🙏", when: "10:42", unread: 2, online: true, image: "https://picsum.photos/seed/daba/200/200" },
  { id: 3, name: "Ndeye M.", last: "Quelle est ta vision du foyer chrétien ?", when: "Hier", unread: 0, online: false, image: "https://picsum.photos/seed/ndeye/200/200" },
  { id: 6, name: "Grâce K.", last: "Amen ! Que Dieu bénisse ta journée.", when: "Lun", unread: 0, online: true, image: "https://picsum.photos/seed/grace/200/200" },
];

type ChatMsg = { id?: string; from: "me" | "them"; text: string; time: string };

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const CHAT_THREADS: Record<number, ChatMsg[]> = {
  1: [
    { from: "them", text: "Bonjour ! J'ai été touchée par ta vision du foyer. 🙏", time: "10:30" },
    { from: "me", text: "Shalom Daba ! Merci, ta sincérité transparaît dans ton profil.", time: "10:34" },
    { from: "them", text: "Quel est le verset qui guide ta vie en ce moment ?", time: "10:38" },
    { from: "me", text: "Proverbes 3:5 — « Confie-toi en l'Éternel de tout ton cœur. » Et toi ?", time: "10:40" },
    { from: "them", text: "Merci pour ton message, c'était très touchant 🙏", time: "10:42" },
  ],
  3: [
    { from: "them", text: "Que la paix soit avec toi 🌿", time: "Hier" },
    { from: "them", text: "Quelle est ta vision du foyer chrétien ?", time: "Hier" },
  ],
  6: [
    { from: "me", text: "Bonjour Grâce, comment s'est passé ton culte dimanche ?", time: "Lun" },
    { from: "them", text: "Amen ! Que Dieu bénisse ta journée.", time: "Lun" },
  ],
};

const AUTO_REPLIES = [
  "Amen, c'est une belle parole 🙏",
  "Merci de partager cela avec moi.",
  "Que Dieu te bénisse abondamment !",
  "J'apprécie beaucoup nos échanges.",
  "C'est exactement ma pensée également 😊",
];

const NOTIFICATIONS = [
  { id: 1, icon: Heart, color: "text-primary", bg: "bg-secondary/10", text: "Daba D. a aimé votre profil.", when: "Il y a 1h" },
  { id: 2, icon: Eye, color: "text-secondary", bg: "bg-secondary/10", text: "3 nouvelles personnes ont visité votre profil.", when: "Il y a 3h" },
  { id: 3, icon: Star, color: "text-primary", bg: "bg-secondary/10", text: "Awa N. vous a envoyé une demande d'alliance.", when: "Hier" },
  { id: 4, icon: MessageCircle, color: "text-primary", bg: "bg-secondary/10", text: "Nouveau message de Ndeye M.", when: "Hier" },
  { id: 5, icon: BookOpen, color: "text-secondary", bg: "bg-secondary/10", text: "Un nouvel article de l'Académie est disponible.", when: "Il y a 2 jours" },
];

const PREMIUM_PLANS = [
  {
    name: "Découverte",
    price: "0",
    period: "Gratuit",
    accent: false,
    features: [
      { label: "Créer votre profil sacré", ok: true },
      { label: "Découvrir des profils alignés", ok: true },
      { label: "Envoyer des demandes d'alliance", ok: true },
      { label: "Voir qui visite votre profil", ok: false },
      { label: "Messages illimités", ok: false },
      { label: "Conseils pastoraux privés", ok: false },
    ],
    cta: "Votre offre actuelle",
    current: true,
  },
  {
    name: "Eden Or",
    price: "9 900",
    period: "/ mois",
    accent: true,
    badge: "-40%",
    features: [
      { label: "Tout de l'offre Découverte", ok: true },
      { label: "Voir tous vos visiteurs", ok: true },
      { label: "Messages illimités", ok: true },
      { label: "Visibilité accrue (Boost)", ok: true },
      { label: "Badge profil vérifié", ok: true },
      { label: "Conseils pastoraux privés", ok: true },
    ],
    cta: "S'élever vers l'Or",
    current: false,
  },
];

// ── Contenu chrétien (versets, dévotions, communauté, événements) ──────────
const STORIES = [
  { label: "Verset du jour", icon: Quote, ring: "from-primary to-secondary" },
  { label: "Le mariage", icon: HeartHandshake, ring: "from-secondary to-primary" },
  { label: "Vos questions", icon: BookOpen, ring: "from-primary to-primary" },
  { label: "Témoignages", icon: Church, ring: "from-secondary to-secondary" },
  { label: "Fiançailles", icon: Heart, ring: "from-primary to-secondary" },
  { label: "Événements", icon: CalendarDays, ring: "from-secondary to-primary" },
];

// Paroles du jour — une rotation quotidienne (sélection déterministe selon la date).
const DAILY_VERSES = [
  { text: "Que le mariage soit honoré de tous, et le lit conjugal exempt de souillure.", ref: "Hébreux 13:4" },
  { text: "L'amour est patient, il est plein de bonté.", ref: "1 Corinthiens 13:4" },
  { text: "Ce que Dieu a uni, que l'homme ne le sépare point.", ref: "Matthieu 19:6" },
  { text: "Il n'est pas bon que l'homme soit seul.", ref: "Genèse 2:18" },
  { text: "Deux valent mieux qu'un… si l'un tombe, l'autre le relève.", ref: "Ecclésiaste 4:9-10" },
  { text: "Que l'amour soit sans hypocrisie.", ref: "Romains 12:9" },
  { text: "Au-dessus de tout, revêtez-vous de l'amour, lien de la perfection.", ref: "Colossiens 3:14" },
  { text: "Celui qui trouve une femme trouve le bonheur ; c'est une grâce de l'Éternel.", ref: "Proverbes 18:22" },
  { text: "Maris, aimez vos femmes comme Christ a aimé l'Église.", ref: "Éphésiens 5:25" },
  { text: "Soumettez-vous les uns aux autres dans la crainte de Christ.", ref: "Éphésiens 5:21" },
  { text: "L'amour couvre une multitude de péchés.", ref: "1 Pierre 4:8" },
  { text: "Si l'Éternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain.", ref: "Psaume 127:1" },
  { text: "Réjouis-toi avec la femme de ta jeunesse.", ref: "Proverbes 5:18" },
  { text: "Confie-toi en l'Éternel de tout ton cœur.", ref: "Proverbes 3:5" },
  { text: "L'amour ne périt jamais.", ref: "1 Corinthiens 13:8" },
];

// Verset par défaut (avant le calcul de la date côté client — évite tout décalage d'hydratation).
const VERSE_OF_DAY = DAILY_VERSES[0];

// Actualités & enseignements sur le mariage
const DEVOTIONALS = [
  {
    id: "alliance-ou-contrat",
    category: "Enseignement",
    icon: BookOpen,
    title: "Le mariage chrétien : une alliance, pas un simple contrat",
    excerpt: "Là où le monde voit un accord révocable, la Bible présente le mariage comme une alliance sacrée devant Dieu. Comprendre cette différence change tout dans la manière d'aimer.",
    verse: "Malachie 2:14",
    image: "/couple-1030744_640.jpg",
    readTime: "5 min",
    likes: 512,
    comments: 73,
  },
  {
    id: "egalement-unis",
    category: "Question de couple",
    icon: HeartHandshake,
    title: "Peut-on épouser quelqu'un qui n'a pas la même foi ?",
    excerpt: "« Ne formez pas un attelage disparate avec les non-croyants. » Une question récurrente, abordée avec nuance, amour de la vérité et sagesse pastorale.",
    verse: "2 Corinthiens 6:14",
    image: "/Couple-Chretien_1.png",
    readTime: "6 min",
    likes: 689,
    comments: 128,
  },
  {
    id: "argent-couple",
    category: "Vie de couple",
    icon: BookOpen,
    title: "Gérer l'argent à deux : ce que dit la Bible sur les finances du foyer",
    excerpt: "Le désaccord financier est l'une des premières causes de tension conjugale. Voici des principes bibliques pour bâtir un foyer uni autour des finances.",
    verse: "Luc 14:28",
    image: "/couple-mixed-chretien.jpg",
    readTime: "7 min",
    likes: 341,
    comments: 52,
  },
];

// Communauté : témoignages & questions sur le mariage
const COMMUNITY_FEED = [
  {
    id: "temoignage-1",
    type: "Témoignage",
    name: "Joseph & Marie",
    avatar: "https://picsum.photos/seed/josephmarie/100/100",
    when: "Il y a 3 h",
    text: "Rencontrés ici il y a 14 mois. Après une période de connaissance dans la prière et l'accompagnement de notre pasteur, nous célébrons notre mariage le mois prochain. Gloire à Dieu pour Eden ! 🙏💍",
    image: "https://picsum.photos/seed/wedding1/800/500",
    likes: 1290,
    comments: 142,
  },
  {
    id: "question-1",
    type: "Question",
    name: "David K.",
    avatar: "https://picsum.photos/seed/davidk/100/100",
    when: "Il y a 5 h",
    text: "Question à la communauté : combien de temps dure une période de fiançailles saine selon vous ? Comment vivre ce temps dans la pureté tout en se préparant sérieusement au mariage ?",
    image: null,
    likes: 274,
    comments: 96,
  },
  {
    id: "temoignage-2",
    type: "Témoignage",
    name: "Esther & Daniel",
    avatar: "https://picsum.photos/seed/estherdaniel/100/100",
    when: "Hier",
    text: "Mariés depuis 2 ans aujourd'hui ! Nos différences culturelles auraient pu nous séparer, mais Christ au centre a tout transformé en richesse. Persévérez, le temps de Dieu est parfait. ❤️",
    image: "https://picsum.photos/seed/wedding2/800/500",
    likes: 980,
    comments: 87,
  },
];

const EVENTS = [
  { id: 1, title: "Préparation au mariage (cycle)", date: "Sam. 28 juin · 19h", mode: "En ligne", icon: BookOpen, attendees: 214 },
  { id: 2, title: "Webinaire : Bâtir un foyer sur le Roc", date: "Mar. 1 juil. · 20h", mode: "Zoom", icon: Video, attendees: 487 },
  { id: 3, title: "Retraite des couples & célibataires", date: "12-14 juil.", mode: "Présentiel", icon: Church, attendees: 96 },
];

const TOPICS = [
  { tag: "MariageChrétien", posts: "3,1k publications" },
  { tag: "QuestionDeCouple", posts: "2,2k publications" },
  { tag: "FiançaillesSaintes", posts: "1,5k publications" },
  { tag: "FoyerSurLeRoc", posts: "1,2k publications" },
  { tag: "Témoignages", posts: "1,0k publications" },
];

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Accueil");
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);
  const [dailyQuote, setDailyQuote] = useState<{text: string, ref: string} | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [discoverFilter, setDiscoverFilter] = useState("Tous");
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
  const chatChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const lastTypingRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fil d'actualité "Accueil" + composition de publication
  const [feed, setFeed] = useState<FeedPost[]>(COMMUNITY_FEED);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<ComposerType>("Publication");
  const [composerText, setComposerText] = useState("");
  const [composerImage, setComposerImage] = useState<string | null>(null);
  const composerImageRef = useRef<HTMLInputElement | null>(null);

  // Gestion de "Mes publications"
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [editPostImage, setEditPostImage] = useState<string | null>(null);

  // Conversation à ouvrir automatiquement (deep-link ?conv= depuis une fiche profil)
  const [pendingConv, setPendingConv] = useState<string | null>(null);

  // Réseau social réel (membres, relations, demandes d'amitié) — Supabase
  const [discoverMembers, setDiscoverMembers] = useState<MemberProfile[]>([]);
  const [relations, setRelations] = useState<Record<string, { status: RelationStatus; requestId: string }>>({});
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteMembers, setFavoriteMembers] = useState<MemberProfile[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  const meId = user?.id || "";
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);
  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const messageNotifs = conversations.filter((c) => c.unread > 0);

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
      toast({ title: "Réservé aux amis 🙏", description: `Vous devez d'abord être amis avec ${other.name} pour lui écrire. Envoyez-lui une demande depuis son profil.`, variant: "destructive" });
      return;
    }
    setShowNewChat(false);
    setUserQuery("");
    setUserResults([]);
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

    // Avec image en attente : on upload puis on envoie (texte = légende)
    if (pendingImage) {
      setUploading(true);
      const res = await uploadChatImage(pendingImage, activeConvId);
      setUploading(false);
      if (res.error || !res.url) {
        toast({ title: "Échec de l'envoi", description: res.error || "Réessayez.", variant: "destructive" });
        return;
      }
      const sentImg = await sendChatMessage(activeConvId, text, res.url);
      if (sentImg.error) { notifySendError(sentImg.error); return; }
      if (sentImg.message) appendMessage(sentImg.message);
      clearPendingImage();
      setChatInput("");
      loadConversations();
      return;
    }

    // Message texte simple
    setChatInput("");
    const sent = await sendChatMessage(activeConvId, text);
    if (sent.error) {
      setChatInput(text); // on restaure le texte pour ne pas le perdre
      notifySendError(sent.error);
      return;
    }
    if (sent.message) appendMessage(sent.message);
    loadConversations();
  };

  // Ajoute un message localement (évite les doublons avec le temps réel)
  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
  };

  const notifySendError = (error: string) => {
    // Refus « amis seulement » → message doux et encourageant (pas une erreur rouge)
    if (/row-level|policy|not_friends|permission/i.test(error)) {
      const name = activeConv?.name || "ce membre";
      toast({
        title: "Devenez amis pour discuter 🤝",
        description: `Pour échanger avec ${name}, envoyez-lui une demande d'alliance. La conversation s'ouvrira dès qu'elle sera acceptée.`,
      });
      return;
    }
    // Vraie erreur technique → style d'alerte
    toast({ title: "Message non envoyé", description: error, variant: "destructive" });
  };

  // Sélection d'une image : on la met en attente (aperçu) au lieu de l'envoyer directement
  const handlePickImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format non supporté", description: "Veuillez choisir une image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image trop lourde", description: "Maximum 5 Mo.", variant: "destructive" });
      return;
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const startEditProfile = () => {
    setProfileForm({
      name: user?.name || "",
      city: user?.city || "",
      country: user?.country || "",
      civilStatus: user?.civilStatus || "",
      profession: user?.profession || "",
      bio: user?.bio || "",
      marriageVision: user?.marriageVision || [],
    });
    setEditingProfile(true);
  };

  const toggleProfileValue = (id: string) => {
    setProfileForm((prev) => {
      const current = prev.marriageVision;
      if (current.includes(id)) return { ...prev, marriageVision: current.filter((v) => v !== id) };
      if (current.length >= 3) {
        toast({ title: "3 valeurs maximum", description: "Désélectionnez-en une pour en choisir une autre." });
        return prev;
      }
      return { ...prev, marriageVision: [...current, id] };
    });
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast({ title: "Nom requis", description: "Veuillez indiquer votre prénom.", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    const res = await updateProfile({
      name: profileForm.name.trim(),
      city: profileForm.city.trim(),
      country: profileForm.country.trim(),
      civilStatus: profileForm.civilStatus,
      profession: profileForm.profession.trim(),
      bio: profileForm.bio.trim(),
      marriageVision: profileForm.marriageVision,
    });
    setSavingProfile(false);
    if (!res.ok) {
      toast({ title: "Échec", description: res.error, variant: "destructive" });
      return;
    }
    setUser(res.user); // déclenche l'upsert annuaire + rechargement
    setEditingProfile(false);
    toast({ title: "Profil mis à jour 🙏", description: "Vos informations ont été enregistrées." });
  };

  const handlePickAvatar = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format non supporté", description: "Veuillez choisir une image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image trop lourde", description: "Maximum 5 Mo.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    const up = await uploadAvatar(file, user.id || "anon");
    if (up.error || !up.url) {
      setUploadingAvatar(false);
      toast({ title: "Échec de l'envoi", description: up.error || "Réessayez.", variant: "destructive" });
      return;
    }
    const res = await updateProfile({ avatar_url: up.url });
    setUploadingAvatar(false);
    if (!res.ok) {
      toast({ title: "Échec", description: res.error, variant: "destructive" });
      return;
    }
    setUser(res.user);
    toast({ title: "Photo mise à jour 🙏", description: "Votre nouvelle photo de profil est en ligne." });
  };

  const displayName = user?.name || "Celeste";
  const displayInitial = displayName.charAt(0).toUpperCase();
  const myAvatar = user?.avatar_url || undefined;
  const displayLocation = user ? [user.city, user.country].filter(Boolean).join(", ") || "Profil Or" : "Kolda, SN";

  // ===== Réseau social réel (Supabase) =====
  const loadSocial = async () => {
    if (!meId) return;
    setSocialLoading(true);
    const [members, friendships, incoming, favs, vis] = await Promise.all([
      listMembers(meId),
      listMyFriendships(meId),
      listIncomingRequests(meId),
      listFavorites(meId),
      listVisitors(meId),
    ]);
    // On affiche en priorité le sexe opposé (logique de rencontre), sinon tout le monde.
    const opposite = user?.gender === "homme" ? "femme" : user?.gender === "femme" ? "homme" : null;
    const filtered = opposite ? members.filter((m) => !m.gender || m.gender === opposite) : members;
    // Classement par affinité (matching) — les meilleurs profils en premier.
    setDiscoverMembers(user ? rankByMatch(user, filtered) : filtered);
    setRelations(buildRelationMap(meId, friendships));
    setIncomingRequests(incoming);
    setFavoriteMembers(favs);
    setFavoriteIds(new Set(favs.map((m) => m.id)));
    setVisitors(vis);
    setSocialLoading(false);
  };

  const handleToggleFavorite = async (member: MemberProfile) => {
    const isFav = favoriteIds.has(member.id);
    // Mise à jour optimiste
    setFavoriteIds((prev) => { const n = new Set(prev); isFav ? n.delete(member.id) : n.add(member.id); return n; });
    setFavoriteMembers((prev) => (isFav ? prev.filter((m) => m.id !== member.id) : [member, ...prev]));
    const res = await setFavorite(member.id, !isFav);
    if (!res.ok) {
      setFavoriteIds((prev) => { const n = new Set(prev); isFav ? n.add(member.id) : n.delete(member.id); return n; });
      setFavoriteMembers((prev) => (isFav ? [member, ...prev] : prev.filter((m) => m.id !== member.id)));
      toast({ title: "Échec", description: res.error || "Réessayez.", variant: "destructive" });
    }
  };

  const handleAddFriend = async (member: MemberProfile) => {
    setRelations((prev) => ({ ...prev, [member.id]: { status: "pending_out", requestId: prev[member.id]?.requestId || "" } }));
    const res = await sendFriendRequest(member.id);
    if (!res.ok) {
      setRelations((prev) => { const n = { ...prev }; delete n[member.id]; return n; });
      toast({ title: "Échec", description: res.error || "Réessayez.", variant: "destructive" });
      return;
    }
    toast({ title: "Invitation envoyée 🙏", description: `${member.name} recevra votre demande d'alliance.` });
  };

  const handleRespondRequest = async (req: FriendRequest, accept: boolean) => {
    const res = await respondToRequest(req.id, accept);
    if (!res.ok) {
      toast({ title: "Échec", description: res.error || "Réessayez.", variant: "destructive" });
      return;
    }
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
    setRelations((prev) => ({ ...prev, [req.requester.id]: { status: accept ? "friends" : "declined", requestId: req.id } }));
    toast({
      title: accept ? "Alliance acceptée 🙏" : "Demande déclinée",
      description: accept
        ? `Vous pouvez désormais échanger avec ${req.requester.name}.`
        : `La demande de ${req.requester.name} a été retirée de votre liste.`,
    });
  };

  const openComposer = (type: ComposerType) => {
    setComposerType(type);
    setComposerOpen(true);
  };

  const handleComposerImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format non supporté", description: "Veuillez choisir une image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image trop lourde", description: "Maximum 5 Mo.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setComposerImage(reader.result as string);
      setComposerOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const resetComposer = () => {
    setComposerOpen(false);
    setComposerText("");
    setComposerImage(null);
    setComposerType("Publication");
  };

  const publishPost = () => {
    if (!composerText.trim() && !composerImage) {
      toast({ title: "Rien à publier", description: "Écrivez un message ou ajoutez une photo.", variant: "destructive" });
      return;
    }
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      type: composerType,
      name: displayName,
      avatar: myAvatar ?? null,
      when: "À l'instant",
      text: composerText.trim(),
      image: composerImage,
      likes: 0,
      comments: 0,
      mine: true,
      createdAt: Date.now(),
    };
    setFeed((prev) => [newPost, ...prev]);
    resetComposer();
    toast({ title: "Publication partagée 🙏", description: "Votre message apparaît dans le fil de la communauté." });
  };

  // ===== Gestion de mes publications =====
  const myPosts = feed.filter((p) => p.mine);
  const canEditPost = (p: FeedPost) => !!p.createdAt && Date.now() - p.createdAt < EDIT_WINDOW_MS;

  const deletePost = (id: string) => {
    if (!window.confirm("Supprimer définitivement cette publication ?")) return;
    setFeed((prev) => prev.filter((p) => p.id !== id));
    if (editingPostId === id) cancelEditPost();
    toast({ title: "Publication supprimée", description: "Votre publication a été retirée du fil." });
  };

  const startEditPost = (p: FeedPost) => {
    if (!canEditPost(p)) {
      toast({ title: "Modification expirée", description: "Le délai de 10 minutes est dépassé. Vous pouvez seulement la supprimer.", variant: "destructive" });
      return;
    }
    setEditingPostId(p.id);
    setEditPostText(p.text);
    setEditPostImage(p.image ?? null);
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditPostText("");
    setEditPostImage(null);
  };

  const saveEditPost = () => {
    if (!editingPostId) return;
    const target = feed.find((p) => p.id === editingPostId);
    if (target && !canEditPost(target)) {
      toast({ title: "Modification expirée", description: "Le délai de 10 minutes est dépassé.", variant: "destructive" });
      cancelEditPost();
      return;
    }
    if (!editPostText.trim() && !editPostImage) {
      toast({ title: "Publication vide", description: "Ajoutez un texte ou une photo.", variant: "destructive" });
      return;
    }
    setFeed((prev) => prev.map((p) => (p.id === editingPostId ? { ...p, text: editPostText.trim(), image: editPostImage, when: "Modifié à l'instant" } : p)));
    cancelEditPost();
    toast({ title: "Publication modifiée ✍️", description: "Vos changements ont été enregistrés." });
  };

  useEffect(() => {
    // Parole du jour : index basé sur le jour de l'année → change chaque jour, stable dans la journée.
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    setDailyQuote(DAILY_VERSES[dayOfYear % DAILY_VERSES.length]);
    getSession().then(setUser);
    // Ouverture directe d'un onglet via ?tab=Messages (deep-link depuis d'autres pages)
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t && (TABS as string[]).includes(t)) setActiveTab(t as Tab);
    const conv = params.get("conv");
    if (conv) setPendingConv(conv);
  }, []);

  // Ouvre automatiquement la conversation ciblée une fois l'utilisateur chargé
  useEffect(() => {
    if (!pendingConv || !meId) return;
    setActiveTab("Messages");
    openConversation(pendingConv);
    loadConversations();
    setPendingConv(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingConv, meId]);

  // Enregistre le profil dans l'annuaire + charge les conversations dès qu'on est authentifié
  useEffect(() => {
    if (!user?.id) return;
    upsertMyProfile(user).then((r) => {
      if (r.error) toast({ title: "Annuaire indisponible", description: r.error, variant: "destructive" });
      else loadSocial();
    });
    loadConversations();
    // Parcours d'onboarding : on y dirige les nouveaux membres (sauf s'ils ont choisi « Passer »).
    getMyOnboarding().then(({ completed }) => {
      const skipped = typeof window !== "undefined" && localStorage.getItem("eden_onboarding_skipped") === "1";
      if (!completed && !skipped) router.replace("/onboarding");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Recharge la liste (conversations + non-lus → notifications) au passage sur Messages/Notifications/Accueil
  useEffect(() => {
    if (activeTab === "Messages" || activeTab === "Notifications" || activeTab === "Accueil") loadConversations();
    if (["Découvrir", "Demandes", "Notifications", "Favoris", "Visiteurs", "Accueil"].includes(activeTab)) loadSocial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Recherche d'utilisateurs (annuaire) pour démarrer une conversation
  useEffect(() => {
    if (!showNewChat) return;
    let active = true;
    const t = setTimeout(async () => {
      const res = await searchUsers(userQuery, meId);
      if (active) {
        setUserResults(res.users);
        setSearchError(res.error || null);
      }
    }, 250);
    return () => { active = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery, showNewChat]);

  // Messagerie temps réel — nouveaux messages + indicateur de frappe (par conversation)
  useEffect(() => {
    setPartnerTyping(false);
    if (!supabase || !activeConvId || !meId) return;
    const convId = activeConvId;

    const channel = supabase
      .channel(`conv-${convId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m: any = payload.new;
          const msg: ChatMessage = {
            id: m.id,
            from: m.sender_id === meId ? "me" : "them",
            text: m.content,
            time: formatTime(m.created_at),
            imageUrl: m.image_url,
          };
          setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
          if (m.sender_id !== meId) markConversationRead(convId, meId);
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.from && payload.from !== meId) {
          setPartnerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 2500);
        }
      })
      .subscribe();

    chatChannelRef.current = channel;

    return () => {
      chatChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase?.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, meId]);

  // Inbox temps réel global — notifie les nouveaux messages de TOUTES les conversations
  // (et l'ajout à une nouvelle conversation), quel que soit l'onglet affiché.
  const convIdsKey = conversations.map((c) => c.id).join(",");
  useEffect(() => {
    if (!supabase || !meId) return;
    const ids = conversations.map((c) => c.id);
    let channel = supabase.channel(`inbox-${meId}`);

    if (ids.length) {
      channel = channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=in.(${ids.join(",")})` },
        (payload) => {
          const m: any = payload.new;
          if (m.sender_id === meId) return; // pas mes propres messages
          loadConversations(); // met à jour notifications + badges en direct
          if (activeConvId !== m.conversation_id) {
            const conv = conversations.find((c) => c.id === m.conversation_id);
            toast({
              title: conv ? `Nouveau message de ${conv.name}` : "Nouveau message",
              description: m.image_url ? "📷 Photo" : m.content,
            });
          }
        }
      );
    }

    // Être ajouté à une nouvelle conversation → recharger
    channel = channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "conversation_members", filter: `user_id=eq.${meId}` },
      () => loadConversations()
    );

    channel.subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convIdsKey, meId, activeConvId]);

  // Temps réel — demandes d'amitié reçues / changements de relation
  useEffect(() => {
    if (!supabase || !meId) return;
    const channel = supabase
      .channel(`friendships-${meId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${meId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast({ title: "Nouvelle demande d'alliance 💌", description: "Quelqu'un souhaite faire votre connaissance. Consultez l'onglet Demandes." });
          }
          loadSocial();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships", filter: `requester_id=eq.${meId}` },
        () => loadSocial()
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  const navigation = [
    { name: "Accueil", icon: Home },
    { name: "Découvrir", icon: Search },
    { name: "Visiteurs", icon: Users },
    { name: "Favoris", icon: Heart },
    { name: "Demandes", icon: Star },
    { name: "Premium", icon: Crown, color: "text-primary" },
  ];

  const sidebarNav: { name: Tab; icon: any; badge?: number; dot?: boolean; highlight?: boolean }[] = [
    { name: "Accueil", icon: Home },
    { name: "Découvrir", icon: Search },
    { name: "Messages", icon: MessageCircle, badge: totalUnread },
    { name: "Demandes", icon: Star, badge: incomingRequests.length },
    { name: "Visiteurs", icon: Eye },
    { name: "Favoris", icon: Heart },
    { name: "Notifications", icon: Bell, dot: totalUnread > 0 },
    { name: "Premium", icon: Crown, highlight: true },
    { name: "Profil", icon: Settings },
  ];

  const bottomNav: { name: Tab; icon: any }[] = [
    { name: "Accueil", icon: Home },
    { name: "Découvrir", icon: Search },
    { name: "Messages", icon: MessageCircle },
    { name: "Favoris", icon: Heart },
  ];


  const renderContent = () => {
    switch (activeTab) {
      case "Accueil":
        return (
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 xl:items-start">
            {/* ===== FIL CENTRAL ===== */}
            <div className="space-y-6 min-w-0">

              {/* Hero — Parole du jour */}
              <section className="relative overflow-hidden rounded-t-[110px] sm:rounded-t-[190px] rounded-b-lg border border-sage/25 px-6 pt-12 pb-9 sm:pt-16 sm:pb-12 text-center bg-gradient-to-br from-sage/10 to-card">
                <ImposingFloralCorners size="xl" corners={["bl", "br"]} opacity={0.75} />
                <VitrailPattern className="absolute inset-0 w-full h-full text-sage/[0.06] pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-sage/12 blur-3xl rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  <Monogram className="w-12 h-10 text-secondary mb-5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-secondary/80 mb-5">Parole du jour</span>
                  <p key={(dailyQuote ?? VERSE_OF_DAY).ref} className="font-headline text-2xl sm:text-3xl lg:text-[2.05rem] italic leading-relaxed text-foreground max-w-2xl animate-in fade-in duration-700">
                    &ldquo;{(dailyQuote ?? VERSE_OF_DAY).text}&rdquo;
                  </p>
                  <p className="text-secondary text-xs font-bold tracking-[0.28em] uppercase mt-5">{(dailyQuote ?? VERSE_OF_DAY).ref}</p>
                  <Flourish className="w-44 h-3 text-secondary/70 mt-6" />
                  <p className="text-foreground/55 text-sm mt-5">Que la paix soit avec vous, <span className="text-foreground font-semibold">{displayName}</span>.</p>
                </div>
              </section>

              {/* Rubriques — tuiles en arche (pas de cercles) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {STORIES.map((s) => (
                  <button
                    key={s.label}
                    className="group flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-t-2xl rounded-b-md border border-border bg-card hover:border-secondary/45 hover:bg-secondary/[0.04] transition-colors"
                  >
                    <s.icon className="w-5 h-5 text-secondary" />
                    <span className="text-[10px] font-medium text-foreground/60 text-center leading-tight group-hover:text-foreground transition-colors">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Composer de publication */}
              <Card className="relative overflow-hidden border border-sage/15 bg-card rounded-2xl p-4">
                <ImposingFloralCorners size="sm" corners={["tr"]} opacity={0.4} />
                <input ref={composerImageRef} type="file" accept="image/*" className="hidden" onChange={handleComposerImage} />
                <div className={cn("flex gap-3", composerOpen ? "items-start" : "items-center")}>
                  <Avatar className="w-10 h-10 border border-foreground/10 shrink-0">
                    <AvatarImage src={myAvatar} />
                    <AvatarFallback>{displayInitial}</AvatarFallback>
                  </Avatar>

                  {composerOpen ? (
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Choix du type de publication */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(["Publication", "Témoignage", "Prière"] as ComposerType[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => setComposerType(t)}
                            className={cn(
                              "px-3 h-7 rounded-full text-[11px] font-bold border transition-colors",
                              composerType === t
                                ? "bg-secondary text-secondary-foreground border-secondary"
                                : "border-secondary/30 text-secondary hover:bg-secondary/10"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <Textarea
                        autoFocus
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        placeholder="Partagez une parole, un témoignage, une intention de prière…"
                        className="min-h-[92px] bg-foreground/5 border-secondary/15 rounded-xl text-sm resize-none focus-visible:ring-secondary/40"
                      />

                      {composerImage && (
                        <div className="relative rounded-xl overflow-hidden border border-secondary/15">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={composerImage} alt="Aperçu" className="w-full max-h-72 object-cover" />
                          <button
                            onClick={() => setComposerImage(null)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background transition-colors"
                            aria-label="Retirer la photo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => composerImageRef.current?.click()}
                          className="flex items-center gap-2 h-9 px-3 rounded-lg text-foreground/60 hover:bg-foreground/5 hover:text-primary text-xs font-bold transition-colors"
                        >
                          <ImagePlus className="w-4 h-4 text-primary" /> {composerImage ? "Changer la photo" : "Photo"}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={resetComposer}
                            className="h-9 px-4 rounded-lg text-foreground/50 hover:bg-foreground/5 text-sm font-bold transition-colors"
                          >
                            Annuler
                          </button>
                          <Button
                            onClick={publishPost}
                            disabled={!composerText.trim() && !composerImage}
                            className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg gap-2 text-sm disabled:opacity-50"
                          >
                            Publier <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openComposer("Publication")}
                      className="flex-1 text-left h-11 px-4 rounded-full bg-foreground/5 text-foreground/40 text-sm hover:bg-foreground/10 transition-colors truncate"
                    >
                      Partagez une parole, un témoignage…
                    </button>
                  )}
                </div>

                {!composerOpen && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-secondary/15">
                    {[
                      { label: "Témoignage", icon: Quote, type: "Témoignage" as ComposerType, photo: false },
                      { label: "Prière", icon: HeartHandshake, type: "Prière" as ComposerType, photo: false },
                      { label: "Photo", icon: Camera, type: "Publication" as ComposerType, photo: true },
                    ].map((b) => (
                      <button
                        key={b.label}
                        onClick={() => {
                          openComposer(b.type);
                          if (b.photo) composerImageRef.current?.click();
                        }}
                        className="flex items-center justify-center gap-2 h-10 rounded-xl text-foreground/60 hover:bg-foreground/5 hover:text-primary transition-colors text-xs font-bold"
                      >
                        <b.icon className="w-4 h-4 text-primary" /> {b.label}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Séparateur calligraphique + intitulé éditorial */}
              <div className="flex flex-col items-center text-center pt-2">
                <h3 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">La sélection du jour</h3>
                <p className="text-muted-foreground text-sm mt-1">Des profils alignés sur votre foi</p>
                <Flourish className="w-40 h-3 text-secondary/50 mt-4" />
              </div>

              {/* Profil à l'honneur + autres membres (réels) */}
              {discoverMembers.length > 0 ? (
                <>
                  <button
                    onClick={() => router.push(`/dashboard/profile/${discoverMembers[0].id}`)}
                    className="w-full flex gap-4 sm:gap-5 p-3 rounded-2xl border border-border bg-card hover:border-secondary/40 transition-colors text-left group"
                  >
                    <div className="relative w-28 h-40 sm:w-44 sm:h-56 rounded-xl overflow-hidden shrink-0">
                      {discoverMembers[0].avatar_url ? (
                        <Image src={discoverMembers[0].avatar_url} alt={discoverMembers[0].name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/15 to-card font-headline text-5xl font-bold text-secondary/70">{discoverMembers[0].name?.[0]?.toUpperCase() || "?"}</span>
                      )}
                      {user && (
                        <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground border-none font-black text-[10px] flex items-center gap-1"><Heart className="w-3 h-3 fill-secondary-foreground" /> {computeMatchScore(user, discoverMembers[0]).score}%</Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1 sm:py-2">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-secondary font-bold">Profil à l'honneur</span>
                      <h4 className="font-headline text-2xl sm:text-4xl font-bold text-foreground mt-2 group-hover:text-primary transition-colors">{discoverMembers[0].name}</h4>
                      {[discoverMembers[0].city, discoverMembers[0].country].filter(Boolean).join(", ") && (
                        <p className="text-foreground/50 text-sm flex items-center gap-1.5 mt-1.5"><MapPin className="w-4 h-4 text-secondary" /> {[discoverMembers[0].city, discoverMembers[0].country].filter(Boolean).join(", ")}</p>
                      )}
                      {discoverMembers[0].bio && <p className="text-foreground/60 text-sm italic leading-relaxed mt-3 line-clamp-3 hidden sm:block">&ldquo;{discoverMembers[0].bio}&rdquo;</p>}
                      <span className="inline-flex items-center gap-1 text-secondary text-sm font-bold mt-4 group-hover:gap-2 transition-all">Découvrir son profil <ChevronRight className="w-4 h-4" /></span>
                    </div>
                  </button>

                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {discoverMembers.slice(1, 4).map((m) => (
                      <MemberCard
                        key={m.id}
                        m={m}
                        match={user ? computeMatchScore(user, m).score : null}
                        isFavorite={favoriteIds.has(m.id)}
                        onToggleFav={() => handleToggleFavorite(m)}
                        onOpen={() => router.push(`/dashboard/profile/${m.id}`)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-6">Les profils des membres apparaîtront ici. Invitez vos proches à rejoindre Eden !</p>
              )}

              <div className="flex justify-center pt-1">
                <button onClick={() => setActiveTab("Découvrir")} className="inline-flex items-center gap-2 h-11 px-7 rounded-full border border-secondary/30 text-secondary hover:bg-secondary/10 text-sm font-bold tracking-wide transition-colors">
                  Explorer tous les profils <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Dévotions & récits bibliques */}
              {DEVOTIONALS.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
                >
                <Card className="border border-secondary/15 bg-card rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0"><d.icon className="w-5 h-5 text-primary" /></div>
                    <div className="min-w-0">
                      <p className="text-foreground font-bold text-sm">Eden · Édification</p>
                      <p className="text-foreground/40 text-xs">{d.category} · {d.readTime} de lecture</p>
                    </div>
                  </div>
                  <div className="relative aspect-[16/8]">
                    <Image src={d.image} alt={d.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  </div>
                  <div className="p-5 space-y-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary"><BookOpen className="w-3.5 h-3.5" /> {d.verse}</span>
                    <h4 className="font-headline text-xl font-bold text-foreground leading-snug">{d.title}</h4>
                    <p className="text-foreground/60 text-sm leading-relaxed">{d.excerpt}</p>
                  </div>
                  <PostActions likes={d.likes} comments={d.comments} />
                </Card>
                </motion.div>
              ))}

              {/* Communauté : témoignages & intentions de prière */}
              {feed.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
                >
                <Card className="border border-secondary/15 bg-card rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <Avatar className="w-11 h-11 border border-foreground/10 shrink-0"><AvatarImage src={p.avatar || undefined} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-bold text-sm truncate">{p.name}</p>
                      <p className="text-foreground/40 text-xs">{p.when}</p>
                    </div>
                    <Badge className={cn("border-none font-bold text-[10px] shrink-0", p.type === "Témoignage" ? "bg-secondary/10 text-primary" : "bg-secondary/15 text-secondary")}>{p.type}</Badge>
                  </div>
                  <div className="px-5 pb-4">
                    <p className="text-foreground/80 text-sm leading-relaxed">{p.text}</p>
                  </div>
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="w-full h-auto max-h-[80vh] object-contain bg-muted" />
                  )}
                  <PostActions likes={p.likes} comments={p.comments} />
                </Card>
                </motion.div>
              ))}

              {/* Académie du Mariage */}
              <Card className="border border-secondary/15 bg-card rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-secondary/10 border border-secondary/25 rounded-t-xl rounded-b-md flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5 text-secondary" /></div>
                  <div>
                    <h3 className="font-headline text-xl font-bold text-foreground">Académie du Mariage</h3>
                    <p className="text-muted-foreground text-xs">Édification spirituelle</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { title: "Critères essentiels du choix", icon: Star, href: "/dashboard/academie/criteres-essentiels" },
                    { title: "La Prière de Discernement", icon: ScrollText, href: "/dashboard/academie/prie-discernement" },
                    { title: "La période de connaissance", icon: Clock, href: "/dashboard/academie/periode-connaissance" },
                  ].map((link, i) => (
                    <button key={i} onClick={() => router.push(link.href)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-foreground/5 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-foreground/5 rounded-lg flex items-center justify-center group-hover:bg-secondary/15 transition-colors shrink-0"><link.icon className="w-5 h-5 text-secondary" /></div>
                        <span className="text-foreground/80 text-sm font-medium group-hover:text-primary transition-colors text-left">{link.title}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
                <Button onClick={() => router.push('/dashboard/academie')} className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl gap-2">
                  Explorer l'Académie <ArrowUpRight className="w-5 h-5" />
                </Button>
              </Card>
            </div>

            {/* ===== COLONNE DROITE ===== */}
            <aside className="space-y-6 mt-6 xl:mt-0 xl:sticky xl:top-24">
              {/* Complétion du profil */}
              <Card className="border border-secondary/15 bg-card rounded-t-2xl rounded-b-lg p-5">
                <div className="flex justify-between items-end mb-3">
                  <span className="font-headline font-bold text-foreground text-base">Profil complété</span>
                  <span className="text-secondary font-black text-xl">86%</span>
                </div>
                <Progress value={86} className="h-2 bg-foreground/5" />
                <p className="text-foreground/40 text-xs mt-3 leading-relaxed">Complétez les 14% restants pour apparaître dans toutes les recherches.</p>
                <Button onClick={() => setActiveTab("Profil")} variant="outline" className="w-full mt-4 h-10 rounded-xl border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:text-secondary font-bold text-xs">Compléter mon profil</Button>
              </Card>

              {/* Suggestions */}
              <Card className="border border-secondary/15 bg-card rounded-t-2xl rounded-b-lg p-5">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-headline font-bold text-foreground text-base">Suggestions pour vous</h4>
                  <button onClick={() => setActiveTab("Découvrir")} className="text-secondary text-xs font-bold">Voir</button>
                </div>
                <Flourish className="w-full h-2.5 text-secondary/30 mb-4" />
                <div className="space-y-3">
                  {discoverMembers.length === 0 ? (
                    <p className="text-foreground/40 text-xs">Les suggestions d'affinité apparaîtront ici.</p>
                  ) : (
                    discoverMembers.slice(0, 4).map((m) => {
                      const score = user ? computeMatchScore(user, m).score : null;
                      const fav = favoriteIds.has(m.id);
                      return (
                        <div key={m.id} className="flex items-center gap-3">
                          <button onClick={() => router.push(`/dashboard/profile/${m.id}`)} className="relative w-11 h-11 rounded-full overflow-hidden border border-secondary/20 shrink-0">
                            {m.avatar_url ? (
                              <Image src={m.avatar_url} alt={m.name} fill className="object-cover" unoptimized />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center bg-secondary/10 font-headline text-base font-bold text-secondary/70">{m.name?.[0]?.toUpperCase() || "?"}</span>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-sm font-bold truncate">{m.name}</p>
                            <p className="text-foreground/40 text-xs truncate flex items-center gap-1">
                              {typeof score === "number" && <span className="text-secondary font-bold">{score}%</span>}
                              <MapPin className="w-3 h-3 text-secondary shrink-0" /> {[m.city, m.country].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>
                          <button onClick={() => handleToggleFavorite(m)} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0", fav ? "bg-secondary text-secondary-foreground" : "bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground")}>
                            <Heart className={cn("w-4 h-4", fav && "fill-secondary-foreground")} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              {/* Événements */}
              <Card className="border border-secondary/15 bg-card rounded-t-2xl rounded-b-lg p-5">
                <h4 className="font-headline font-bold text-foreground text-base flex items-center gap-2"><CalendarDays className="w-4 h-4 text-secondary" /> Événements à venir</h4>
                <Flourish className="w-full h-2.5 text-secondary/30 mt-1 mb-4" />
                <div className="space-y-3">
                  {EVENTS.map((e) => (
                    <button key={e.id} onClick={() => toast({ title: e.title, description: `${e.date} · ${e.mode} · ${e.attendees} inscrits` })} className="w-full flex items-center gap-3 text-left group">
                      <div className="w-10 h-10 rounded-t-xl rounded-b-md bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0"><e.icon className="w-5 h-5 text-secondary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-bold leading-tight group-hover:text-primary transition-colors">{e.title}</p>
                        <p className="text-foreground/40 text-xs">{e.date} · {e.mode}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Sujets d'édification */}
              <Card className="border border-secondary/15 bg-card rounded-t-2xl rounded-b-lg p-5">
                <h4 className="font-headline font-bold text-foreground text-base flex items-center gap-2"><Hash className="w-4 h-4 text-secondary" /> Sujets d'édification</h4>
                <Flourish className="w-full h-2.5 text-secondary/30 mt-1 mb-4" />
                <div className="space-y-3">
                  {TOPICS.map((t) => (
                    <button key={t.tag} className="w-full text-left group">
                      <p className="text-foreground text-sm font-bold group-hover:text-secondary transition-colors">#{t.tag}</p>
                      <p className="text-foreground/40 text-xs">{t.posts}</p>
                    </button>
                  ))}
                </div>
              </Card>

              <div className="flex flex-col items-center text-center px-2 pt-1">
                <Monogram className="w-8 h-7 text-secondary/40 mb-2" />
                <p className="text-foreground/30 text-[10px] leading-relaxed font-headline italic">
                  « L'alliance bénie par la grâce divine. »
                </p>
              </div>
            </aside>
          </div>
        );

      case "Découvrir": {
        const q = discoverSearch.trim().toLowerCase();
        const scoreOf = (m: MemberProfile) => (user ? computeMatchScore(user, m).score : 0);
        const discoverResults = discoverMembers.filter((m) => {
          // Recherche texte
          if (q && !(
            (m.name || "").toLowerCase().includes(q) ||
            (m.city || "").toLowerCase().includes(q) ||
            (m.country || "").toLowerCase().includes(q) ||
            (m.profession || "").toLowerCase().includes(q)
          )) return false;
          // Filtres rapides
          if (discoverFilter === "Proches de moi") {
            const sameZone = (user?.country && m.country && user.country.toLowerCase() === m.country.toLowerCase());
            if (!sameZone) return false;
          }
          if (discoverFilter === "Affinité élevée" && scoreOf(m) < 75) return false;
          if (discoverFilter === "Vérifiés" && !m.avatar_url) return false;
          return true;
        });
        const shown = discoverResults.slice(0, discoverCount);
        return (
          <div className="space-y-6 sm:space-y-8">
            <TabHeader
              icon={Search}
              title="Découvrir"
              subtitle="Explorez les profils que la grâce place sur votre chemin"
            />

            {/* Barre de recherche */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <Input
                value={discoverSearch}
                onChange={(e) => { setDiscoverSearch(e.target.value); setDiscoverCount(24); }}
                placeholder="Rechercher un prénom, une ville, une profession…"
                className="h-14 pl-12 pr-12 rounded-full bg-card border border-secondary/20 text-sm focus-visible:ring-secondary/30"
              />
              {discoverSearch && (
                <button
                  onClick={() => setDiscoverSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtres */}
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {DISCOVER_FILTERS.map((filter, i) => (
                <button
                  key={filter}
                  onClick={() => setDiscoverFilter(filter)}
                  className={cn(
                    "shrink-0 px-6 h-12 rounded-full text-sm font-bold transition-all border flex items-center gap-2",
                    discoverFilter === filter
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-card text-foreground/60 border-secondary/15 hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {i === 0 && <Filter className="w-4 h-4" />}
                  {filter}
                </button>
              ))}
            </div>

            {q && (
              <p className="text-sm text-muted-foreground">
                {discoverResults.length} profil{discoverResults.length > 1 ? "s" : ""} pour « <span className="text-secondary font-bold">{discoverSearch}</span> »
              </p>
            )}

            {socialLoading && discoverMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Chargement des membres…</p>
              </div>
            ) : shown.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto bg-secondary/10 border border-secondary/25 rounded-t-3xl rounded-b-lg flex items-center justify-center mb-4"><Search className="w-8 h-8 text-secondary" /></div>
                <p className="text-muted-foreground">
                  {discoverMembers.length === 0
                    ? "Aucun autre membre pour l'instant. Invitez vos proches à rejoindre Eden !"
                    : "Aucun profil ne correspond à votre recherche."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {shown.map((m) => {
                  const status = relations[m.id]?.status ?? "none";
                  return (
                    <MemberCard
                      key={m.id}
                      m={m}
                      match={scoreOf(m)}
                      isFavorite={favoriteIds.has(m.id)}
                      onToggleFav={() => handleToggleFavorite(m)}
                      onOpen={() => router.push(`/dashboard/profile/${m.id}`)}
                      action={
                        status === "friends" ? (
                          <Button onClick={() => router.push(`/dashboard/profile/${m.id}`)} variant="outline" className="h-10 rounded-xl border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:text-secondary font-bold gap-2 text-xs">
                            <Check className="w-4 h-4" /> Amis
                          </Button>
                        ) : status === "pending_out" ? (
                          <Button disabled variant="outline" className="h-10 rounded-xl border-secondary/15 text-foreground/40 font-bold gap-2 text-xs">
                            <Check className="w-4 h-4" /> Demande envoyée
                          </Button>
                        ) : status === "pending_in" ? (
                          <Button onClick={() => setActiveTab("Demandes")} className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 text-xs">
                            <Star className="w-4 h-4" /> Répondre
                          </Button>
                        ) : (
                          <Button onClick={() => handleAddFriend(m)} className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 text-xs">
                            <UserPlus className="w-4 h-4" /> Ajouter
                          </Button>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}

            {discoverCount < discoverResults.length && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setDiscoverCount((c) => c + 24)}
                  variant="outline"
                  className="h-14 px-10 rounded-2xl border-secondary/20 bg-card hover:bg-foreground/5 hover:border-primary/40 text-foreground font-bold gap-3"
                >
                  Charger plus de profils <ChevronRight className="w-5 h-5 rotate-90" />
                </Button>
              </div>
            )}
          </div>
        );
      }

      case "Visiteurs":
        return (
          <div className="space-y-8">
            <TabHeader
              icon={Eye}
              title="Visiteurs"
              subtitle="Découvrez qui a posé les yeux sur votre profil"
            />

            {socialLoading && visitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Chargement des visiteurs…</p>
              </div>
            ) : visitors.length === 0 ? (
              <EmptyState
                icon={Eye}
                title="Aucun visiteur pour l'instant"
                text="Lorsqu'un membre consultera votre profil, il apparaîtra ici."
                cta="Découvrir des profils"
                onClick={() => setActiveTab("Découvrir")}
              />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {visitors.length} {visitors.length > 1 ? "personnes ont" : "personne a"} consulté votre profil récemment.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {visitors.map((v) => {
                    const loc = [v.member.city, v.member.country].filter(Boolean).join(", ");
                    return (
                      <Card
                        key={v.member.id}
                        onClick={() => router.push(`/dashboard/profile/${v.member.id}`)}
                        className="group overflow-hidden border-none bg-card rounded-2xl relative transition-all duration-500 cursor-pointer hover:shadow-[0_20px_50px_rgba(198,166,79,0.14)]"
                      >
                        <div className="relative aspect-[3/4]">
                          {v.member.avatar_url ? (
                            <Image src={v.member.avatar_url} alt={v.member.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" unoptimized />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/15 to-card font-headline text-4xl font-bold text-secondary/70">{v.member.name?.[0]?.toUpperCase() || "?"}</span>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-70" />
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <h4 className="font-headline text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">{v.member.name}</h4>
                            {loc && (
                              <div className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-widest truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {loc}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-muted border-t border-secondary/15 flex items-center gap-2 text-foreground/40 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-primary/50" /> {v.when}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );

      case "Favoris":
        return (
          <div className="space-y-8">
            <TabHeader
              icon={Heart}
              title="Mes Favoris"
              subtitle="Les profils que votre cœur a mis de côté"
            />
            {socialLoading && favoriteMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Chargement de vos favoris…</p>
              </div>
            ) : favoriteMembers.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="Aucun favori pour l'instant"
                text="Parcourez les profils et touchez l'étoile pour conserver ceux qui résonnent avec vos valeurs."
                cta="Découvrir des profils"
                onClick={() => setActiveTab("Découvrir")}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {favoriteMembers.map((m) => (
                  <MemberCard
                    key={m.id}
                    m={m}
                    isFavorite={favoriteIds.has(m.id)}
                    onToggleFav={() => handleToggleFavorite(m)}
                    onOpen={() => router.push(`/dashboard/profile/${m.id}`)}
                    action={
                      <Button onClick={() => router.push(`/dashboard/profile/${m.id}`)} variant="outline" className="h-10 rounded-xl border-secondary/25 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:text-secondary font-bold gap-2 text-xs">
                        <Eye className="w-4 h-4" /> Voir le profil
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        );

      case "Demandes":
        return (
          <div className="space-y-8">
            <TabHeader
              icon={Star}
              title="Demandes d'alliance"
              subtitle="Ces personnes souhaitent cheminer avec vous"
            />
            {socialLoading && incomingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Chargement des demandes…</p>
              </div>
            ) : incomingRequests.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Aucune demande en attente"
                text="Lorsque quelqu'un souhaitera faire votre connaissance, sa demande apparaîtra ici."
                cta="Découvrir des profils"
                onClick={() => setActiveTab("Découvrir")}
              />
            ) : (
              <div className="space-y-5">
                {incomingRequests.map((r) => {
                  const m = r.requester;
                  const loc = [m.city, m.country].filter(Boolean).join(", ");
                  return (
                  <Card key={r.id} className="border-none bg-card rounded-2xl p-6 sm:p-8 border border-secondary/15 shadow-xl">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <button
                        onClick={() => router.push(`/dashboard/profile/${m.id}`)}
                        className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 mx-auto sm:mx-0 border-2 border-secondary/15 hover:border-primary/50 transition-colors"
                      >
                        {m.avatar_url ? (
                          <Image src={m.avatar_url} alt={m.name} fill className="object-cover" unoptimized />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center bg-secondary/10 font-headline text-2xl font-bold text-secondary">{m.name?.[0]?.toUpperCase() || "?"}</span>
                        )}
                      </button>
                      <div className="flex-1 space-y-4 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                          <h4 className="font-headline text-xl font-bold text-foreground">{m.name}</h4>
                          {loc && (
                            <span className="text-foreground/40 text-xs flex items-center gap-1 justify-center sm:justify-start">
                              <MapPin className="w-3 h-3 text-primary/50" /> {loc}{m.profession ? ` • ${m.profession}` : ""}
                            </span>
                          )}
                        </div>
                        {r.message && <p className="text-foreground/60 italic leading-relaxed">"{r.message}"</p>}
                        <p className="text-[11px] text-foreground/40 flex items-center gap-1.5 justify-center sm:justify-start"><Eye className="w-3.5 h-3.5 text-secondary" /> Consultez son profil et ses valeurs avant d'accepter.</p>
                        <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                          <Button
                            onClick={() => router.push(`/dashboard/profile/${m.id}`)}
                            variant="outline"
                            className="border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:text-secondary font-bold h-12 px-6 rounded-xl gap-2"
                          >
                            <Eye className="w-5 h-5" /> Voir le profil
                          </Button>
                          <Button
                            onClick={() => handleRespondRequest(r, true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 rounded-xl gap-2 shadow-lg shadow-primary/15"
                          >
                            <Check className="w-5 h-5" /> Accepter
                          </Button>
                          <Button
                            onClick={() => handleRespondRequest(r, false)}
                            variant="outline"
                            className="border-foreground/10 bg-transparent text-foreground/50 hover:text-foreground hover:bg-foreground/5 font-bold h-12 px-6 rounded-xl gap-2"
                          >
                            <X className="w-5 h-5" /> Décliner
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "Messages": {
        return (
          <div>
            <Card className="border border-secondary/15 bg-card rounded-2xl overflow-hidden flex h-[calc(100vh-8rem)] min-h-[520px]">
              {/* Liste / Nouvelle conversation */}
              <div className={cn("w-full md:w-[320px] md:border-r border-secondary/15 flex-col", activeConvId !== null ? "hidden md:flex" : "flex")}>
                {showNewChat ? (
                  <>
                    <div className="p-3 border-b border-secondary/15 flex items-center gap-2">
                      <button onClick={() => { setShowNewChat(false); setUserQuery(""); setUserResults([]); }} className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground/60 hover:bg-foreground/5 shrink-0"><ArrowLeft className="w-5 h-5" /></button>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                        <Input autoFocus value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Nom ou email…" className="pl-9 h-10 bg-foreground/5 border-none rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {searchError ? (
                        <div className="p-4 text-sm text-destructive/90 leading-relaxed">
                          Erreur annuaire : {searchError}
                          <span className="block text-foreground/40 mt-2">Vérifiez que le schéma Supabase (table <b>profiles</b>) a bien été exécuté.</span>
                        </div>
                      ) : userResults.length === 0 ? (
                        <p className="p-4 text-sm text-foreground/40">{userQuery.trim().length < 2 ? "Saisissez au moins 2 caractères pour rechercher un membre." : "Aucun membre trouvé."}</p>
                      ) : (
                        userResults.map((u) => (
                          <button key={u.id} onClick={() => handleStartConversation(u)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-foreground/5 transition-colors">
                            <Avatar className="w-11 h-11 border border-foreground/10"><AvatarImage src={u.avatar_url || undefined} /><AvatarFallback>{u.name?.[0]?.toUpperCase() || "?"}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{u.name}</p>
                              <p className="text-xs text-foreground/40 truncate">{u.email}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 border-b border-secondary/15">
                      <Button onClick={() => setShowNewChat(true)} className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-2 text-sm">
                        <span className="text-lg leading-none">+</span> Nouvelle conversation
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {conversations.length === 0 ? (
                        <div className="p-6 text-center">
                          <MessageCircle className="w-10 h-10 text-primary/40 mx-auto mb-3" />
                          <p className="text-sm text-foreground/40">Aucune conversation pour l'instant.<br />Démarrez-en une avec un membre.</p>
                        </div>
                      ) : (
                        conversations.map((c) => {
                          const sel = activeConvId === c.id;
                          const unread = sel ? 0 : c.unread;
                          return (
                            <button
                              key={c.id}
                              onClick={() => openConversation(c.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 text-left transition-colors border-l-2",
                                sel ? "bg-secondary/10 border-primary" : "border-transparent hover:bg-foreground/5"
                              )}
                            >
                              <Avatar className="w-12 h-12 border border-foreground/10 shrink-0"><AvatarImage src={c.avatar || undefined} /><AvatarFallback>{c.name?.[0]?.toUpperCase() || "?"}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className={cn("font-bold text-sm truncate", sel ? "text-primary" : "text-foreground")}>{c.name}</h4>
                                  <span className="text-[10px] text-foreground/30 shrink-0">{c.when}</span>
                                </div>
                                <p className={cn("text-xs truncate mt-0.5", unread > 0 ? "text-foreground/80 font-medium" : "text-foreground/40")}>{c.last}</p>
                              </div>
                              {unread > 0 && <span className="shrink-0 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center">{unread}</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Fil de discussion */}
              <div className={cn("flex-1 flex-col min-w-0", activeConvId === null ? "hidden md:flex" : "flex")}>
                {activeConv ? (
                  <>
                    <div className="flex items-center gap-3 p-3 border-b border-secondary/15">
                      <button onClick={() => setActiveConvId(null)} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-foreground/60 hover:bg-foreground/5 shrink-0"><ArrowLeft className="w-5 h-5" /></button>
                      <button
                        onClick={() => activeConv.otherId && router.push(`/dashboard/profile/${activeConv.otherId}`)}
                        className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                        title="Voir le profil"
                      >
                        <Avatar className="w-10 h-10 border border-foreground/10 shrink-0"><AvatarImage src={activeConv.avatar || undefined} /><AvatarFallback>{activeConv.name?.[0]?.toUpperCase() || "?"}</AvatarFallback></Avatar>
                        <div className="text-left min-w-0">
                          <h4 className="font-bold text-foreground text-sm truncate">{activeConv.name}</h4>
                          <p className={cn("text-[11px]", partnerTyping ? "text-primary font-medium" : "text-foreground/40")}>
                            {partnerTyping ? "en train d'écrire…" : "Voir le profil"}
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="relative flex-1 min-h-0 bg-muted/40">
                      {/* Fond de chat — vitrail + monogramme filigrane + lueurs */}
                      <VitrailPattern className="absolute inset-0 w-full h-full text-secondary/[0.13] pointer-events-none" />
                      <Monogram className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-48 text-secondary/[0.07] pointer-events-none" />
                      <div className="absolute inset-0 bg-[radial-gradient(120%_55%_at_50%_0%,rgba(198,166,79,0.10),transparent_70%)] pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(80%_100%_at_50%_100%,rgba(168,134,60,0.07),transparent)] pointer-events-none" />
                      <div className="relative h-full overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {messages.length === 0 && (
                        <p className="text-center text-xs text-foreground/30 py-8">Dites bonjour avec bienveillance 🙏</p>
                      )}
                      {messages.map((m) => (
                        <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[80%] rounded-2xl text-sm leading-relaxed overflow-hidden shadow-sm", m.imageUrl ? "p-1.5" : "px-4 py-2.5", m.from === "me" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-secondary/20 text-foreground rounded-bl-md")}>
                            {m.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                                <img src={m.imageUrl} alt="Photo partagée" className="rounded-xl max-h-64 w-auto object-cover" />
                              </a>
                            )}
                            {m.text && <p className={cn(m.imageUrl && "px-2.5 pt-1.5")}>{m.text}</p>}
                            <span className={cn("block text-[9px] mt-1 text-right", m.imageUrl && "px-2.5 pb-1", m.from === "me" ? "text-primary-foreground/60" : "text-foreground/30")}>{m.time}</span>
                          </div>
                        </div>
                      ))}
                      {partnerTyping && (
                        <div className="flex justify-start">
                          <div className="bg-card border border-secondary/20 shadow-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      )}
                      </div>
                    </div>

                    <div className="relative border-t border-secondary/15">
                      {/* Aperçu de l'image en attente (avec légende) */}
                      {pendingPreview && (
                        <div className="px-3 pt-3 flex items-center gap-3">
                          <div className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pendingPreview} alt="Aperçu" className="h-20 w-20 rounded-xl border border-secondary/30 object-cover" />
                            <button
                              type="button"
                              onClick={clearPendingImage}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border border-secondary/30 text-foreground/60 hover:text-destructive flex items-center justify-center shadow"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-foreground/50">Photo prête à envoyer — ajoutez une légende si vous le souhaitez.</p>
                        </div>
                      )}

                      {/* Sélecteur d'émojis */}
                      {showEmoji && (
                        <div className="absolute bottom-full left-3 mb-2 bg-popover border border-foreground/10 rounded-2xl p-3 shadow-2xl grid grid-cols-6 gap-1 w-[260px] z-20 animate-in fade-in slide-in-from-bottom-1 duration-200">
                          {CHAT_EMOJIS.map((emo) => (
                            <button
                              key={emo.char}
                              type="button"
                              onClick={() => { setChatInput((v) => v + emo.char); }}
                              className="w-9 h-9 rounded-lg hover:bg-foreground/10 transition-colors flex items-center justify-center"
                            >
                              <FluentEmoji char={emo.char} url={emo.url} className="w-6 h-6" />
                            </button>
                          ))}
                        </div>
                      )}

                      <form onSubmit={sendMessage} className="p-3 flex items-center gap-1.5">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => { handlePickImage(e.target.files?.[0]); e.target.value = ""; }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEmoji((s) => !s)}
                          className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors", showEmoji ? "bg-secondary/10 text-primary" : "text-foreground/50 hover:text-primary hover:bg-foreground/5")}
                          title="Émojis"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-foreground/50 hover:text-primary hover:bg-foreground/5 transition-colors disabled:opacity-50"
                          title="Envoyer une photo"
                        >
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                        </button>
                        <Input
                          value={chatInput}
                          onChange={(e) => handleChatInput(e.target.value)}
                          onFocus={() => setShowEmoji(false)}
                          placeholder={pendingImage ? "Ajoutez une légende…" : "Écrivez un message bienveillant…"}
                          className="flex-1 h-11 bg-foreground/5 border-none rounded-full px-4 text-sm"
                        />
                        <Button type="submit" disabled={(!chatInput.trim() && !pendingImage) || uploading} className="w-11 h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-0 shrink-0 disabled:opacity-40">
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 bg-foreground/5 rounded-3xl flex items-center justify-center mb-4"><MessageCircle className="w-8 h-8 text-primary/50" /></div>
                    <h3 className="font-headline text-xl font-bold text-foreground mb-1">Vos conversations</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">Sélectionnez une conversation, ou démarrez-en une nouvelle avec un membre.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      }

      case "Notifications":
        return (
          <div className="space-y-6 sm:space-y-8">
            <TabHeader
              icon={Bell}
              title="Notifications"
              subtitle="Tout ce qui se passe dans votre sanctuaire"
            />

            {/* Nouveaux messages (temps réel) */}
            {messageNotifs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary px-1">Nouveaux messages</p>
                <Card className="bg-card rounded-2xl border border-secondary/15 shadow-xl overflow-hidden divide-y divide-secondary/10">
                  {messageNotifs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveTab("Messages"); openConversation(c.id); }}
                      className="w-full flex items-center gap-4 p-4 sm:p-5 hover:bg-foreground/5 transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="w-12 h-12 border border-secondary/20">
                          <AvatarImage src={c.avatar || undefined} />
                          <AvatarFallback>{c.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center"><MessageCircle className="w-3.5 h-3.5" /></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm sm:text-base">
                          <span className="font-bold">{c.name}</span> vous a envoyé {c.unread > 1 ? `${c.unread} messages` : "un message"}.
                        </p>
                        <p className="text-foreground/50 text-xs truncate mt-0.5">{c.last}</p>
                      </div>
                      <span className="text-[11px] text-foreground/30 font-medium shrink-0">{c.when}</span>
                    </button>
                  ))}
                </Card>
              </div>
            )}

            {/* Autres activités */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary px-1">Activité</p>
              <Card className="bg-card rounded-2xl border border-secondary/15 shadow-xl overflow-hidden divide-y divide-secondary/10">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-foreground/5 transition-colors">
                    <div className="w-11 h-11 rounded-t-xl rounded-b-md bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                      <n.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <p className="flex-1 text-foreground/80 text-sm sm:text-base">{n.text}</p>
                    <span className="text-[11px] text-foreground/30 font-medium shrink-0 uppercase tracking-widest">{n.when}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        );

      case "Premium":
        return (
          <div className="space-y-10">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/10 rounded-full border border-secondary/20 text-primary text-xs font-bold uppercase tracking-widest">
                <Crown className="w-3.5 h-3.5" /> Privilège Eden Or
              </div>
              <h2 className="font-headline text-4xl sm:text-5xl font-bold text-foreground">Élevez votre chemin</h2>
              <p className="text-muted-foreground text-lg">Accédez à la pleine mesure d'Eden pour bâtir votre alliance avec sérénité.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {PREMIUM_PLANS.map((plan) => (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative border rounded-2xl p-8 sm:p-10 shadow-2xl overflow-hidden",
                    plan.accent ? "bg-card border-secondary/30" : "bg-card border-secondary/15"
                  )}
                >
                  {plan.accent && <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent pointer-events-none" />}
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="font-headline text-2xl font-bold text-foreground flex items-center gap-3">
                        {plan.accent && <Crown className="w-6 h-6 text-primary" />}
                        {plan.name}
                      </h3>
                      {plan.badge && <Badge className="bg-primary text-primary-foreground border-none font-black px-3">{plan.badge}</Badge>}
                    </div>

                    <div className="flex items-end gap-2">
                      <span className="font-headline text-5xl font-black text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground font-medium mb-2">{plan.price !== "0" ? "FCFA " : ""}{plan.period}</span>
                    </div>

                    <ul className="space-y-4">
                      {plan.features.map((f) => (
                        <li key={f.label} className={cn("flex items-center gap-3 text-sm", f.ok ? "text-foreground/80" : "text-foreground/25 line-through")}>
                          <span className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", f.ok ? "bg-primary/20" : "bg-foreground/5")}>
                            {f.ok ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-foreground/30" />}
                          </span>
                          {f.label}
                        </li>
                      ))}
                    </ul>

                    <Button
                      disabled={plan.current}
                      onClick={() => toast({ title: "Merci !", description: "Le paiement sécurisé arrive très prochainement." })}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black text-base gap-2 transition-transform",
                        plan.accent
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02]"
                          : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 disabled:opacity-100"
                      )}
                    >
                      {plan.accent && <Crown className="w-5 h-5" />}
                      {plan.cta}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-foreground/30 text-xs">
              <ShieldCheck className="w-4 h-4 text-primary/50" /> Paiement sécurisé • Résiliable à tout moment
            </div>
          </div>
        );

      case "Profil":
        if (showMyPosts) {
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowMyPosts(false); cancelEditPost(); }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground/60 hover:bg-foreground/5 shrink-0"
                  aria-label="Retour au profil"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-headline text-2xl font-bold text-foreground">Mes publications</h2>
                  <p className="text-muted-foreground text-sm">
                    {myPosts.length} publication{myPosts.length > 1 ? "s" : ""} • modifiable pendant 10 min
                  </p>
                </div>
              </div>

              {myPosts.length === 0 ? (
                <EmptyState
                  icon={Quote}
                  title="Aucune publication"
                  text="Partagez une parole, un témoignage ou une intention de prière depuis l'accueil."
                  cta="Publier maintenant"
                  onClick={() => { setShowMyPosts(false); setActiveTab("Accueil"); openComposer("Publication"); }}
                />
              ) : (
                <div className="space-y-5">
                  {myPosts.map((p) => {
                    const editable = canEditPost(p);
                    const isEditing = editingPostId === p.id;
                    return (
                      <Card key={p.id} className="border border-secondary/15 bg-card rounded-2xl overflow-hidden">
                        <div className="p-4 flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-foreground/10 shrink-0"><AvatarImage src={p.avatar || undefined} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-bold text-sm truncate">{p.name}</p>
                            <p className="text-foreground/40 text-xs">{p.when}</p>
                          </div>
                          <Badge className={cn("border-none font-bold text-[10px] shrink-0", p.type === "Témoignage" ? "bg-secondary/10 text-primary" : "bg-secondary/15 text-secondary")}>{p.type}</Badge>
                        </div>

                        {isEditing ? (
                          <div className="px-4 pb-4 space-y-3">
                            <Textarea
                              autoFocus
                              value={editPostText}
                              onChange={(e) => setEditPostText(e.target.value)}
                              className="min-h-[90px] bg-foreground/5 border-secondary/15 rounded-xl text-sm resize-none focus-visible:ring-secondary/40"
                            />
                            {editPostImage && (
                              <div className="relative rounded-xl overflow-hidden border border-secondary/15">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editPostImage} alt="Aperçu" className="w-full max-h-72 object-contain bg-muted" />
                                <button
                                  onClick={() => setEditPostImage(null)}
                                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background transition-colors"
                                  aria-label="Retirer la photo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={cancelEditPost} className="h-9 px-4 rounded-lg text-foreground/50 hover:bg-foreground/5 text-sm font-bold transition-colors">Annuler</button>
                              <Button onClick={saveEditPost} className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg gap-2 text-sm"><CheckCircle2 className="w-4 h-4" /> Enregistrer</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {p.text && <div className="px-4 pb-3"><p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">{p.text}</p></div>}
                            {p.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image} alt="" className="w-full h-auto max-h-72 object-contain bg-muted" />
                            )}
                            <div className="p-3 flex items-center gap-2 border-t border-secondary/10">
                              {editable ? (
                                <Button onClick={() => startEditPost(p)} variant="outline" className="h-10 px-4 rounded-xl border-secondary/25 bg-secondary/5 text-secondary hover:bg-secondary/10 hover:text-secondary font-bold gap-2 text-sm">
                                  <Pencil className="w-4 h-4" /> Modifier
                                </Button>
                              ) : (
                                <span className="text-[11px] text-foreground/35 italic px-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Délai de modification dépassé</span>
                              )}
                              <Button onClick={() => deletePost(p.id)} variant="outline" className="h-10 px-4 rounded-xl border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold gap-2 text-sm ml-auto">
                                <Trash2 className="w-4 h-4" /> Supprimer
                              </Button>
                            </div>
                          </>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-8">
            <TabHeader
              icon={Settings}
              title="Mon Profil"
              subtitle="Gérez votre présence dans le sanctuaire"
            />

            <Card className="border-none bg-card rounded-2xl p-8 sm:p-10 border border-secondary/15 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="relative shrink-0">
                  <Avatar className="w-28 h-28 border-4 border-secondary/20 shadow-xl">
                    <AvatarImage src={myAvatar} />
                    <AvatarFallback>{displayInitial}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title="Changer la photo"
                    className="absolute bottom-0 right-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:scale-110 transition-transform disabled:opacity-70"
                  >
                    {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { handlePickAvatar(e.target.files?.[0]); e.target.value = ""; }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <h3 className="font-headline text-3xl font-bold text-foreground">{displayName}</h3>
                    <Badge className="bg-secondary/15 text-secondary border-none font-bold gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Vérifié</Badge>
                  </div>
                  <p className="text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
                    <MapPin className="w-4 h-4 text-secondary" /> {displayLocation} • Profil Or
                  </p>
                  {user?.email && <p className="text-foreground/30 text-sm">{user.email}</p>}
                </div>
                {!editingProfile && (
                  <Button onClick={startEditProfile} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 rounded-xl gap-2 shadow-lg shadow-primary/15">
                    <Pencil className="w-4 h-4" /> Modifier
                  </Button>
                )}
              </div>

              {!editingProfile && (
                <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-foreground/60 text-sm font-bold uppercase tracking-widest">Profil complété</span>
                    <span className="text-foreground font-black text-2xl">86%</span>
                  </div>
                  <Progress value={86} className="h-3 bg-foreground/5" />
                  <p className="text-xs text-foreground/30">Complétez les 14% restants pour apparaître dans toutes les recherches.</p>
                </div>
              )}
            </Card>

            {editingProfile ? (
              /* ===== Mode édition ===== */
              <Card className="border border-secondary/15 bg-card rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-xl font-bold text-foreground">Modifier mes informations</h3>
                  <button onClick={() => setEditingProfile(false)} className="text-foreground/40 hover:text-foreground"><X className="w-5 h-5" /></button>
                </div>

                {/* Champs verrouillés (obligatoires à l'inscription) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground/50 flex items-center gap-1.5"><Lock className="w-3 h-3" /> Adresse email</Label>
                    <div className="h-12 px-4 rounded-xl bg-muted border border-secondary/15 flex items-center text-foreground/50 text-sm">{user?.email}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground/50 flex items-center gap-1.5"><Lock className="w-3 h-3" /> Sexe</Label>
                    <div className="h-12 px-4 rounded-xl bg-muted border border-secondary/15 flex items-center text-foreground/50 text-sm capitalize">{user?.gender === "homme" ? "Homme" : user?.gender === "femme" ? "Femme" : "—"}</div>
                  </div>
                </div>
                <p className="text-[11px] text-foreground/30 -mt-3">L'email et le sexe sont définitifs et ne peuvent pas être modifiés.</p>

                {/* Champs modifiables */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Prénom / Nom</Label>
                  <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="h-12 rounded-xl bg-muted border-secondary/15" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Ville</Label>
                    <Input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} className="h-12 rounded-xl bg-muted border-secondary/15" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Pays</Label>
                    <Input value={profileForm.country} onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })} className="h-12 rounded-xl bg-muted border-secondary/15" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Profession</Label>
                  <Input value={profileForm.profession} onChange={(e) => setProfileForm({ ...profileForm, profession: e.target.value })} placeholder="Ex : Enseignant, Infirmière…" className="h-12 rounded-xl bg-muted border-secondary/15" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Situation</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Célibataire", "Veuf / Veuve", "Divorcé(e)"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setProfileForm({ ...profileForm, civilStatus: s })}
                        className={cn(
                          "h-11 rounded-xl text-xs font-bold border transition-colors px-1",
                          profileForm.civilStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground/60 border-secondary/15 hover:border-primary/40"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Mes valeurs &amp; croyances <span className="text-foreground/30 normal-case font-medium">(max 3)</span></Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MARRIAGE_VALUES.map((v) => {
                      const selected = profileForm.marriageVision.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleProfileValue(v.id)}
                          className={cn(
                            "h-12 px-4 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2.5 text-left",
                            selected ? "bg-secondary/10 border-secondary text-secondary" : "bg-muted text-foreground/60 border-secondary/15 hover:border-secondary/40"
                          )}
                        >
                          <span className="text-lg">{v.icon}</span>
                          <span className="flex-1 min-w-0 truncate">{v.label}</span>
                          {selected && <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Ma vision du foyer</Label>
                  <Textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Quelques mots sur votre vision du mariage chrétien…" rows={4} className="rounded-xl bg-muted border-secondary/15 resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-2 disabled:opacity-70">
                    {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : <><CheckCircle2 className="w-4 h-4" /> Enregistrer</>}
                  </Button>
                  <Button onClick={() => setEditingProfile(false)} variant="outline" className="h-12 px-6 rounded-xl border-secondary/20 text-foreground/60 hover:text-foreground font-bold">
                    Annuler
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Compléter / modifier le questionnaire (onboarding) */}
                <button
                  onClick={() => router.push("/onboarding")}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border border-secondary/15 bg-card shadow-xl hover:border-secondary/40 transition-colors text-left group"
                >
                  <div className="w-12 h-12 bg-secondary/10 border border-secondary/25 rounded-t-2xl rounded-b-md flex items-center justify-center shrink-0">
                    <ScrollText className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-lg font-bold text-foreground group-hover:text-primary transition-colors">Mon questionnaire</h3>
                    <p className="text-muted-foreground text-sm">Compléter ou modifier vos réponses (foi, valeurs, attentes)</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-secondary shrink-0 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Mes publications — consulter & gérer */}
                <button
                  onClick={() => setShowMyPosts(true)}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border border-secondary/15 bg-card shadow-xl hover:border-secondary/40 transition-colors text-left group"
                >
                  <div className="w-12 h-12 bg-secondary/10 border border-secondary/25 rounded-t-2xl rounded-b-md flex items-center justify-center shrink-0">
                    <Quote className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-lg font-bold text-foreground group-hover:text-primary transition-colors">Mes publications</h3>
                    <p className="text-muted-foreground text-sm">Consulter, modifier ou supprimer vos publications</p>
                  </div>
                  <span className="shrink-0 flex items-center gap-2 text-secondary font-bold text-sm">
                    {myPosts.length}
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                {/* Aperçu des infos */}
                <Card className="border border-secondary/15 bg-card rounded-2xl p-6 sm:p-8 shadow-xl">
                  <h3 className="font-headline text-xl font-bold text-foreground mb-1">Mes informations</h3>
                  <Flourish className="w-32 h-3 text-secondary/40 mb-5" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {[
                      { label: "Email", val: user?.email || "—" },
                      { label: "Sexe", val: user?.gender === "homme" ? "Homme" : user?.gender === "femme" ? "Femme" : "—" },
                      { label: "Âge", val: ageFromBirthDate(user?.birthDate) ? `${ageFromBirthDate(user?.birthDate)} ans` : "—" },
                      { label: "Ville", val: user?.city || "—" },
                      { label: "Pays", val: user?.country || "—" },
                      { label: "Profession", val: user?.profession || "—" },
                      { label: "Situation", val: user?.civilStatus || "—" },
                      { label: "Région", val: user?.region || "—" },
                      { label: "Découvert via", val: user?.discoverySource || "—" },
                    ].map((f) => (
                      <div key={f.label} className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">{f.label}</p>
                        <p className="text-foreground font-medium">{f.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mes croyances / valeurs (choisies à l'inscription) */}
                  <div className="mt-5 pt-5 border-t border-secondary/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-3">Mes valeurs &amp; croyances</p>
                    {user?.marriageVision && user.marriageVision.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.marriageVision.map((id) => {
                          const v = getValue(id);
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-secondary/10 border border-secondary/25 text-secondary text-xs font-bold">
                              <span>{v.icon}</span> {v.label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-foreground/40 text-sm">Aucune valeur renseignée. Cliquez sur « Modifier » pour les ajouter.</p>
                    )}
                  </div>

                  {user?.bio && (
                    <div className="mt-5 pt-5 border-t border-secondary/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-1">Ma vision du foyer</p>
                      <p className="text-foreground/70 italic leading-relaxed">&ldquo;{user.bio}&rdquo;</p>
                    </div>
                  )}
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: "Vues du profil", val: "1.2k", icon: Eye },
                    { label: "Favoris reçus", val: "84", icon: Heart },
                    { label: "Demandes", val: "12", icon: Star },
                  ].map((s, i) => (
                    <Card key={i} className="border-none bg-muted rounded-2xl p-8 border border-secondary/15 text-center">
                      <div className="w-14 h-14 mx-auto bg-secondary/10 rounded-2xl flex items-center justify-center mb-4">
                        <s.icon className="w-7 h-7 text-secondary" />
                      </div>
                      <div className="font-headline text-4xl font-black text-foreground">{s.val}</div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-2">{s.label}</p>
                    </Card>
                  ))}
                </div>
              </>
            )}

            <Button
              onClick={async () => { await logout(); router.push("/login"); }}
              variant="outline"
              className="w-full h-14 rounded-2xl border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold"
            >
              Se déconnecter
            </Button>
          </div>
        );

      default:
        return <div className="py-20 text-center text-muted-foreground">Contenu en développement...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Accent végétal latéral — desktop */}
      <div className="hidden xl:block fixed left-[280px] top-1/4 w-32 h-80 pointer-events-none z-0 opacity-40" aria-hidden="true">
        <ImposingFloralSide className="w-full h-full" />
      </div>

      {/* ===== Sidebar (desktop) ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-[280px] bg-card border-r border-sage/15 z-40 relative overflow-hidden">
        <ImposingFloralCorners size="md" corners={["bl"]} opacity={0.55} className="z-0" />
        <div className="h-20 flex items-center px-6 border-b border-sage/15 relative z-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Monogram className="w-9 h-8 text-primary shrink-0 group-hover:text-secondary transition-colors" />
            <span className="font-headline text-xl font-bold text-foreground">Eden <span className="text-primary italic font-normal">Rencontre</span></span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar relative z-10">
          <div className="flex items-center gap-3 px-2 pb-3">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-secondary/80">Navigation</span>
            <Flourish className="flex-1 h-2.5 text-secondary/30" />
          </div>
          {sidebarNav.map((item) => {
            const active = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "w-full flex items-center gap-3.5 px-4 h-12 rounded-xl text-sm font-bold transition-all relative",
                  active ? "bg-secondary/10 text-primary" : "text-foreground/50 hover:text-foreground hover:bg-foreground/5"
                )}
              >
                {active && <motion.span layoutId="sidebarActive" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
                <item.icon className={cn("w-5 h-5 shrink-0", item.highlight && !active && "text-primary")} />
                <span className="flex-1 text-left">{item.name}</span>
                {item.badge ? (
                  <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center">{item.badge}</span>
                ) : item.dot ? (
                  <span className="w-2 h-2 bg-secondary rounded-full" />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 space-y-4 border-t border-sage/15 relative z-10">
          <div className="relative overflow-hidden rounded-t-3xl rounded-b-lg border border-sage/25 p-4 text-center bg-gradient-to-br from-sage/10 to-card">
            <ImposingFloralCorners size="sm" corners={["tl", "tr"]} opacity={0.5} />
            <VitrailPattern className="absolute inset-0 w-full h-full text-sage/[0.06] pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <Monogram className="w-9 h-8 text-secondary mb-2" />
              <p className="text-foreground font-headline font-bold text-sm">Eden Or</p>
              <p className="text-foreground/55 text-xs mt-1 mb-3 leading-relaxed">Visiteurs & messages illimités.</p>
              <Button onClick={() => setActiveTab("Premium")} className="w-full h-9 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-lg text-xs">
                S'élever
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-foreground/10">
              <AvatarImage src={myAvatar} />
              <AvatarFallback>{displayInitial}</AvatarFallback>
            </Avatar>
            <button onClick={() => setActiveTab("Profil")} className="flex-1 min-w-0 text-left group">
              <p className="text-foreground text-sm font-bold truncate group-hover:text-primary transition-colors">{displayName}</p>
              <p className="text-foreground/30 text-xs truncate">{displayLocation}</p>
            </button>
            <button
              onClick={async () => { await logout(); router.push("/login"); }}
              title="Se déconnecter"
              className="text-foreground/30 hover:text-destructive transition-colors p-1"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Colonne principale ===== */}
      <div className="lg:pl-[280px] pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-sage/15 h-20 flex items-center justify-between px-4 sm:px-6 lg:px-10 relative overflow-hidden">
          <ImposingFloralCorners size="sm" corners={["br"]} opacity={0.35} className="hidden lg:block" />
          {/* Mobile logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 lg:hidden">
            <Monogram className="w-9 h-8 text-primary shrink-0" />
            <span className="font-headline text-lg font-bold text-foreground">Eden <span className="text-primary italic font-normal">Rencontre</span></span>
          </Link>

          {/* Desktop page title */}
          <h1 className="hidden lg:block font-headline text-2xl font-bold text-foreground">{activeTab}</h1>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-xl bg-secondary/10 text-secondary font-bold text-xs hover:bg-secondary/20 transition-colors">
              <Zap className="w-4 h-4 fill-primary" /> Boost
            </button>
            {/* Le bouton Messages mène directement aux Notifications (inbox unifié) */}
            <button
              onClick={() => setActiveTab("Notifications")}
              title="Messages & notifications"
              className={cn("relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors", activeTab === "Notifications" ? "bg-secondary/10 text-primary" : "text-foreground/50 hover:text-foreground hover:bg-foreground/5")}
            >
              <MessageCircle className="w-5 h-5" />
              {totalUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[9px] font-black rounded-full flex items-center justify-center">{totalUnread}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("Profil")}
              className={cn("rounded-full transition-all", activeTab === "Profil" && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
            >
              <Avatar className="w-10 h-10 border border-foreground/10">
                <AvatarImage src={myAvatar} />
                <AvatarFallback>{displayInitial}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl lg:hidden flex flex-col p-8 pt-24 space-y-7 animate-in fade-in duration-300 overflow-y-auto">
          <button onClick={() => setMobileMenuOpen(false)} className="absolute top-8 right-8 text-foreground">
            <X className="w-10 h-10" />
          </button>
          {[...navigation, { name: "Messages", icon: MessageCircle }, { name: "Notifications", icon: Bell }, { name: "Profil", icon: Settings }].map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name as Tab);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "flex items-center gap-6 text-2xl font-headline font-bold transition-colors",
                activeTab === item.name ? "text-primary" : "text-foreground/60 hover:text-primary"
              )}
            >
              <item.icon className="w-8 h-8" />
              {item.name}
            </button>
          ))}
          <Button
            onClick={() => { setActiveTab("Premium"); setMobileMenuOpen(false); }}
            className="w-full h-16 text-xl font-bold bg-primary text-primary-foreground rounded-2xl"
          >
            Devenir Premium
          </Button>
        </div>
      )}

      <main className="px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto w-full">
        {activeTab === "Accueil" && showPremiumBanner && (
          <div className="relative border-y border-secondary/25 py-4 px-2 flex flex-col sm:flex-row items-center justify-center gap-x-5 gap-y-2 text-center">
            <button onClick={() => setShowPremiumBanner(false)} className="absolute right-2 top-2 text-foreground/25 hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
            <span className="text-[10px] uppercase tracking-[0.35em] text-secondary font-bold">Invitation</span>
            <p className="text-foreground/70 text-sm font-headline italic">
              « Élevez votre chemin avec <span className="text-secondary not-italic font-bold">Eden&nbsp;Or</span> — visibilité et accompagnement pastoral. »
            </p>
            <button
              onClick={() => setActiveTab("Premium")}
              className="text-secondary text-sm font-bold inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
            >
              Découvrir <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      </div>

      {/* ===== Navigation mobile (bottom) ===== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-secondary/15 h-[76px] flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {bottomNav.map((item) => {
          const active = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                active ? "text-primary" : "text-foreground/40 hover:text-foreground"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.name}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-foreground/40 hover:text-foreground transition-colors"
        >
          <Menu className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Menu</span>
        </button>
      </nav>
    </div>
  );
}

function FluentEmoji({ char, url, className }: { char: string; url: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) return <span className={cn("inline-flex items-center justify-center text-lg leading-none", className)}>{char}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={char} loading="lazy" draggable={false} className={className} onError={() => setErr(true)} />;
}

function PostActions({ likes, comments }: { likes: number; comments: number }) {
  const item = "flex items-center gap-2 px-3 h-9 rounded-lg text-foreground/50 hover:text-primary hover:bg-foreground/5 transition-colors text-xs font-bold";
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-secondary/15">
      <button className={item}><ThumbsUp className="w-4 h-4" /> {likes}</button>
      <button className={item}><MessageCircle className="w-4 h-4" /> {comments}</button>
      <button className={item}><Share2 className="w-4 h-4" /> Partager</button>
      <button className={item}><Bookmark className="w-4 h-4" /></button>
    </div>
  );
}

function TabHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-14 sm:h-14 bg-secondary/10 border border-secondary/25 rounded-t-2xl rounded-b-md flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-secondary" />
        </div>
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <h2 className="font-headline text-2xl sm:text-4xl font-bold text-foreground truncate">{title}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
        </div>
      </div>
      <Flourish className="w-40 h-3 text-secondary/40" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, cta, onClick }: { icon: any; title: string; text: string; cta: string; onClick?: () => void }) {
  return (
    <Card className="border border-secondary/15 bg-card rounded-t-[3rem] rounded-b-2xl py-16 px-8 text-center shadow-xl">
      <div className="w-20 h-20 mx-auto bg-secondary/10 border border-secondary/25 rounded-t-3xl rounded-b-lg flex items-center justify-center mb-5">
        <Icon className="w-9 h-9 text-secondary" />
      </div>
      <h3 className="font-headline text-2xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-5 leading-relaxed">{text}</p>
      <Flourish className="w-32 h-3 text-secondary/40 mx-auto mb-6" />
      <Button onClick={onClick} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 px-8 rounded-xl gap-2 shadow-lg shadow-primary/15">
        {cta} <ChevronRight className="w-5 h-5" />
      </Button>
    </Card>
  );
}

// Carte d'un membre réel (Supabase) — utilisée dans Découvrir, Favoris, Accueil.
function MemberCard({
  m,
  isFavorite,
  onToggleFav,
  onOpen,
  action,
  match,
}: {
  m: MemberProfile;
  isFavorite: boolean;
  onToggleFav: () => void;
  onOpen: () => void;
  action?: React.ReactNode;
  match?: number | null;
}) {
  const loc = [m.city, m.country].filter(Boolean).join(", ");
  return (
    <Card className="group overflow-hidden border-none bg-card hover:shadow-[0_20px_50px_rgba(198,166,79,0.14)] transition-all duration-500 rounded-2xl sm:rounded-3xl flex flex-col">
      <div className="relative aspect-[4/5]">
        <button onClick={onOpen} className="absolute inset-0 w-full h-full text-left">
          {m.avatar_url ? (
            <Image src={m.avatar_url} alt={m.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/15 to-card font-headline text-5xl font-bold text-secondary/70">{m.name?.[0]?.toUpperCase() || "?"}</span>
          )}
          {typeof match === "number" && (
            <Badge className="absolute top-2.5 left-2.5 bg-secondary text-secondary-foreground border-none font-black text-[10px] flex items-center gap-1 shadow-lg">
              <Heart className="w-3 h-3 fill-secondary-foreground" /> {match}%
            </Badge>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-70" />
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <h4 className="font-headline text-sm sm:text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">{m.name}</h4>
            {loc && <div className="flex items-center gap-1 text-primary text-[9px] sm:text-xs font-bold tracking-wide uppercase truncate"><MapPin className="w-3 h-3 shrink-0" /> {loc}</div>}
          </div>
        </button>
        <button
          onClick={onToggleFav}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={cn(
            "absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all",
            isFavorite ? "bg-primary text-primary-foreground border-primary" : "bg-black/30 text-foreground border-foreground/10 hover:bg-primary hover:text-primary-foreground"
          )}
        >
          <Star className={cn("w-4 h-4", isFavorite && "fill-primary-foreground")} />
        </button>
      </div>
      <div className="p-3 sm:p-4 bg-muted border-t border-secondary/15 flex flex-col gap-3">
        {m.profession && (
          <div className="flex items-center gap-2 text-foreground/50 text-xs font-medium">
            <Briefcase className="w-3.5 h-3.5 text-primary/60 shrink-0" />
            <span className="truncate">{m.profession}</span>
          </div>
        )}
        {action}
      </div>
    </Card>
  );
}

function ProfileCard({ profile, onClick }: { profile: any; onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
    <Card
      onClick={onClick}
      className="group overflow-hidden border-none bg-card hover:shadow-[0_20px_50px_rgba(198, 166, 79,0.14)] transition-all duration-500 cursor-pointer rounded-2xl sm:rounded-3xl relative"
    >
      <div className="relative aspect-[4/5]">
        <Image
          src={profile.image}
          alt={profile.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
          data-ai-hint="african portrait"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />

        <button className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center text-foreground border border-foreground/10 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
          <Star className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6">
          <div className="flex items-end justify-between gap-2">
            <div className="text-foreground space-y-0.5 sm:space-y-1 min-w-0">
              <h4 className="font-headline text-sm sm:text-xl font-bold truncate group-hover:text-primary transition-colors">{profile.name}, {profile.age}</h4>
              <div className="flex items-center gap-1 text-primary text-[9px] sm:text-xs font-bold tracking-widest uppercase truncate">
                <MapPin className="w-3 h-3 shrink-0" /> {profile.location}
              </div>
            </div>
            <Badge className="bg-primary/90 text-primary-foreground border-none font-black py-0.5 px-2 text-[10px] flex items-center gap-1 shadow-lg backdrop-blur-md shrink-0">
              <Heart className="w-3 h-3 fill-primary-foreground" /> {profile.match}
            </Badge>
          </div>
        </div>
      </div>
      <CardContent className="p-3 sm:p-5 bg-muted border-t border-secondary/15">
        <div className="flex items-center gap-2 sm:gap-3 text-foreground/50 text-xs sm:text-sm font-medium">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-foreground/5 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-secondary/10 transition-colors">
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/60" />
          </div>
          <span className="truncate group-hover:text-foreground transition-colors">{profile.profession}</span>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}