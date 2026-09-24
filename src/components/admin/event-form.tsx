"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, CalendarDays, Globe, ImagePlus, Link2, Loader2, Lock, MapPin, Search, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Formulaire unique des événements (création et modification).
 *
 * Les dates sont saisies et affichées dans le fuseau du navigateur de l'admin,
 * puis envoyées au serveur en ISO (UTC) : l'heure choisie est celle que verront
 * les membres, sans décalage à chaque enregistrement.
 */

export interface EventMember {
  id: string;
  name: string | null;
  pseudo?: string | null;
  email: string | null;
  avatar_url?: string | null;
}

export interface EventFormInitial {
  id?: string;
  title?: string;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  meeting_link?: string | null;
  cover_image_url?: string | null;
  participant_limit?: number | null;
  is_public?: boolean;
  status?: string;
  participants?: EventMember[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO (UTC) → { date: AAAA-MM-JJ, time: HH:MM } dans le fuseau local. */
function toLocalParts(iso?: string | null) {
  if (!iso) return { date: "", time: "18:00" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "18:00" };
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** Date + heure locales → ISO (UTC). */
function toIso(date: string, time: string) {
  const d = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const memberLabel = (m: EventMember) => m.pseudo || m.name || m.email || "Membre";

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors";

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{step}</span>
        <div>
          <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
          {hint && <p className="text-xs text-[#56615A] mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, required, children, help }: { label: string; htmlFor?: string; required?: boolean; children: React.ReactNode; help?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {help && <p className="text-xs text-[#6B746E]">{help}</p>}
    </div>
  );
}

export function EventForm({ initial, mode }: { initial?: EventFormInitial; mode: "create" | "edit" }) {
  const router = useRouter();
  const start = toLocalParts(initial?.event_date);

  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [location, setLocation] = useState(initial?.location || "");
  const [meetingLink, setMeetingLink] = useState(initial?.meeting_link || "");
  const [places, setPlaces] = useState(initial?.participant_limit ? String(initial.participant_limit) : "");
  const [isPublic, setIsPublic] = useState(initial?.is_public !== false);
  const [status, setStatus] = useState(initial?.status || "draft");
  const [invited, setInvited] = useState<EventMember[]>(initial?.participants || []);

  // Image de couverture : existante (URL) ou nouveau fichier à envoyer
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.cover_image_url || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Recherche de membres à inviter
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EventMember[]>([]);
  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}&limit=8`);
        const d = await r.json().catch(() => ({}));
        setResults((d.users || []).filter((u: EventMember) => !invited.some((x) => x.id === u.id)));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, invited]);

  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const pickCover = (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setError("Image : formats JPG, PNG, WebP ou GIF."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image trop lourde (5 Mo maximum)."); return; }
    setError(null);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isPast = (() => { const iso = date ? toIso(date, time) : null; return !!iso && new Date(iso) < new Date(); })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const eventDate = date ? toIso(date, time) : null;
    if (!title.trim()) return setError("Donnez un titre à l'événement.");
    if (!eventDate) return setError("Choisissez une date et une heure.");
    const placesNum = places.trim() ? parseInt(places, 10) : null;
    if (placesNum !== null && (!Number.isInteger(placesNum) || placesNum < 1)) return setError("Le nombre de places doit être un nombre positif.");
    if (!isPublic && invited.length === 0 && status === "published") return setError("Un événement sur invitation doit avoir au moins un membre invité.");

    setSaving(true);
    try {
      let cover = coverUrl;
      if (coverFile) {
        const fd = new FormData();
        fd.append("file", coverFile);
        const up = await fetch("/api/admin/events/upload-image", { method: "POST", body: fd });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok || !upData.url) throw new Error(upData.error || "Échec de l'envoi de l'image.");
        cover = upData.url;
      }

      const body = {
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        location: location.trim() || null,
        meeting_link: meetingLink.trim() || null,
        cover_image_url: cover,
        participant_limit: placesNum,
        is_public: isPublic,
        status,
        participant_ids: invited.map((m) => m.id),
      };
      const res = await fetch(mode === "create" ? "/api/admin/events" : `/api/admin/events/${initial?.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible.");
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  };

  const shownCover = coverPreview || coverUrl;
  const statusOptions = [
    { value: "draft", label: "Brouillon", help: "Invisible pour les membres. Vous pourrez le publier plus tard." },
    { value: "published", label: "Publié", help: isPublic ? "Visible par tous les membres approuvés, qui reçoivent une notification." : "Visible par les membres invités, qui reçoivent une notification." },
    ...(mode === "edit" ? [{ value: "cancelled", label: "Annulé", help: "Retiré de l'espace membre. L'événement reste dans l'historique." }] : []),
  ];

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-5">
      {/* 1. L'essentiel */}
      <Section step={1} title="L'essentiel">
        <Field label="Titre" htmlFor="ev-title" required>
          <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="Ex : Veillée de prière pour les célibataires" className={inputClass} />
        </Field>
        <Field label="Description" htmlFor="ev-desc" help="Ce que les membres vont vivre, et comment se préparer.">
          <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
            placeholder="Déroulé, intervenants, thème…" className={cn(inputClass, "h-auto py-3 resize-y min-h-[110px]")} />
        </Field>
      </Section>

      {/* 2. Quand et où */}
      <Section step={2} title="Quand et où" hint="L'heure est celle de votre fuseau horaire ; chaque membre la verra dans le sien.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date" htmlFor="ev-date" required>
            <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Heure" htmlFor="ev-time" required>
            <input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </Field>
        </div>
        {isPast && (
          <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Cette date est déjà passée.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lien de la réunion en ligne" htmlFor="ev-link" help="Facultatif, si l'événement a lieu en ligne.">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="ev-link" type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://…" className={cn(inputClass, "pl-9")} />
            </div>
          </Field>
          <Field label="Lieu" htmlFor="ev-place" help="Facultatif, si l'événement a lieu en présentiel.">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="ev-place" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex : Douala, Akwa" className={cn(inputClass, "pl-9")} />
            </div>
          </Field>
        </div>
      </Section>

      {/* 3. Image */}
      <Section step={3} title="Image de couverture" hint="Facultative. Affichée en tête de l'événement dans l'espace membre.">
        {shownCover ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={shownCover} alt="Couverture de l'événement" className="w-full h-52 object-cover" />
            <div className="absolute top-2 right-2 flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="h-8 px-3 rounded-full bg-black/60 text-white text-xs font-semibold hover:bg-black/75">Remplacer</button>
              <button type="button" onClick={removeCover} aria-label="Retirer l'image"
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/75"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
            <ImagePlus className="w-6 h-6" />
            <span className="text-sm font-semibold">Ajouter une image</span>
            <span className="text-xs">JPG, PNG, WebP ou GIF — 5 Mo maximum</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
          onChange={(e) => pickCover(e.target.files?.[0])} />
      </Section>

      {/* 4. Participants */}
      <Section step={4} title="Qui peut participer ?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Visibilité">
          {[
            { value: true, icon: Globe, label: "Tous les membres", help: "Visible par tous les membres approuvés." },
            { value: false, icon: Lock, label: "Sur invitation", help: "Visible uniquement par les membres invités." },
          ].map((opt) => (
            <button key={String(opt.value)} type="button" role="radio" aria-checked={isPublic === opt.value}
              onClick={() => setIsPublic(opt.value)}
              className={cn("text-left rounded-xl border p-4 transition-colors",
                isPublic === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><opt.icon className="w-4 h-4 text-primary" /> {opt.label}</span>
              <span className="block text-xs text-[#6B746E] mt-1">{opt.help}</span>
            </button>
          ))}
        </div>

        <Field label={isPublic ? "Membres à inviter personnellement (facultatif)" : "Membres invités"} htmlFor="ev-invite"
          help={isPublic ? "Ils sont déjà concernés, comme tous les membres ; les inviter permet de les suivre dans la liste." : undefined}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input id="ev-invite" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un membre par nom, pseudo ou e-mail" className={cn(inputClass, "pl-9 pr-9")} />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
            {results.length > 0 && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {results.map((u) => (
                  <button key={u.id} type="button" onClick={() => { setInvited((p) => [...p, u]); setQuery(""); setResults([]); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-8 h-8 object-cover" /> : memberLabel(u).charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">{memberLabel(u)}</span>
                      <span className="block text-xs text-[#6B746E] truncate">{u.email}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        {invited.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {invited.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {memberLabel(m)}
                <button type="button" onClick={() => setInvited((p) => p.filter((x) => x.id !== m.id))} aria-label={`Retirer ${memberLabel(m)}`}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-primary/15"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        <Field label="Nombre de places" htmlFor="ev-places" help="Laissez vide pour un nombre illimité.">
          <div className="relative max-w-[200px]">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input id="ev-places" type="number" min={1} inputMode="numeric" value={places} onChange={(e) => setPlaces(e.target.value)}
              placeholder="Illimité" className={cn(inputClass, "pl-9")} />
          </div>
        </Field>
      </Section>

      {/* 5. Publication */}
      <Section step={5} title="Publication">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Statut">
          {statusOptions.map((opt) => (
            <button key={opt.value} type="button" role="radio" aria-checked={status === opt.value} onClick={() => setStatus(opt.value)}
              className={cn("text-left rounded-xl border p-4 transition-colors",
                status === opt.value
                  ? opt.value === "cancelled" ? "border-destructive/60 bg-destructive/5" : "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40")}>
              <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
              <span className="block text-xs text-[#6B746E] mt-1">{opt.help}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Barre d'actions */}
      <div className="sticky bottom-0 z-20 -mx-3 sm:mx-0 bg-background/95 backdrop-blur border-t border-border sm:rounded-t-2xl">
        <div className="px-3 sm:px-1 py-3 flex flex-wrap items-center gap-3">
          {error ? (
            <p role="alert" className="flex-1 min-w-[200px] text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</p>
          ) : (
            <p className="flex-1 min-w-[200px] text-xs text-[#6B746E] flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 shrink-0" />
              {date ? new Date(toIso(date, time) || Date.now()).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "Date à définir"}
            </p>
          )}
          <button type="button" onClick={() => router.push("/admin/events")}
            className="h-11 px-5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/60">Annuler</button>
          <button type="submit" disabled={saving}
            className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? (status === "published" ? "Publier l'événement" : "Enregistrer le brouillon") : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </form>
  );
}
