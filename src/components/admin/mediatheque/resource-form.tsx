"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload, Link2, Loader2, X, FileAudio, FileVideo, FileText, ExternalLink, ImagePlus, Trash2,
  ArrowUp, ArrowDown, Plus, GraduationCap, Sparkles, Star, ThumbsUp, AlertCircle, Save, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  RESOURCE_TYPE_CONFIG, LEVEL_CONFIG, detectUrlType,
  type ResourceType, type ResourceLevel, type ResourceStatus,
} from "@/lib/mediatheque";
import type { PathMembership } from "@/lib/mediatheque/path-links";

/* ─────────────────────────── Modèle ─────────────────────────── */

export interface ResourceFormValues {
  title: string; description: string; content: string;
  type: ResourceType; category_id: string; author: string; source: string;
  external_url: string; file_url: string; thumbnail_url: string; cover_url: string;
  duration: string; page_count: string; language: string; level: ResourceLevel;
  target_audience: string; status: ResourceStatus; featured: boolean; recommended: boolean;
  tags: string[]; learning_paths: PathMembership[];
}

export const EMPTY_RESOURCE: ResourceFormValues = {
  title: "", description: "", content: "", type: "article", category_id: "", author: "", source: "",
  external_url: "", file_url: "", thumbnail_url: "", cover_url: "", duration: "", page_count: "",
  language: "fr", level: "beginner", target_audience: "", status: "draft",
  featured: false, recommended: false, tags: [], learning_paths: [],
};

const AUDIENCES = ["Tous les membres", "Célibataires", "Fiancés", "Couples mariés", "Accompagnateurs"];

// Champs de détail pertinents selon le format.
const SHOWS_DURATION: ResourceType[] = ["video", "audio", "article", "testimony", "guide", "external"];
const SHOWS_PAGES: ResourceType[] = ["book", "pdf", "guide"];
const SHOWS_CONTENT: ResourceType[] = ["article", "guide", "testimony"];

interface PathOption { id: string; title: string; status: string; resource_count: number; }
interface PathStep { id: string; title: string; type: ResourceType; status: string; }
interface CategoryOption { id: string; name: string; }

/* ─────────────────────────── Styles partagés ─────────────────────────── */

const inputClass =
  "w-full h-10 px-3 bg-white border border-border rounded-xl text-[14px] text-foreground placeholder:text-[#7A847D] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";
const textareaClass = inputClass.replace("h-10 ", "") + " py-2.5 leading-relaxed";
const labelClass = "block text-[13px] font-semibold text-foreground mb-1.5";
const hintClass = "text-[12px] text-[#6B746E] mt-1.5";

function Section({ title, description, children, className, id }: {
  title: string; description?: string; children: React.ReactNode; className?: string; id?: string;
}) {
  return (
    <section id={id} className={cn("bg-white rounded-2xl border border-border p-5 sm:p-6", className)}>
      <header className="mb-4">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {description && <p className="text-[13px] text-[#56615A] mt-0.5">{description}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, hint, error, children, optional }: {
  label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode; optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}{optional && <span className="font-normal text-[#6B746E]"> · facultatif</span>}
      </label>
      {children}
      {error ? <p className="text-[12px] text-[#B42318] mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>
        : hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

/* ─────────────────────────── Upload ─────────────────────────── */

function useUpload() {
  const [progress, setProgress] = useState<number | null>(null);
  const upload = useCallback((file: File) => new Promise<string>((resolve, reject) => {
    const fd = new FormData(); fd.append("file", file);
    const xhr = new XMLHttpRequest();
    setProgress(0);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setProgress(null);
      let body: { url?: string; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* réponse non JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.url) resolve(body.url);
      else reject(new Error(body.error || "L'envoi du fichier a échoué."));
    };
    xhr.onerror = () => { setProgress(null); reject(new Error("Connexion interrompue pendant l'envoi.")); };
    xhr.open("POST", "/api/admin/mediatheque/upload"); xhr.send(fd);
  }), []);
  return { upload, progress, busy: progress !== null };
}

const fileNameFromUrl = (url: string) => {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
    return last.replace(/^\d+-[a-z0-9]+-/, ""); // préfixe horodaté ajouté à l'upload
  } catch { return url; }
};

function ImageSlot({ label, hint, value, onChange, aspect, onError }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; aspect: string; onError: (m: string) => void;
}) {
  const { upload, progress, busy } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrl, setShowUrl] = useState(false);

  const pick = async (file: File) => {
    if (!file.type.startsWith("image/")) return onError("Choisissez une image (JPG, PNG, WebP ou GIF).");
    try { onChange(await upload(file)); } catch (e) { onError((e as Error).message); }
  };

  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div
        className={cn("relative rounded-xl border overflow-hidden bg-muted/60 group", aspect,
          value ? "border-border" : "border-dashed border-[#CFC9BE]")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-2 flex justify-end gap-1.5 bg-gradient-to-t from-black/50 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
              <button type="button" onClick={() => inputRef.current?.click()}
                className="h-8 px-2.5 rounded-lg bg-white/95 text-[12px] font-semibold text-foreground">Remplacer</button>
              <button type="button" onClick={() => onChange("")} aria-label={`Retirer ${label.toLowerCase()}`}
                className="h-8 w-8 rounded-lg bg-white/95 text-[#B42318] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#56615A] hover:text-primary transition-colors">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="text-[12px] font-semibold">{busy ? `Envoi… ${progress}%` : "Ajouter une image"}</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[12px] text-[#6B746E]">{hint}</p>
        <button type="button" onClick={() => setShowUrl((s) => !s)} className="text-[12px] font-semibold text-primary hover:underline shrink-0">
          {showUrl ? "Masquer l'URL" : "Coller une URL"}
        </button>
      </div>
      {showUrl && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" aria-label={`URL — ${label}`}
          className={cn(inputClass, "mt-2 font-mono text-[12px]")} />
      )}
    </div>
  );
}

/* ─────────────────────────── Tags ─────────────────────────── */

function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const commit = (raw: string) => {
    const next = raw.split(",").map((t) => t.trim()).filter(Boolean)
      .filter((t) => !value.some((v) => v.toLowerCase() === t.toLowerCase()));
    if (next.length) onChange([...value, ...next]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-10 px-2 py-1.5 bg-white border border-border rounded-xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-primary/10 text-primary text-[12px] font-semibold">
          {t}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Retirer ${t}`}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input id="tags" value={draft} placeholder={value.length ? "" : "mariage, communication…"}
        onChange={(e) => { if (e.target.value.endsWith(",")) commit(e.target.value); else setDraft(e.target.value); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(draft); }
          else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && commit(draft)}
        className="flex-1 min-w-[120px] h-7 px-1 bg-transparent text-[14px] outline-none placeholder:text-[#7A847D]" />
    </div>
  );
}

/* ─────────────────────────── Parcours ─────────────────────────── */

function PathMemberships({ value, onChange, paths, resourceId, resourceTitle, resourceType }: {
  value: PathMembership[]; onChange: (v: PathMembership[]) => void; paths: PathOption[] | null;
  resourceId?: string; resourceTitle: string; resourceType: ResourceType;
}) {
  const [steps, setSteps] = useState<Record<string, PathStep[] | "loading" | "error">>({});

  const loadSteps = useCallback((pathId: string) => {
    setSteps((s) => (s[pathId] && s[pathId] !== "error" ? s : { ...s, [pathId]: "loading" }));
    fetch(`/api/admin/mediatheque/learning-paths/${pathId}`).then((r) => r.json())
      .then((d) => setSteps((s) => ({
        ...s,
        [pathId]: ((d.learning_path?.steps || []) as PathStep[]).filter((st) => st.id !== resourceId),
      })))
      .catch(() => setSteps((s) => ({ ...s, [pathId]: "error" })));
  }, [resourceId]);

  useEffect(() => {
    for (const m of value) if (!steps[m.learning_path_id]) loadSteps(m.learning_path_id);
  }, [value, steps, loadSteps]);

  const update = (i: number, patch: Partial<PathMembership>) =>
    onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const available = (paths || []).filter((p) => !value.some((m) => m.learning_path_id === p.id));

  const addPath = (pathId: string) => {
    const p = paths?.find((x) => x.id === pathId);
    // Par défaut, la ressource devient la dernière étape du parcours.
    onChange([...value, { learning_path_id: pathId, position: p?.resource_count ?? 0, is_required: true }]);
    loadSteps(pathId);
  };

  if (paths === null) {
    return <div className="flex items-center gap-2 text-[13px] text-[#56615A]"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des parcours…</div>;
  }
  if (paths.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#CFC9BE] p-5 text-center">
        <GraduationCap className="w-5 h-5 text-primary mx-auto mb-2" />
        <p className="text-[13px] text-[#3F4A43]">Aucun parcours n&apos;existe encore.</p>
        <Link href="/admin/mediatheque/learning-paths" className="inline-block mt-2 text-[13px] font-semibold text-primary hover:underline">Créer un parcours</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-[13px] text-[#56615A] rounded-xl bg-muted/60 px-4 py-3">
          Cette ressource n&apos;est rattachée à aucun parcours. Elle reste consultable seule dans la médiathèque.
        </p>
      )}

      {value.map((m, i) => {
        const path = paths.find((p) => p.id === m.learning_path_id);
        const st = steps[m.learning_path_id];
        const others = Array.isArray(st) ? st : [];
        const pos = Math.min(m.position, others.length);
        const total = others.length + 1;
        const ordered: (PathStep | "self")[] = [...others.slice(0, pos), "self", ...others.slice(pos)];

        return (
          <div key={m.learning_path_id} className="rounded-xl border border-border overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[#FAF9F6] border-b border-border">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-foreground truncate">{path?.title || "Parcours"}</p>
                <p className="text-[12px] text-[#56615A]">
                  {Array.isArray(st) ? <>Étape <strong className="text-foreground">{pos + 1}</strong> sur {total}</> : "Chargement des étapes…"}
                  {path?.status === "draft" && <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[11px]">Parcours en brouillon</span>}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[12px] font-medium text-[#3F4A43] cursor-pointer">
                <Switch checked={m.is_required} onCheckedChange={(c) => update(i, { is_required: c })} aria-label="Étape obligatoire" />
                Obligatoire
              </label>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={`Retirer du parcours ${path?.title || ""}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56615A] hover:text-[#B42318] hover:bg-[#B42318]/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {st === "loading" || st === undefined ? (
              <div className="px-4 py-4 text-[13px] text-[#56615A] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
            ) : st === "error" ? (
              <div className="px-4 py-4 text-[13px] text-[#B42318]">
                Étapes indisponibles. <button type="button" className="underline font-semibold" onClick={() => loadSteps(m.learning_path_id)}>Réessayer</button>
              </div>
            ) : (
              <ol className="max-h-72 overflow-y-auto py-1.5">
                {ordered.map((s, idx) => s === "self" ? (
                  <li key="self" className="flex items-center gap-3 mx-1.5 px-2.5 py-2 rounded-lg bg-primary/10 ring-1 ring-primary/25">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-[12px] font-bold flex items-center justify-center shrink-0 tabular-nums">{idx + 1}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-foreground truncate">{resourceTitle || "Cette ressource"}</span>
                      <span className="block text-[11px] text-primary font-semibold">Cette ressource · {RESOURCE_TYPE_CONFIG[resourceType]?.label}</span>
                    </span>
                    <span className="flex gap-1 shrink-0">
                      <button type="button" disabled={pos === 0} onClick={() => update(i, { position: pos - 1 })}
                        aria-label="Avancer d'une étape" title="Avancer d'une étape"
                        className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center text-foreground hover:border-primary disabled:opacity-35 disabled:hover:border-border">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" disabled={pos >= others.length} onClick={() => update(i, { position: pos + 1 })}
                        aria-label="Reculer d'une étape" title="Reculer d'une étape"
                        className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center text-foreground hover:border-primary disabled:opacity-35 disabled:hover:border-border">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </li>
                ) : (
                  <li key={s.id} className="flex items-center gap-3 mx-1.5 px-2.5 py-1.5">
                    <span className="w-6 h-6 rounded-full bg-muted text-[#56615A] text-[12px] font-semibold flex items-center justify-center shrink-0 tabular-nums">{idx + 1}</span>
                    <span className="flex-1 min-w-0 text-[13px] text-[#3F4A43] truncate">{s.title}</span>
                    <span className="text-[11px] text-[#6B746E] shrink-0">{RESOURCE_TYPE_CONFIG[s.type]?.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}

      {available.length > 0 ? (
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary shrink-0" />
          <select value="" onChange={(e) => e.target.value && addPath(e.target.value)} aria-label="Ajouter à un parcours"
            className={cn(inputClass, "max-w-sm cursor-pointer font-semibold text-primary")}>
            <option value="">Ajouter à un parcours…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.title} ({p.resource_count} étape{p.resource_count > 1 ? "s" : ""})</option>
            ))}
          </select>
        </div>
      ) : value.length > 0 && (
        <p className="text-[12px] text-[#6B746E]">La ressource figure déjà dans tous les parcours.</p>
      )}
    </div>
  );
}

/* ─────────────────────────── Formulaire ─────────────────────────── */

export function ResourceForm({ initial, resourceId, slug, publishedAt }: {
  initial: ResourceFormValues; resourceId?: string; slug?: string; publishedAt?: string | null;
}) {
  const router = useRouter();
  const isEdit = !!resourceId;
  const [v, setV] = useState<ResourceFormValues>(initial);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [paths, setPaths] = useState<PathOption[] | null>(null);
  const [sourceMode, setSourceMode] = useState<"file" | "link">(initial.external_url && !initial.file_url ? "link" : "file");
  const [showFileUrl, setShowFileUrl] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"title" | "description" | "source", string>>>({});
  const [banner, setBanner] = useState<{ kind: "error" | "warning"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [detected, setDetected] = useState<ResourceType | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const { upload, progress, busy: uploading } = useUpload();
  const initialSnapshot = useRef(JSON.stringify(initial));
  const dirty = useMemo(() => JSON.stringify(v) !== initialSnapshot.current, [v]);

  useEffect(() => {
    fetch("/api/admin/mediatheque/categories").then((r) => r.json()).then((d) => setCategories(d.categories || [])).catch(() => {});
    fetch("/api/admin/mediatheque/learning-paths").then((r) => r.json()).then((d) => setPaths(d.learning_paths || [])).catch(() => setPaths([]));
  }, []);

  // Prévient la perte de saisie en quittant l'onglet.
  useEffect(() => {
    if (!dirty || saving) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, saving]);

  const set = <K extends keyof ResourceFormValues>(k: K, val: ResourceFormValues[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const showError = (text: string) => { setBanner({ kind: "error", text }); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const handleMainFile = async (file: File) => {
    const mt = file.type;
    let t: ResourceType | null = null;
    if (mt.startsWith("video/")) t = "video"; else if (mt.startsWith("audio/")) t = "audio";
    else if (mt === "application/pdf") t = "pdf"; else if (mt === "application/epub+zip") t = "book";
    if (!t) return showError("Format non pris en charge. Utilisez une vidéo, un audio, un PDF ou un EPUB — les images vont dans « Visuels ».");
    try {
      const url = await upload(file);
      setV((p) => ({
        ...p, file_url: url, type: t!,
        title: p.title || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim(),
      }));
      setErrors((e) => ({ ...e, source: undefined }));
    } catch (e) { showError((e as Error).message); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!v.title.trim()) errs.title = "Donnez un titre à la ressource.";
    if (!v.description.trim()) errs.description = "Ajoutez une courte description.";
    if (v.status === "published" && !v.file_url && !v.external_url && !(SHOWS_CONTENT.includes(v.type) && v.content.trim())) {
      errs.source = "Une ressource publiée a besoin d'un fichier, d'un lien ou d'un contenu.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) { showError("Certains champs sont à compléter."); return; }

    setSaving(true); setBanner(null);
    try {
      const payload = {
        ...v,
        title: v.title.trim(), description: v.description.trim(),
        content: SHOWS_CONTENT.includes(v.type) ? v.content || null : null,
        duration: SHOWS_DURATION.includes(v.type) ? v.duration || null : null,
        page_count: SHOWS_PAGES.includes(v.type) && v.page_count ? parseInt(v.page_count, 10) || null : null,
        target_audience: v.target_audience || null,
        category_id: v.category_id || null,
        // Conserve la date de première publication lors d'une simple modification.
        ...(isEdit && publishedAt ? { published_at: publishedAt } : {}),
      };
      const res = await fetch(isEdit ? `/api/admin/mediatheque/resources/${resourceId}` : "/api/admin/mediatheque/resources", {
        method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError(data.error || "L'enregistrement a échoué."); return; }
      initialSnapshot.current = JSON.stringify(v);
      if (data.warning) {
        setBanner({ kind: "warning", text: data.warning });
        if (!isEdit && data.resource?.id) router.replace(`/admin/mediatheque/${data.resource.id}/edit`);
        return;
      }
      router.push("/admin/mediatheque");
      router.refresh();
    } catch { showError("Connexion impossible. Vos modifications ne sont pas perdues, réessayez."); }
    finally { setSaving(false); }
  };

  const cancel = () => {
    if (dirty && !window.confirm("Quitter sans enregistrer ? Vos modifications seront perdues.")) return;
    router.push("/admin/mediatheque");
  };

  const typeCfg = RESOURCE_TYPE_CONFIG[v.type];
  const statuses: { value: ResourceStatus; label: string; hint: string }[] = [
    { value: "draft", label: "Brouillon", hint: "Visible uniquement par l'équipe." },
    { value: "published", label: "Publiée", hint: "Visible par les membres dans la médiathèque." },
    ...(isEdit ? [{ value: "archived" as const, label: "Archivée", hint: "Retirée de la médiathèque, conservée ici." }] : []),
  ];
  const submitLabel = isEdit ? "Enregistrer les modifications"
    : v.status === "published" ? "Publier la ressource" : "Enregistrer le brouillon";
  const FileIcon = v.type === "video" ? FileVideo : v.type === "audio" ? FileAudio : FileText;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div ref={topRef} className="scroll-mt-24" />
      {banner && (
        <div role={banner.kind === "error" ? "alert" : "status"}
          className={cn("mb-5 flex items-start justify-between gap-3 p-3.5 rounded-xl border text-[13px] font-medium",
            banner.kind === "error" ? "bg-[#B42318]/10 border-[#B42318]/20 text-[#B42318]" : "bg-[#8A5A00]/10 border-[#8A5A00]/20 text-[#8A5A00]")}>
          <span className="flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-px shrink-0" />{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Fermer" className="p-0.5 rounded hover:bg-black/5"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* ───── Colonne principale ───── */}
        <div className="space-y-5 min-w-0">
          <Section title="Contenu" description="Importez le fichier de la ressource ou indiquez un lien vers celle-ci.">
            <div className="inline-flex p-1 bg-muted rounded-xl border border-border" role="tablist" aria-label="Source">
              {([["file", "Fichier", Upload], ["link", "Lien externe", Link2]] as const).map(([m, l, Icon]) => (
                <button key={m} type="button" role="tab" aria-selected={sourceMode === m} onClick={() => setSourceMode(m)}
                  className={cn("flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-semibold transition-all",
                    sourceMode === m ? "bg-white text-foreground shadow-sm border border-border" : "text-[#56615A] hover:text-foreground")}>
                  <Icon className="w-4 h-4" /> {l}
                </button>
              ))}
            </div>

            {sourceMode === "file" ? (
              <div>
                {v.file_url && !uploading ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-[#FAF9F6]">
                    <span className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", typeCfg?.bgColor, typeCfg?.color)}><FileIcon className="w-5 h-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{fileNameFromUrl(v.file_url)}</p>
                      <p className="text-[12px] text-[#56615A]">{typeCfg?.label} · fichier importé</p>
                    </div>
                    <a href={v.file_url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le fichier"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56615A] hover:bg-white hover:text-primary"><ExternalLink className="w-4 h-4" /></a>
                    <button type="button" onClick={() => fileRef.current?.click()} className="h-8 px-3 rounded-lg border border-border bg-white text-[12px] font-semibold hover:border-primary">Remplacer</button>
                    <button type="button" onClick={() => set("file_url", "")} aria-label="Retirer le fichier"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56615A] hover:text-[#B42318] hover:bg-[#B42318]/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div
                    role="button" tabIndex={0}
                    onClick={() => !uploading && fileRef.current?.click()}
                    onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !uploading) { e.preventDefault(); fileRef.current?.click(); } }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleMainFile(f); }}
                    className={cn("rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer outline-none focus-visible:border-primary",
                      errors.source ? "border-[#B42318]/50" : "border-[#CFC9BE] hover:border-primary hover:bg-primary/5")}>
                    {uploading ? (
                      <div className="max-w-xs mx-auto space-y-3">
                        <Loader2 className="w-7 h-7 text-primary animate-spin mx-auto" />
                        <p className="text-[13px] font-semibold text-foreground">Envoi en cours… {progress}%</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-7 h-7 text-primary mx-auto mb-2.5" />
                        <p className="text-[14px] font-semibold text-foreground">Glissez un fichier ici ou <span className="text-primary underline">parcourez</span></p>
                        <p className="text-[12px] text-[#6B746E] mt-1">Vidéo (100 Mo max), audio (50 Mo), PDF ou EPUB (20 Mo)</p>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" accept="video/*,audio/*,.pdf,.epub"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMainFile(f); e.target.value = ""; }} />
                <button type="button" onClick={() => setShowFileUrl((s) => !s)} className="mt-2 text-[12px] font-semibold text-primary hover:underline">
                  {showFileUrl ? "Masquer l'URL du fichier" : "Le fichier est déjà en ligne ? Coller son URL"}
                </button>
                {showFileUrl && (
                  <input value={v.file_url} onChange={(e) => set("file_url", e.target.value)} placeholder="https://…/fichier.pdf"
                    aria-label="URL du fichier" className={cn(inputClass, "mt-2 font-mono text-[12px]")} />
                )}
              </div>
            ) : (
              <Field label="Adresse du contenu" htmlFor="external_url"
                hint={detected ? undefined : "YouTube, Vimeo, Spotify, SoundCloud, un article en ligne…"}>
                <input id="external_url" type="url" value={v.external_url} placeholder="https://youtube.com/watch?v=…"
                  onChange={(e) => {
                    set("external_url", e.target.value);
                    const d = detectUrlType(e.target.value);
                    setDetected(d);
                    if (d) set("type", d);
                  }}
                  className={cn(inputClass, errors.source && "border-[#B42318]/50")} />
                {detected && (
                  <p className="text-[12px] text-primary font-semibold mt-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Format détecté : {RESOURCE_TYPE_CONFIG[detected].label}
                  </p>
                )}
              </Field>
            )}
            {errors.source && <p className="text-[12px] text-[#B42318] flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.source}</p>}
            {sourceMode === "file" && v.external_url && (
              <p className="text-[12px] text-[#56615A]">Un lien externe est aussi renseigné : <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setSourceMode("link")}>le voir</button></p>
            )}
          </Section>

          <Section title="Informations" description="Ce que les membres verront en découvrant la ressource.">
            <Field label="Titre" htmlFor="title" error={errors.title}>
              <input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={160}
                placeholder="Ex. : Construire une communication bienveillante"
                className={cn(inputClass, "h-11 text-[15px] font-semibold", errors.title && "border-[#B42318]/50")} />
            </Field>
            <Field label="Description" htmlFor="description" error={errors.description}
              hint={`${v.description.length}/500 · une à trois phrases qui donnent envie de l'ouvrir.`}>
              <textarea id="description" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={500}
                className={cn(textareaClass, "resize-y", errors.description && "border-[#B42318]/50")} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Auteur ou intervenant" htmlFor="author" optional>
                <input id="author" value={v.author} onChange={(e) => set("author", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Source" htmlFor="source" optional hint="Éditeur, chaîne, ministère…">
                <input id="source" value={v.source} onChange={(e) => set("source", e.target.value)} className={inputClass} />
              </Field>
            </div>
            {SHOWS_CONTENT.includes(v.type) && (
              <Field label="Contenu" htmlFor="content" optional hint="Texte affiché directement sur la page de la ressource (HTML accepté).">
                <textarea id="content" value={v.content} onChange={(e) => set("content", e.target.value)} rows={10}
                  className={cn(textareaClass, "resize-y font-mono text-[13px]")} />
              </Field>
            )}
          </Section>

          <Section title="Parcours" description="Placez cette ressource à l'étape de votre choix dans un ou plusieurs parcours d'accompagnement.">
            <PathMemberships value={v.learning_paths} onChange={(lp) => set("learning_paths", lp)} paths={paths}
              resourceId={resourceId} resourceTitle={v.title} resourceType={v.type} />
          </Section>
        </div>

        {/* ───── Colonne latérale ───── */}
        <aside className="space-y-5 lg:sticky lg:top-6">
          <Section title="Publication">
            <div role="radiogroup" aria-label="Statut" className="space-y-1.5">
              {statuses.map((s) => (
                <label key={s.value}
                  className={cn("flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors",
                    v.status === s.value ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30")}>
                  <input type="radio" name="status" value={s.value} checked={v.status === s.value}
                    onChange={() => set("status", s.value)} className="mt-0.5 w-4 h-4 accent-[#486B46]" />
                  <span>
                    <span className="block text-[13px] font-semibold text-foreground">{s.label}</span>
                    <span className="block text-[12px] text-[#56615A]">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-[13px] font-medium text-foreground"><Star className="w-4 h-4 text-[#8A5A00]" /> Mettre en vedette</span>
                <Switch checked={v.featured} onCheckedChange={(c) => set("featured", c)} />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-[13px] font-medium text-foreground"><ThumbsUp className="w-4 h-4 text-primary" /> Recommander</span>
                <Switch checked={v.recommended} onCheckedChange={(c) => set("recommended", c)} />
              </label>
            </div>
            <div className="pt-2 space-y-2 border-t border-border">
              <button type="submit" disabled={saving || uploading}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white text-[14px] font-bold hover:bg-[#3A5A38] disabled:opacity-60 transition-colors shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : v.status === "published" && !isEdit ? <Send className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? "Enregistrement…" : submitLabel}
              </button>
              <button type="button" onClick={cancel}
                className="w-full h-10 rounded-xl text-[13px] font-semibold text-[#3F4A43] hover:bg-muted transition-colors">Annuler</button>
              {isEdit && slug && initial.status === "published" && (
                <a href={`/mediatheque/${slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> Voir sur le site
                </a>
              )}
              {dirty && !saving && <p className="text-[12px] text-center text-[#8A5A00]">Modifications non enregistrées</p>}
            </div>
          </Section>

          <Section title="Organisation">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Format" htmlFor="type">
                <select id="type" value={v.type} onChange={(e) => set("type", e.target.value as ResourceType)} className={cn(inputClass, "cursor-pointer")}>
                  {Object.entries(RESOURCE_TYPE_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Niveau" htmlFor="level">
                <select id="level" value={v.level} onChange={(e) => set("level", e.target.value as ResourceLevel)} className={cn(inputClass, "cursor-pointer")}>
                  {Object.entries(LEVEL_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Catégorie" htmlFor="category_id">
              <select id="category_id" value={v.category_id} onChange={(e) => set("category_id", e.target.value)} className={cn(inputClass, "cursor-pointer")}>
                <option value="">Sans catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categories.length === 0 && (
                <p className={hintClass}>Aucune catégorie. <Link href="/admin/mediatheque/categories" className="font-semibold text-primary hover:underline">En créer une</Link></p>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Public" htmlFor="target_audience">
                <select id="target_audience" value={v.target_audience} onChange={(e) => set("target_audience", e.target.value)} className={cn(inputClass, "cursor-pointer")}>
                  <option value="">Non précisé</option>
                  {[...AUDIENCES, ...(v.target_audience && !AUDIENCES.includes(v.target_audience) ? [v.target_audience] : [])]
                    .map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Langue" htmlFor="language">
                <select id="language" value={v.language} onChange={(e) => set("language", e.target.value)} className={cn(inputClass, "cursor-pointer")}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>
            {(SHOWS_DURATION.includes(v.type) || SHOWS_PAGES.includes(v.type)) && (
              <div className="grid grid-cols-2 gap-3">
                {SHOWS_DURATION.includes(v.type) && (
                  <Field label={v.type === "article" ? "Lecture" : "Durée"} htmlFor="duration">
                    <input id="duration" value={v.duration} onChange={(e) => set("duration", e.target.value)}
                      placeholder={v.type === "article" ? "8 min" : "45 min"} className={inputClass} />
                  </Field>
                )}
                {SHOWS_PAGES.includes(v.type) && (
                  <Field label="Pages" htmlFor="page_count">
                    <input id="page_count" type="number" min={1} inputMode="numeric" value={v.page_count}
                      onChange={(e) => set("page_count", e.target.value)} className={inputClass} />
                  </Field>
                )}
              </div>
            )}
            <Field label="Mots-clés" htmlFor="tags" hint="Entrée ou virgule pour valider un mot-clé.">
              <TagInput value={v.tags} onChange={(t) => set("tags", t)} />
            </Field>
          </Section>

          <Section title="Visuels">
            <ImageSlot label="Vignette" hint="Cartes et listes · 16:9" aspect="aspect-[16/9]"
              value={v.thumbnail_url} onChange={(u) => set("thumbnail_url", u)} onError={showError} />
            <ImageSlot label="Couverture" hint="En-tête de la page · 3:1" aspect="aspect-[3/1]"
              value={v.cover_url} onChange={(u) => set("cover_url", u)} onError={showError} />
          </Section>
        </aside>
      </div>
    </form>
  );
}
