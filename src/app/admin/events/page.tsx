"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, CalendarDays, MapPin, Globe, Lock, ChevronLeft, ChevronRight,
  ExternalLink, Trash2, Loader2, Pencil, Users, Video, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";

interface Participant { user_id: string }

interface MeetEvent {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  meeting_link: string | null;
  location: string | null;
  event_date: string;
  participant_limit: number | null;
  is_public: boolean;
  status: "draft" | "published" | "cancelled" | string;
  event_participants?: Participant[];
}

type Tab = "upcoming" | "draft" | "past" | "cancelled" | "all";
type Counts = Record<Tab, number>;

const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "À venir" },
  { value: "draft", label: "Brouillons" },
  { value: "past", label: "Passés" },
  { value: "cancelled", label: "Annulés" },
  { value: "all", label: "Tous" },
];

const EMPTY: Record<Tab, { title: string; text: string }> = {
  upcoming: { title: "Aucun événement à venir", text: "Programmez la prochaine veillée, un atelier ou une rencontre en ligne : les membres seront prévenus dès sa publication." },
  draft: { title: "Aucun brouillon", text: "Les événements en préparation apparaîtront ici tant qu'ils ne sont pas publiés." },
  past: { title: "Aucun événement passé", text: "L'historique des événements terminés se construira ici au fil du temps." },
  cancelled: { title: "Aucun événement annulé", text: "Tant mieux ! Les événements annulés resteront consultables ici." },
  all: { title: "Aucun événement pour l'instant", text: "Créez le premier événement de la communauté : veillée de prière, atelier ou rencontre." },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  published: { label: "Publié", className: "bg-primary/10 text-primary" },
  draft: { label: "Brouillon", className: "bg-muted text-[#56615A]" },
  cancelled: { label: "Annulé", className: "bg-destructive/10 text-destructive" },
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<MeetEvent[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Recherche différée : pas un appel serveur par touche
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab, page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/events?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Chargement impossible.");
      setEvents(data.events || []);
      setTotalPages(data.totalPages || 1);
      setCounts(data.counts || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Suppression impossible.");
      setConfirmingId(null);
      fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Événements"
        subtitle="Veillées, ateliers et rencontres proposés aux membres."
        actions={
          <Link href="/admin/events/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Créer un événement
          </Link>
        }
      />

      {/* Onglets + recherche, sur une ligne */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div role="tablist" aria-label="Filtrer les événements" className="flex gap-1 p-1 bg-card border border-border rounded-xl overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.value} role="tab" aria-selected={tab === t.value}
              onClick={() => { setTab(t.value); setPage(1); setConfirmingId(null); }}
              className={cn("px-3 h-9 rounded-lg text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors",
                tab === t.value ? "bg-primary text-primary-foreground" : "text-[#56615A] hover:bg-muted/70")}>
              {t.label}
              {counts && (
                <span className={cn("min-w-[20px] h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center",
                  tab === t.value ? "bg-white/20" : "bg-muted")}>{counts[t.value]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative lg:ml-auto lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Rechercher un événement"
            placeholder="Rechercher : titre, lieu, description"
            className="w-full h-11 pl-9 pr-9 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
          {searchInput && (
            <button onClick={() => setSearchInput("")} aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Fermer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Liste */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-14 h-16 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2"><div className="h-4 w-1/2 bg-muted rounded animate-pulse" /><div className="h-3 w-1/3 bg-muted rounded animate-pulse" /></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-14 max-w-[560px] mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <CalendarDays className="w-7 h-7 text-primary" />
            </div>
            <p className="text-base font-bold text-foreground">{search ? "Aucun événement ne correspond" : EMPTY[tab].title}</p>
            <p className="text-sm text-[#56615A] mt-1.5">{search ? `Aucun résultat pour « ${search} » dans cet onglet.` : EMPTY[tab].text}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {search ? (
                <button onClick={() => setSearchInput("")} className="h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted/60">Effacer la recherche</button>
              ) : (
                <>
                  <Link href="/admin/events/new" className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Créer un événement</Link>
                  {tab !== "all" && <button onClick={() => setTab("all")} className="h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted/60">Voir tous les événements</button>}
                </>
              )}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((ev) => {
              const d = new Date(ev.event_date);
              const past = d.getTime() < now;
              const badge = STATUS_BADGE[ev.status] || { label: ev.status, className: "bg-muted text-[#56615A]" };
              const invitedCount = ev.event_participants?.length || 0;
              return (
                <li key={ev.id} className={cn("flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 hover:bg-muted/30 transition-colors", ev.status === "cancelled" && "opacity-70")}>
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Date */}
                    <div className={cn("w-14 shrink-0 rounded-xl border text-center py-1.5", past ? "border-border bg-muted/40" : "border-primary/25 bg-primary/5")}>
                      <p className="text-[10px] font-bold uppercase text-[#56615A]">{d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</p>
                      <p className={cn("text-xl font-bold leading-tight", past ? "text-[#56615A]" : "text-primary")}>{d.getDate()}</p>
                      <p className="text-[10px] font-semibold text-[#6B746E]">{d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>

                    {ev.cover_image_url && (
                      <img src={ev.cover_image_url} alt="" className="hidden md:block w-20 h-16 rounded-xl object-cover border border-border shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/admin/events/${ev.id}/edit`} className="text-[15px] font-bold text-foreground hover:text-primary truncate">{ev.title}</Link>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", badge.className)}>{badge.label}</span>
                        {past && ev.status !== "cancelled" && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-[#6B746E]">Terminé</span>}
                      </div>
                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1 text-xs text-[#56615A]">
                        <span className="flex items-center gap-1 capitalize">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })}
                        </span>
                        {ev.meeting_link && <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> En ligne</span>}
                        {ev.location && <span className="flex items-center gap-1 truncate max-w-[220px]"><MapPin className="w-3.5 h-3.5 shrink-0" /> {ev.location}</span>}
                        <span className="flex items-center gap-1">
                          {ev.is_public ? <><Globe className="w-3.5 h-3.5" /> Tous les membres</> : <><Lock className="w-3.5 h-3.5" /> Sur invitation</>}
                        </span>
                        {(invitedCount > 0 || ev.participant_limit) && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {invitedCount > 0 && `${invitedCount} invité${invitedCount > 1 ? "s" : ""}`}
                            {invitedCount > 0 && ev.participant_limit ? " · " : ""}
                            {ev.participant_limit ? `${ev.participant_limit} places` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:shrink-0 pl-[72px] sm:pl-0">
                    {confirmingId === ev.id ? (
                      <>
                        <span className="text-xs font-semibold text-destructive">Supprimer définitivement ?</span>
                        <button onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}
                          className="h-9 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                          {deletingId === ev.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Supprimer
                        </button>
                        <button onClick={() => setConfirmingId(null)} className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted/60">Annuler</button>
                      </>
                    ) : (
                      <>
                        <Link href={`/admin/events/${ev.id}/edit`}
                          className="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" /> Modifier
                        </Link>
                        {ev.meeting_link && (
                          <a href={ev.meeting_link} target="_blank" rel="noopener noreferrer" title="Ouvrir le lien de la réunion" aria-label="Ouvrir le lien de la réunion"
                            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => setConfirmingId(ev.id)} title="Supprimer" aria-label={`Supprimer ${ev.title}`}
                          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-[#56615A] font-medium">Page {page} sur {totalPages}</p>
          <div className="flex gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Page précédente"
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-[#56615A] hover:bg-muted/60 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Page suivante"
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-[#56615A] hover:bg-muted/60 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
