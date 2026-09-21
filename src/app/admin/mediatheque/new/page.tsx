"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESOURCE_TYPE_CONFIG, LEVEL_CONFIG, type ResourceType, type ResourceLevel, detectUrlType } from "@/lib/mediatheque";

interface CategoryOption { id: string; name: string; slug: string; }

export default function NewResourcePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [importMode, setImportMode] = useState<"upload"|"link">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", description: "", content: "", type: "article" as ResourceType,
    category_id: "", author: "", source: "", external_url: "", file_url: "",
    thumbnail_url: "", cover_url: "", duration: "", page_count: "",
    language: "fr", level: "beginner" as ResourceLevel, status: "draft",
    featured: false, recommended: false, tags: "",
  });

  useEffect(() => { fetch("/api/admin/mediatheque/categories").then(r=>r.json()).then(d=>setCategories(d.categories||[])).catch(()=>{}); }, []);
  const upd = (f: string, v: string|boolean) => setForm(p=>({...p,[f]:v}));

  const handleUpload = async (file: File) => {
    setUploading(true); setUploadPct(0);
    try {
      const fd = new FormData(); fd.append("file", file);
      const xhr = new XMLHttpRequest();
      const result = await new Promise<{url:string;type:string}>((resolve, reject) => {
        xhr.upload.onprogress = e => { if(e.lengthComputable) setUploadPct(Math.round(e.loaded/e.total*100)); };
        xhr.onload = () => { if(xhr.status>=200&&xhr.status<300) resolve(JSON.parse(xhr.responseText)); else reject(new Error("Upload failed")); };
        xhr.onerror = () => reject(new Error("Upload error"));
        xhr.open("POST","/api/admin/mediatheque/upload"); xhr.send(fd);
      });
      const mt = file.type;
      let dt: ResourceType = form.type;
      if(mt.startsWith("video/")) dt="video"; else if(mt.startsWith("audio/")) dt="audio";
      else if(mt==="application/pdf") dt="pdf"; else if(mt==="application/epub+zip") dt="book";
      else if(mt.startsWith("image/")) { upd("thumbnail_url",result.url); setUploading(false); return; }
      upd("file_url",result.url); upd("type",dt);
      if(!form.title) upd("title",file.name.replace(/\.[^/.]+$/,"").replace(/[-_]/g," "));
    } catch(e) { console.error(e); alert("Erreur upload."); } finally { setUploading(false); setUploadPct(0); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const tags = form.tags.split(",").map(t=>t.trim()).filter(Boolean);
      const res = await fetch("/api/admin/mediatheque/resources", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({...form, page_count: form.page_count?parseInt(form.page_count):null, tags, content: form.content||null}),
      });
      const data = await res.json();
      if(res.ok) router.push("/admin/mediatheque"); else alert(data.error||"Erreur.");
    } catch(e){console.error(e);} finally{setSaving(false);}
  };

  return (<>
    
    <div className="max-w-4xl mx-auto">
      <button onClick={()=>router.back()} className="flex items-center gap-2 text-[13px] text-[#6B7280] hover:text-[#2F2F2F] mb-6 font-medium"><ArrowLeft className="w-4 h-4"/> Retour</button>
      <h1 className="text-[24px] font-bold text-[#1a1a1a] mb-6">Ajouter une ressource</h1>
      <div className="bg-white rounded-xl border border-[#E8E5E0] p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Import</h2>
        <div className="flex gap-3 mb-6">
          {[{v:"upload"as const,l:"Fichier",i:<Upload className="w-4 h-4"/>},{v:"link"as const,l:"Lien",i:<Link2 className="w-4 h-4"/>}].map(m=>(
            <button key={m.v} onClick={()=>setImportMode(m.v)} className={cn("flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all",importMode===m.v?"bg-[#486B46] text-white border-[#486B46]":"bg-white text-[#6B7280] border-[#E8E5E0] hover:bg-[#F9FAFB]")}>{m.i} {m.l}</button>
          ))}
        </div>
        {importMode==="upload"?(
          <div className="border-2 border-dashed border-[#E8E5E0] rounded-xl p-8 text-center hover:border-[#486B46] transition-colors" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleUpload(f);}}>
            {uploading?(<div className="space-y-3"><Loader2 className="w-8 h-8 text-[#486B46] animate-spin mx-auto"/><p className="text-sm font-medium text-[#6B7280]">Upload {uploadPct}%</p><div className="w-full bg-[#F3F4F6] rounded-full h-2"><div className="bg-[#486B46] h-2 rounded-full transition-all" style={{width:`${uploadPct}%`}}/></div></div>):(
              <div className="cursor-pointer" onClick={()=>fileRef.current?.click()}><Upload className="w-8 h-8 text-[#D1D5DB] mx-auto mb-3"/><p className="text-sm font-semibold text-[#6B7280]">Glissez ou cliquez pour parcourir</p><p className="text-xs text-[#9CA3AF] mt-1">Vidéo, Audio, PDF, EPUB, Images (max 100 Mo)</p></div>
            )}
            <input ref={fileRef} type="file" className="hidden" accept="video/*,audio/*,.pdf,.epub,image/*" onChange={e=>{const f=e.target.files?.[0];if(f)handleUpload(f);}} />
          </div>
        ): (
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500">URL</label>
            <input type="url" value={form.external_url} onChange={e=>{upd("external_url",e.target.value);const d=detectUrlType(e.target.value);if(d)upd("type",d);}} placeholder="https://youtube.com/..." className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46] mt-1.5"/></div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Informations</h2>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Titre *</label>
            <input required value={form.title} onChange={e=>upd("title",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Description *</label>
            <textarea required value={form.description} onChange={e=>upd("description",e.target.value)} rows={3} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] resize-none"/></div>
          {form.type==="article"&&<div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Contenu HTML</label>
            <textarea value={form.content} onChange={e=>upd("content",e.target.value)} rows={8} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] resize-y font-mono"/></div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Type *</label>
              <select value={form.type} onChange={e=>upd("type",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">
                {Object.entries(RESOURCE_TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Catégorie</label>
              <select value={form.category_id} onChange={e=>upd("category_id",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">
                <option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Auteur</label>
              <input value={form.author} onChange={e=>upd("author",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Source</label>
              <input value={form.source} onChange={e=>upd("source",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Langue</label>
              <select value={form.language} onChange={e=>upd("language",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">
                <option value="fr">Français</option><option value="en">English</option></select></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Classification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Niveau</label>
              <select value={form.level} onChange={e=>upd("level",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]">
                {Object.entries(LEVEL_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Durée</label>
              <input value={form.duration} onChange={e=>upd("duration",e.target.value)} placeholder="45 min" className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Pages</label>
              <input type="number" value={form.page_count} onChange={e=>upd("page_count",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
          </div>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Tags (séparés par virgules)</label>
            <input value={form.tags} onChange={e=>upd("tags",e.target.value)} placeholder="mariage, couple" className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]"/></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Médias</h2>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">URL fichier</label>
            <input value={form.file_url} onChange={e=>upd("file_url",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] font-mono text-xs"/></div>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">URL externe</label>
            <input value={form.external_url} onChange={e=>upd("external_url",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] font-mono text-xs"/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Vignette</label>
              <input value={form.thumbnail_url} onChange={e=>upd("thumbnail_url",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] font-mono text-xs"/></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Couverture</label>
              <input value={form.cover_url} onChange={e=>upd("cover_url",e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] font-mono text-xs"/></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Publication</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.featured} onChange={e=>upd("featured",e.target.checked)} className="w-4 h-4 accent-[#486B46]"/><span className="text-sm font-medium text-gray-700">En vedette</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.recommended} onChange={e=>upd("recommended",e.target.checked)} className="w-4 h-4 accent-[#486B46]"/><span className="text-sm font-medium text-gray-700">Recommandé</span></label>
          </div>
          <div className="flex gap-2">
            {[{v:"draft",l:"Brouillon"},{v:"published",l:"Publié"}].map(s=>(
              <button key={s.v} type="button" onClick={()=>upd("status",s.v)} className={cn("px-4 py-2 rounded-lg text-sm font-medium",form.status===s.v?"bg-[#486B46] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200")}>{s.l}</button>))}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={()=>router.back()} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={saving||uploading} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#486B46] text-white font-bold text-sm hover:bg-[#3A5A38] disabled:opacity-50">
            <Save className="w-4 h-4"/>{saving?"Création...":"Créer"}</button>
        </div>
      </form>
    </div>
  </>);
}
