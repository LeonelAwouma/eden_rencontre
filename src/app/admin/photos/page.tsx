"use client";

/**
 * Admin → Import de photos.
 *
 * Procédure EXCEPTIONNELLE : pour les membres qui n'ont pas réussi à importer
 * leurs photos à l'inscription (issue de secours « Je n'arrive pas à importer
 * mes photos »), l'admin importe les photos que le membre lui a envoyées.
 * Elle ne remplace pas l'inscription normale. Seules les 3 photos de profil sont
 * concernées : le selfie reste pris par le membre, et la photo publique est
 * choisie par le membre à sa connexion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Search, Upload, X, ExternalLink, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { preparePhoto } from "@/lib/image-compress";
import { uploadRegistrationMedia } from "@/lib/registration-media-client";

interface MemberRow {
  id: string;
  name: string | null;
  pseudo: string | null;
  email: string | null;
  status: string | null;
  created_at?: string | null;
  photoCount?: number;
}

const SLOTS = 3;

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approuvé", className: "bg-[#486B46]/10 text-[#2E4A36] border-[#486B46]/20" },
  suspended: { label: "Suspendu", className: "bg-red-50 text-red-700 border-red-200" },
  rejected: { label: "Refusé", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const labelOf = (m: MemberRow) => m.pseudo || m.name || m.email || "Membre";
const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS[status || ""] ?? { label: status || "—", className: "bg-gray-100 text-gray-600 border-gray-200" };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", s.className)}>{s.label}</span>;
}

export default function AdminPhotoImportPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberRow[] | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/photos");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setListError(data.error || "Impossible de charger les membres."); return; }
      setListError(null);
      setMembers(data.members || []);
    } catch { setListError("Impossible de charger les membres."); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // Lien direct depuis une notification ou la fiche membre : /admin/photos?user=<id>
  useEffect(() => {
    const user = new URLSearchParams(window.location.search).get("user");
    if (user) setSelectedId(user);
  }, []);

  // Recherche de n'importe quel membre (même avec ses 3 photos, pour les remplacer).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return; }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?scope=all&limit=15&q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => ({}));
        setResults(Array.isArray(data.users) ? data.users : []);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const list = results ?? members;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import de photos"
        subtitle="Procédure exceptionnelle pour les membres qui n'ont pas réussi à importer leurs photos à l'inscription. Elle ne remplace pas l'inscription normale : importez uniquement les photos que le membre vous a envoyées."
      />

      {listError && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{listError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        {/* ── Membres sans photos / recherche ── */}
        <section aria-label="Membres" className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <label htmlFor="photo-member-search" className="sr-only">Rechercher un membre</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="photo-member-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un membre (nom, pseudo, e-mail)…"
                className="w-full h-10 rounded-xl border border-input bg-card pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {results ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : `${members.length} membre${members.length > 1 ? "s" : ""} sans ses 3 photos`}
            </p>
          </div>

          {loadingList && !results ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={ImagePlus}
              title={results ? "Aucun membre trouvé" : "Tout le monde a ses photos"}
              description={results ? "Essayez avec une autre partie du nom ou de l'adresse e-mail." : "Aucun membre n'attend d'import de photos pour le moment."}
            />
          ) : (
            <ul className="divide-y divide-border max-h-[65vh] overflow-y-auto">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-colors",
                      selectedId === m.id && "bg-primary/5"
                    )}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground truncate">{labelOf(m)}</span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {m.email}{m.created_at ? ` · inscrit le ${formatDate(m.created_at)}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={m.status} />
                      {typeof m.photoCount === "number" && <span className="text-[11px] text-muted-foreground tabular-nums">{m.photoCount}/{SLOTS} photos</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Import pour le membre choisi ── */}
        {selectedId ? (
          <MemberPhotoImport key={selectedId} memberId={selectedId} onImported={loadList} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card">
            <EmptyState icon={Upload} title="Choisissez un membre" description="Sélectionnez un membre dans la liste pour importer les photos qu'il vous a envoyées." />
          </div>
        )}
      </div>
    </div>
  );
}

function MemberPhotoImport({ memberId, onImported, onClose }: { memberId: string; onImported: () => void; onClose: () => void }) {
  const [member, setMember] = useState<MemberRow | null>(null);
  const [current, setCurrent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [prepared, setPrepared] = useState<(string | null)[]>(() => Array(SLOTS).fill(null));
  const [processing, setProcessing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const slotRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/photos/${memberId}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) { setError(data.error || "Membre introuvable."); return; }
        setMember(data.member);
        setCurrent(data.photos || []);
      } catch { if (active) setError("Membre introuvable."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [memberId]);

  const ready = useMemo(() => prepared.filter((p): p is string => !!p), [prepared]);

  const pick = (slot: number) => {
    if (processing !== null || saving) return;
    slotRef.current = slot;
    inputRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const slot = slotRef.current;
    if (!file || slot === null) return;
    setError(null);
    setNotice(null);
    setProcessing(slot);
    const res = await preparePhoto(file);
    setProcessing(null);
    if (!res.ok) {
      setError(res.reason === "heic"
        ? "Photo au format HEIC, illisible par ce navigateur. Demandez au membre une photo JPEG ou une capture d'écran, ou convertissez-la avant l'import."
        : "Cette image n'a pas pu être lue. Essayez une photo JPEG ou PNG.");
      return;
    }
    setPrepared((prev) => { const next = [...prev]; next[slot] = res.dataUrl; return next; });
  };

  const save = async () => {
    if (ready.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const media = await uploadRegistrationMedia({ photos: ready, selfie: null, frames: [], slotsUrl: `/api/admin/photos/${memberId}/slots` });
      const res = await fetch(`/api/admin/photos/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: media.profilePhotoPaths }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Photos non enregistrées. Réessayez."); return; }
      setCurrent(data.photos || []);
      setPrepared(Array(SLOTS).fill(null));
      setMember((m) => (m ? { ...m, photoCount: (data.photos || []).length } : m));
      setNotice("Photos importées. Le membre choisira sa photo publique à sa prochaine connexion.");
      onImported();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Import impossible. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <section aria-label="Import des photos du membre" className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{member ? labelOf(member) : "Membre"}</h2>
          {member && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{member.email}</span>
              <StatusBadge status={member.status} />
              <Link href={`/admin/users/${memberId}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Voir la fiche <ExternalLink className="w-3 h-3" />
              </Link>
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {notice}
        </p>
      )}

      {member && (
        <>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Photos actuelles ({current.length}/{SLOTS})</p>
            {current.length ? (
              <div className="flex flex-wrap gap-2">
                {current.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="w-20 h-20 rounded-lg overflow-hidden border border-border hover:border-primary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo actuelle ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune photo pour le moment.</p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Photos reçues du membre</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void onFile(f); }} />
            <div className="grid grid-cols-3 gap-3">
              {prepared.map((src, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-xl border border-dashed border-border bg-muted/40 overflow-hidden">
                  {src ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Photo ${i + 1} à importer`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPrepared((prev) => { const next = [...prev]; next[i] = null; return next; })}
                        disabled={saving} aria-label={`Retirer la photo ${i + 1}`}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-50">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : processing === i ? (
                    <div role="status" className="w-full h-full flex flex-col items-center justify-center gap-2 text-primary">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-[11px] font-semibold">Préparation…</span>
                    </div>
                  ) : (
                    <button type="button" onClick={() => pick(i)} disabled={processing !== null || saving}
                      className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50">
                      <Upload className="w-5 h-5" />
                      <span className="text-[11px] font-semibold">Photo {i + 1}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {current.length > 0 && ready.length > 0 && (
              <p className="text-xs text-amber-700">Les photos actuelles seront remplacées par celles-ci.</p>
            )}
            <button type="button" onClick={save} disabled={ready.length === 0 || saving || processing !== null}
              className="w-full h-11 rounded-xl bg-[#486B46] text-white text-sm font-semibold hover:bg-[#3D5C3C] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {saving
                ? "Import en cours…"
                : ready.length === 0
                  ? "Importer les photos"
                  : `${current.length > 0 ? "Remplacer par" : "Importer"} ${ready.length} photo${ready.length > 1 ? "s" : ""}`}
            </button>
            <p className="text-xs text-muted-foreground">
              Seules les photos de profil privées sont importées ici. Le selfie reste pris par le membre, et il choisira lui-même sa photo publique à sa connexion.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
