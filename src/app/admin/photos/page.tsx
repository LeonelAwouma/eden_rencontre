"use client";

/**
 * Admin → Import de fichiers.
 *
 * Procédure EXCEPTIONNELLE pour les membres qui n'ont pas réussi à terminer leur
 * inscription en ligne : ils envoient sur WhatsApp la fiche d'inscription Word
 * remplie (src/lib/registration-form.ts) ou leurs photos, et l'admin les importe
 * ici (c'est le seul endroit où la fiche vierge se télécharge). La fiche crée le
 * compte s'il n'existe pas (l'admin envoie alors le mot de passe provisoire sur
 * WhatsApp) ou complète le parcours (identité, situation, pays, ville, valeurs,
 * téléphone). Les 3 photos arrivent à part sur WhatsApp, pas dans le document.
 * Le selfie, la charte et la photo publique restent faits par le membre.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileUp, FileText, Download, ImagePlus, KeyRound, UserPlus, Copy, Loader2, Search, Upload, X, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { preparePhoto } from "@/lib/image-compress";
import { uploadRegistrationMedia } from "@/lib/registration-media-client";
import { getValue } from "@/lib/values";
import { SUPPORT_PHONE_DISPLAY } from "@/lib/contact";
import {
  FORM_FIELDS, PROFILE_FORM_KEYS, REGISTRATION_FORM_URL, parseRegistrationForm,
  type FormFieldKey, type FormValue, type ParsedRegistrationForm,
} from "@/lib/registration-form";

interface MemberRow {
  id: string;
  name: string | null;
  pseudo: string | null;
  email: string | null;
  status: string | null;
  created_at?: string | null;
  photoCount?: number;
  missing?: string[];
}

type ProfileKey = (typeof PROFILE_FORM_KEYS)[number];
type Answers = Partial<Record<ProfileKey, FormValue | null>>;

/** Fiche lue, en attente d'être appliquée au membre. */
interface LoadedForm extends ParsedRegistrationForm { fileName: string }

const SLOTS = 3;
const WORD_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approuvé", className: "bg-[#486B46]/10 text-[#2E4A36] border-[#486B46]/20" },
  suspended: { label: "Suspendu", className: "bg-red-50 text-red-700 border-red-200" },
  rejected: { label: "Refusé", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const labelOf = (m: MemberRow) => m.pseudo || m.name || m.email || "Membre";
const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");
const isWordFile = (f: File) => /\.docx$/i.test(f.name) || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function displayValue(key: FormFieldKey, value: FormValue | null | undefined): string {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "";
  if (key === "gender") return value === "homme" ? "Homme" : value === "femme" ? "Femme" : String(value);
  if (key === "birthDate" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  }
  if (key === "marriageVision") return (Array.isArray(value) ? value : [value]).map((id) => getValue(id).label).join(", ");
  return Array.isArray(value) ? value.join(", ") : String(value);
}

const sameValue = (a: FormValue | null | undefined, b: FormValue | null | undefined) =>
  JSON.stringify(Array.isArray(a) ? [...a].sort() : typeof a === "string" ? a.slice(0, 10) : a ?? null)
  === JSON.stringify(Array.isArray(b) ? [...b].sort() : typeof b === "string" ? b.slice(0, 10) : b ?? null);

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS[status || ""] ?? { label: status || "—", className: "bg-gray-100 text-gray-600 border-gray-200" };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", s.className)}>{s.label}</span>;
}

async function readForm(file: File): Promise<LoadedForm> {
  const parsed = await parseRegistrationForm(file);
  if (parsed.recognized === 0) throw new Error("Ce document n'est pas la fiche d'inscription Garden of Alliance.");
  return { ...parsed, fileName: file.name };
}

export default function AdminFileImportPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberRow[] | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Fiche déposée avant d'avoir choisi un membre : il est retrouvé par son e-mail.
  const [pendingForm, setPendingForm] = useState<LoadedForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [readingForm, setReadingForm] = useState(false);
  const formInputRef = useRef<HTMLInputElement | null>(null);
  // Fiche d'un membre sans compte : l'admin le crée, puis transmet le mot de passe.
  const [newAccountForm, setNewAccountForm] = useState<LoadedForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: string; email: string; password: string; phone?: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Recherche de n'importe quel membre (même au parcours complet, pour le corriger).
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

  const importForm = async (file: File | undefined) => {
    if (!file) return;
    setFormError(null);
    setNewAccountForm(null);
    setCreated(null);
    if (!isWordFile(file)) { setFormError("Déposez la fiche au format Word (.docx). Les photos s'importent après avoir choisi le membre."); return; }
    setReadingForm(true);
    try {
      const form = await readForm(file);
      const email = form.values.email as string | undefined;
      if (!email) { setFormError("La fiche ne contient pas d'adresse e-mail lisible : choisissez le membre dans la liste, puis importez la fiche."); return; }
      const res = await fetch(`/api/admin/users/search?scope=all&limit=5&q=${encodeURIComponent(email)}`);
      const data = await res.json().catch(() => ({}));
      const match = (Array.isArray(data.users) ? data.users as MemberRow[] : []).find((u) => u.email?.toLowerCase() === email);
      if (!match) { setNewAccountForm(form); return; }
      setPendingForm(form);
      setSelectedId(match.id);
    } catch (err) {
      setFormError(err instanceof Error && err.message ? err.message : "Fiche illisible.");
    } finally {
      setReadingForm(false);
    }
  };

  const createAccount = async () => {
    if (!newAccountForm) return;
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: newAccountForm.values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(data.error || "Création du compte impossible."); return; }
      setCreated(data);
      setNewAccountForm(null);
      setPendingForm(null);
      setSelectedId(data.id);
      loadList();
    } catch { setFormError("Création du compte impossible."); }
    finally { setCreating(false); }
  };

  const passwordMessage = created
    ? `Bonjour, votre compte Garden of Alliance est créé. Adresse e-mail : ${created.email} — mot de passe provisoire : ${created.password}. Vous pourrez le changer depuis « Mot de passe oublié ». Envoyez-nous vos 3 photos sur ce numéro (${SUPPORT_PHONE_DISPLAY}) si ce n'est pas déjà fait.`
    : "";
  const whatsappUrl = created ? `https://wa.me/${(created.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(passwordMessage)}` : "";

  const list = results ?? members;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import de fichiers"
        subtitle="Procédure exceptionnelle pour les membres qui n'ont pas réussi à terminer leur inscription en ligne. Envoyez la fiche vierge au membre ; importez-la ici une fois remplie, puis ses 3 photos reçues sur WhatsApp : son compte et son parcours sont complétés."
        actions={
          <a href={REGISTRATION_FORM_URL} download className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 h-10 text-sm font-semibold text-foreground hover:bg-muted">
            <Download className="w-4 h-4" /> Fiche vierge (.docx)
          </a>
        }
      />

      {listError && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{listError}</p>}

      {/* ── Dépôt d'une fiche : le membre est retrouvé par l'e-mail qu'elle contient ── */}
      <section aria-label="Importer une fiche d'inscription" className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
        <input ref={formInputRef} type="file" accept={WORD_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void importForm(f); }} />
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void importForm(e.dataTransfer.files?.[0]); }}
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Fiche d'inscription reçue sur WhatsApp</p>
            <p className="text-xs text-muted-foreground">Déposez le fichier .docx ici : le membre est retrouvé par l'adresse e-mail de la fiche (son compte est créé s'il n'existe pas), puis vous vérifiez ses réponses avant de les enregistrer. Ses 3 photos arrivent à part sur WhatsApp.</p>
          </div>
          <button type="button" onClick={() => formInputRef.current?.click()} disabled={readingForm}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#486B46] text-white text-sm font-semibold hover:bg-[#3D5C3C] disabled:opacity-50">
            {readingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {readingForm ? "Lecture…" : "Importer une fiche"}
          </button>
        </div>
        {formError && <p role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive">{formError}</p>}

        {newAccountForm && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <UserPlus className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span>Aucun compte avec l'adresse <strong>{newAccountForm.values.email as string}</strong>. Créer le compte de {newAccountForm.values.firstName as string} {newAccountForm.values.lastName as string} à partir de la fiche ?</span>
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {FORM_FIELDS.filter((f) => f.key !== "email" && newAccountForm.values[f.key] !== undefined).map((f) => (
                <li key={f.key}><span className="font-semibold text-foreground">{f.label} :</span> {displayValue(f.key, newAccountForm.values[f.key])}</li>
              ))}
            </ul>
            {newAccountForm.issues.length > 0 && (
              <p className="text-xs text-amber-700">À vérifier avec le membre : {newAccountForm.issues.map((i) => FORM_FIELDS.find((f) => f.key === i.key)?.label).join(", ")}. Ces réponses ne seront pas enregistrées ; la création exige que les champs obligatoires soient lisibles.</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={createAccount} disabled={creating}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#486B46] text-white text-sm font-semibold hover:bg-[#3D5C3C] disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Créer le compte
              </button>
              <button type="button" onClick={() => setNewAccountForm(null)} disabled={creating} className="h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Annuler</button>
            </div>
          </div>
        )}

        {created && (
          <div role="status" className="mt-4 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound className="w-4 h-4 text-primary" /> Compte créé — envoyez le mot de passe au membre</p>
            <p className="text-sm text-muted-foreground">{created.email} · mot de passe provisoire : <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{created.password}</code></p>
            <p className="text-xs text-amber-700">Ce mot de passe ne sera plus affiché après cette page. Importez ensuite ses 3 photos (reçues à part sur WhatsApp) dans le panneau ci-dessous.</p>
            <div className="flex flex-wrap gap-2">
              {created.phone && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#486B46] text-white text-sm font-semibold hover:bg-[#3D5C3C]">
                  Envoyer sur WhatsApp
                </a>
              )}
              <button type="button" onClick={() => { void navigator.clipboard?.writeText(passwordMessage).then(() => setCopied(true)); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
                <Copy className="w-4 h-4" /> {copied ? "Message copié" : "Copier le message"}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        {/* ── Membres au parcours incomplet / recherche ── */}
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
              {results ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : `${members.length} membre${members.length > 1 ? "s" : ""} au parcours incomplet`}
            </p>
          </div>

          {loadingList && !results ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={ImagePlus}
              title={results ? "Aucun membre trouvé" : "Tous les parcours sont complets"}
              description={results ? "Essayez avec une autre partie du nom ou de l'adresse e-mail." : "Aucun membre n'attend d'import pour le moment."}
            />
          ) : (
            <ul className="divide-y divide-border max-h-[65vh] overflow-y-auto">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => { setPendingForm(null); setSelectedId(m.id); }}
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
                      {m.missing && m.missing.length > 0 && (
                        <span className="block text-[11px] text-amber-700 truncate">Manque : {m.missing.join(", ")}</span>
                      )}
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
          <MemberImport
            key={`${selectedId}:${pendingForm?.fileName ?? ""}`}
            memberId={selectedId}
            initialForm={pendingForm}
            onImported={loadList}
            onClose={() => { setSelectedId(null); setPendingForm(null); }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card">
            <EmptyState icon={Upload} title="Choisissez un membre" description="Sélectionnez un membre dans la liste, ou importez directement sa fiche d'inscription." />
          </div>
        )}
      </div>
    </div>
  );
}

function MemberImport({ memberId, initialForm, onImported, onClose }: { memberId: string; initialForm: LoadedForm | null; onImported: () => void; onClose: () => void }) {
  const [member, setMember] = useState<MemberRow | null>(null);
  const [current, setCurrent] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<LoadedForm | null>(initialForm);
  const [apply, setApply] = useState<Partial<Record<ProfileKey, boolean>>>({});
  const [readingForm, setReadingForm] = useState(false);

  const [prepared, setPrepared] = useState<(string | null)[]>(() => Array(SLOTS).fill(null));
  const [processing, setProcessing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formInputRef = useRef<HTMLInputElement | null>(null);
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
        setAnswers(data.answers || {});
      } catch { if (active) setError("Membre introuvable."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [memberId]);

  // Réponses de la fiche : cochées d'office quand le profil n'a rien, à confirmer quand elles remplacent une réponse.
  const formRows = useMemo(() => {
    if (!form) return [];
    return PROFILE_FORM_KEYS
      .filter((key) => form.values[key] !== undefined)
      .map((key) => ({ key, next: form.values[key]!, prev: answers[key] ?? null, same: sameValue(form.values[key], answers[key]) }));
  }, [form, answers]);

  useEffect(() => {
    if (loading || !form) return;
    setApply(Object.fromEntries(formRows.map((r) => [r.key, !r.same && !displayValue(r.key, r.prev)])));
    // Seulement à l'arrivée d'une fiche (ou une fois le membre chargé), pas après chaque enregistrement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loading]);

  // Photos collées dans la fiche : préparées comme une photo choisie à la main.
  useEffect(() => {
    if (!form || form.photos.length === 0) return;
    let active = true;
    (async () => {
      const next: (string | null)[] = Array(SLOTS).fill(null);
      let failed = 0;
      for (const [i, file] of form.photos.slice(0, SLOTS).entries()) {
        if (!active) return;
        setProcessing(i);
        const res = await preparePhoto(file);
        if (res.ok) next[i] = res.dataUrl; else failed++;
      }
      if (!active) return;
      setProcessing(null);
      setPrepared(next);
      if (failed) setError(`${failed} photo${failed > 1 ? "s" : ""} de la fiche illisible${failed > 1 ? "s" : ""} : demandez-la au membre en JPEG.`);
    })();
    return () => { active = false; };
  }, [form]);

  const ready = useMemo(() => prepared.filter((p): p is string => !!p), [prepared]);
  const selectedFields = formRows.filter((r) => apply[r.key] && !r.same);
  const formEmail = form?.values.email as string | undefined;
  const emailMismatch = !!(formEmail && member?.email && formEmail !== member.email.toLowerCase());

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

  const onFormFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!isWordFile(file)) { setError("Déposez la fiche au format Word (.docx)."); return; }
    setReadingForm(true);
    try { setForm(await readForm(file)); }
    catch (err) { setError(err instanceof Error && err.message ? err.message : "Fiche illisible."); }
    finally { setReadingForm(false); }
  };

  const save = async () => {
    if (ready.length === 0 && selectedFields.length === 0) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const done: string[] = [];
    try {
      if (selectedFields.length > 0) {
        const res = await fetch(`/api/admin/photos/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: Object.fromEntries(selectedFields.map((r) => [r.key, r.next])) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setError(data.error || "Informations non enregistrées. Réessayez."); return; }
        setAnswers(data.answers || {});
        setApply({});
        done.push(`${selectedFields.length} information${selectedFields.length > 1 ? "s" : ""} enregistrée${selectedFields.length > 1 ? "s" : ""}`);
        if (Array.isArray(data.skipped) && data.skipped.length) done.push(`non enregistré faute de colonne : ${data.skipped.join(", ")}`);
      }
      if (ready.length > 0) {
        const media = await uploadRegistrationMedia({ photos: ready, selfie: null, frames: [], slotsUrl: `/api/admin/photos/${memberId}/slots` });
        const res = await fetch(`/api/admin/photos/${memberId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: media.profilePhotoPaths }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setError(`${done.length ? `${done.join(" · ")}. ` : ""}${data.error || "Photos non enregistrées. Réessayez."}`); return; }
        setCurrent(data.photos || []);
        setPrepared(Array(SLOTS).fill(null));
        setMember((m) => (m ? { ...m, photoCount: (data.photos || []).length } : m));
        done.push(`${ready.length} photo${ready.length > 1 ? "s" : ""} importée${ready.length > 1 ? "s" : ""} — le membre choisira sa photo publique à sa prochaine connexion`);
      }
      setNotice(`${done.join(" · ")}.`);
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

  const missingAnswers = PROFILE_FORM_KEYS.filter((k) => !displayValue(k, answers[k]));
  const saveLabel = [
    selectedFields.length > 0 && `${selectedFields.length} information${selectedFields.length > 1 ? "s" : ""}`,
    ready.length > 0 && `${ready.length} photo${ready.length > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" et ");

  return (
    <section aria-label="Import pour le membre" className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
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
          {/* ── Parcours d'inscription ── */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Parcours d'inscription</p>
              <input ref={formInputRef} type="file" accept={WORD_ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void onFormFile(f); }} />
              <button type="button" onClick={() => formInputRef.current?.click()} disabled={readingForm || saving}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                {readingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                {form ? "Importer une autre fiche" : "Importer sa fiche (.docx)"}
              </button>
            </div>

            {!form ? (
              missingAnswers.length ? (
                <p className="text-sm text-amber-700">Manque dans le parcours : {missingAnswers.map((k) => FORM_FIELDS.find((f) => f.key === k)?.label).join(", ")}.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Toutes les réponses du parcours sont renseignées.</p>
              )
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Fiche « {form.fileName} » — {formRows.length} réponse{formRows.length > 1 ? "s" : ""} lue{formRows.length > 1 ? "s" : ""}, {form.photos.length} photo{form.photos.length > 1 ? "s" : ""}.
                  Cochez ce qui doit être enregistré ; une réponse déjà présente n'est remplacée que si vous la cochez.
                </p>
                {emailMismatch && (
                  <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    La fiche indique l'adresse {formEmail}, différente de celle de ce membre. Vérifiez qu'il s'agit bien de la bonne personne.
                  </p>
                )}
                {formRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="w-10 px-3 py-2"><span className="sr-only">Enregistrer</span></th>
                          <th className="px-3 py-2 text-left font-semibold">Champ</th>
                          <th className="px-3 py-2 text-left font-semibold">Actuellement</th>
                          <th className="px-3 py-2 text-left font-semibold">Fiche</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {formRows.map((r) => {
                          const label = FORM_FIELDS.find((f) => f.key === r.key)?.label ?? r.key;
                          return (
                            <tr key={r.key} className={cn(r.same && "text-muted-foreground")}>
                              <td className="px-3 py-2 text-center">
                                {r.same ? (
                                  <CheckCircle2 className="w-4 h-4 text-primary inline" aria-label="Identique" />
                                ) : (
                                  <input type="checkbox" aria-label={`Enregistrer ${label}`} checked={!!apply[r.key]} disabled={saving}
                                    onChange={(e) => setApply((prev) => ({ ...prev, [r.key]: e.target.checked }))} className="w-4 h-4 accent-[#486B46]" />
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium">{label}</td>
                              <td className="px-3 py-2">{displayValue(r.key, r.prev) || <span className="text-amber-700">vide</span>}</td>
                              <td className="px-3 py-2 font-semibold">{displayValue(r.key, r.next)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {form.issues.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
                    <p className="font-semibold">Réponses à vérifier avec le membre (non enregistrées) :</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {form.issues.map((i) => (
                        <li key={i.key}>{FORM_FIELDS.find((f) => f.key === i.key)?.label} : « {i.raw} » — {i.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Photos ── */}
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
            <button type="button" onClick={save} disabled={(ready.length === 0 && selectedFields.length === 0) || saving || processing !== null}
              className="w-full h-11 rounded-xl bg-[#486B46] text-white text-sm font-semibold hover:bg-[#3D5C3C] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {saving ? "Enregistrement…" : saveLabel ? `Compléter le parcours : ${saveLabel}` : "Compléter le parcours"}
            </button>
            <p className="text-xs text-muted-foreground">
              Le selfie, le mot de passe, la charte et la photo publique restent faits par le membre lui-même : la fiche ne les remplace pas.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
