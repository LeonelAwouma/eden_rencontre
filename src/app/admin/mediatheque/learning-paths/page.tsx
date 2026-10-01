"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Edit3, Trash2, Save, X, BookOpen, ImagePlus, Loader2, Eye } from "lucide-react";
import { ADMIN_LESSON_PREVIEW_PATH } from "@/lib/formation/paths";
import { cn } from "@/lib/utils";
import { LEVEL_CONFIG } from "@/lib/mediatheque";

interface LP { id: string; title: string; slug: string; description: string; level: string; estimated_duration: string | null; status: string; sort_order: number; resource_count: number; cover_url: string | null; }

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<LP[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LP | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Image de couverture : elle englobe toutes les leçons du parcours.
  const uploadCover = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Choisissez une image (JPG, PNG, WebP)."); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/admin/mediatheque/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok && d.url) setForm((p) => ({ ...p, cover_url: d.url })); else alert(d.error || "L'envoi de l'image a échoué.");
    } catch { alert("L'envoi de l'image a échoué."); } finally { setUploading(false); }
  };
  const [form, setForm] = useState({ title: "", slug: "", description: "", level: "beginner", estimated_duration: "", sort_order: "0", status: "draft", cover_url: "" });

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/admin/mediatheque/learning-paths"); const d = await r.json(); setPaths(d.learning_paths || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPaths(); }, [fetchPaths]);

  const startEdit = (p: LP) => { setEditing(p); setForm({ title: p.title, slug: p.slug, description: p.description, level: p.level, estimated_duration: p.estimated_duration || "", sort_order: p.sort_order.toString(), status: p.status, cover_url: p.cover_url || "" }); setShowForm(true); };
  const startNew = () => { setEditing(null); setForm({ title: "", slug: "", description: "", level: "beginner", estimated_duration: "", sort_order: "0", status: "draft", cover_url: "" }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const slug = form.slug || form.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      const url = editing ? `/api/admin/mediatheque/learning-paths/${editing.id}` : "/api/admin/mediatheque/learning-paths";
      const r = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, slug, sort_order: parseInt(form.sort_order) || 0, cover_url: form.cover_url || null }) });
      if (r.ok) { setShowForm(false); fetchPaths(); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm("Supprimer ?")) return; await fetch(`/api/admin/mediatheque/learning-paths/${id}`, { method: "DELETE" }); fetchPaths(); };

  return (<>
    
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-bold text-[#1a1a1a]">Parcours de formation</h1>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38]"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-[#E8E5E0] p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-widest">{editing?"Modifier":"Nouveau parcours"}</h2><button onClick={()=>setShowForm(false)}><X className="w-4 h-4 text-gray-400"/></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Titre *</label><input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Durée</label><input value={form.estimated_duration} onChange={e=>setForm(p=>({...p,estimated_duration:e.target.value}))} placeholder="4 semaines" className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Image de couverture</label>
            <div className="flex items-start gap-4">
              <div className="w-28 h-36 rounded-xl overflow-hidden border border-gray-200 bg-[#F4F3EF] flex items-center justify-center shrink-0">
                {form.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                  : <ImagePlus className="w-6 h-6 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs text-gray-500">Elle représente le parcours et englobe toutes ses leçons.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-[13px] font-semibold hover:bg-gray-50 disabled:opacity-50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} {form.cover_url ? "Remplacer" : "Téléverser une image"}
                  </button>
                  {form.cover_url && (
                    <button type="button" onClick={() => setForm((p) => ({ ...p, cover_url: "" }))}
                      className="px-3 py-2 rounded-lg text-[13px] font-semibold text-[#B42318] hover:bg-[#B42318]/5">Retirer</button>
                  )}
                </div>
                <input value={form.cover_url} onChange={e => setForm(p => ({ ...p, cover_url: e.target.value }))} placeholder="/batir_roc.png ou https://…"
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#486B46]" />
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />
              </div>
            </div>
          </div>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Description</label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] resize-none"/></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Niveau</label><select value={form.level} onChange={e=>setForm(p=>({...p,level:e.target.value}))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">{Object.entries(LEVEL_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Ordre</label><input type="number" value={form.sort_order} onChange={e=>setForm(p=>({...p,sort_order:e.target.value}))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Statut</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"><option value="draft">Brouillon</option><option value="published">Publié</option></select></div>
          </div>
          <button onClick={handleSave} disabled={saving||!form.title} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-50"><Save className="w-4 h-4"/>{saving?"...":"Enregistrer"}</button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-[3px] border-[#E8E5E0] border-t-[#486B46] animate-spin"/></div>
      ) : (
        <div className="space-y-3">
          {paths.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-[#E8E5E0] p-5 hover:shadow-sm transition-all">
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-[#EEF5EC] flex items-center justify-center flex-shrink-0">
                  {p.cover_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                    : <BookOpen className="w-5 h-5 text-[#486B46]"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-[#2F2F2F]">{p.title}</h3>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", p.status==="published"?"bg-[#38C172]/10 text-[#38C172]":"bg-gray-100 text-gray-500")}>{p.status==="published"?"Publié":"Brouillon"}</span>
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] mt-1 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-[#6B7280]">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", LEVEL_CONFIG[p.level as keyof typeof LEVEL_CONFIG]?.color)}>{LEVEL_CONFIG[p.level as keyof typeof LEVEL_CONFIG]?.label||p.level}</span>
                    {p.estimated_duration && <span>{p.estimated_duration}</span>}
                    <span>{p.resource_count} leçon{p.resource_count!==1?"s":""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {p.slug.startsWith("batir-sur-le-roc") && <Link href={ADMIN_LESSON_PREVIEW_PATH} title="Prévisualiser les leçons" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#486B46] hover:bg-[#EEF5EC]"><Eye className="w-3.5 h-3.5"/></Link>}
                  <button onClick={()=>startEdit(p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#486B46] hover:bg-[#EEF5EC]"><Edit3 className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>handleDelete(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F56565] hover:bg-[#F56565]/10"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </>);
}
