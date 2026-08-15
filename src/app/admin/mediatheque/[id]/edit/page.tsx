"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/admin/dashboard-header";
import { cn } from "@/lib/utils";
import { RESOURCE_TYPE_CONFIG, LEVEL_CONFIG } from "@/lib/mediatheque";

export default function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    title: "", description: "", content: "", type: "article", category_id: "",
    author: "", source: "", external_url: "", file_url: "", thumbnail_url: "",
    cover_url: "", duration: "", page_count: "", language: "fr", level: "beginner",
    status: "draft", featured: false, recommended: false, tags: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/mediatheque/resources/${id}`).then(r => r.json()),
      fetch("/api/admin/mediatheque/categories").then(r => r.json()),
    ]).then(([rd, cd]) => {
      const r = rd.resource;
      if (r) setForm({ title: r.title||"", description: r.description||"", content: r.content||"",
        type: r.type||"article", category_id: r.category_id||"", author: r.author||"", source: r.source||"",
        external_url: r.external_url||"", file_url: r.file_url||"", thumbnail_url: r.thumbnail_url||"",
        cover_url: r.cover_url||"", duration: r.duration||"", page_count: r.page_count?.toString()||"",
        language: r.language||"fr", level: r.level||"beginner", status: r.status||"draft",
        featured: r.featured||false, recommended: r.recommended||false,
        tags: (r.tags||[]).map((t:any)=>t.name).join(", ") });
      setCategories(cd.categories||[]);
    }).catch(console.error).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const upd = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const tags = typeof form.tags === "string" ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
      await fetch(`/api/admin/mediatheque/resources/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, page_count: form.page_count ? parseInt(form.page_count) : null, tags }),
      });
      router.push("/admin/mediatheque");
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#486B46] animate-spin" /></div>;

  return (<>
    <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[13px] text-[#6B7280] hover:text-[#2F2F2F] mb-6 font-medium"><ArrowLeft className="w-4 h-4" /> Retour</button>
      <h1 className="text-[24px] font-bold text-[#1a1a1a] mb-6">Modifier la ressource</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Informations</h2>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Titre *</label>
            <input required value={form.title} onChange={e => upd("title", e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Description *</label>
            <textarea required value={form.description} onChange={e => upd("description", e.target.value)} rows={3} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] resize-none" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => upd("type", e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">
                {Object.entries(RESOURCE_TYPE_CONFIG).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Catégorie</label>
              <select value={form.category_id} onChange={e => upd("category_id", e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">
                <option value="">—</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Auteur</label>
              <input value={form.author} onChange={e => upd("author", e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Durée</label>
              <input value={form.duration} onChange={e => upd("duration", e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Niveau</label>
              <select value={form.level} onChange={e => upd("level", e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">
                {Object.entries(LEVEL_CONFIG).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Tags</label>
            <input value={form.tags} onChange={e => upd("tags", e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Médias</h2>
          {["file_url","external_url","thumbnail_url","cover_url"].map(f => (
            <div key={f}><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">{f.replace(/_/g," ")}</label>
              <input value={form[f]} onChange={e => upd(f, e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] font-mono text-xs" /></div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Publication</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={e => upd("featured", e.target.checked)} className="w-4 h-4 accent-[#486B46]" /><span className="text-sm font-medium">Vedette</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommended} onChange={e => upd("recommended", e.target.checked)} className="w-4 h-4 accent-[#486B46]" /><span className="text-sm font-medium">Recommandé</span></label>
          </div>
          <div className="flex gap-2">
            {[{v:"draft",l:"Brouillon"},{v:"published",l:"Publié"},{v:"archived",l:"Archivé"}].map(s => (
              <button key={s.v} type="button" onClick={() => upd("status", s.v)} className={cn("px-4 py-2 rounded-lg text-sm font-medium", form.status===s.v?"bg-[#486B46] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200")}>{s.l}</button>))}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#486B46] text-white font-bold text-sm hover:bg-[#3A5A38] disabled:opacity-50">
            <Save className="w-4 h-4" />{saving?"Sauvegarde...":"Enregistrer"}</button>
        </div>
      </form>
    </div>
  </>);
}
