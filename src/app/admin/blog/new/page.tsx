"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, Send, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/admin/dashboard-header";
import { BlogEditor } from "@/components/admin/blog-editor";
import { cn } from "@/lib/utils";

interface CategoryOption { id: string; name: string; slug: string; }

export default function NewBlogPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", excerpt: "", content: "", category_id: "", author: "Eden Connexion",
    cover_image_url: "", status: "draft", featured: false, tags: "", slug: "",
  });

  useEffect(() => { fetch("/api/admin/blog/categories").then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {}); }, []);
  const upd = (f: string, v: string | boolean) => setForm(p => ({ ...p, [f]: v }));

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) upd("cover_image_url", data.url);
    } catch (e) { console.error(e); } finally { setUploadingCover(false); }
  };

  const handleEditorImageUpload = async (file: File): Promise<string> => {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch("/api/admin/blog/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      });
      if (res.ok) { const d = await res.json(); router.push("/admin/blog"); }
      else { const d = await res.json(); alert(d.error || "Erreur"); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handlePreview = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>${form.title || "Aperçu"}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{font-family:'Inter',sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#2F2F2F;line-height:1.8}
        h1{font-family:'Playfair Display',serif;font-size:2em}h2{font-size:1.5em;margin-top:1.5em}h3{font-size:1.2em}
        blockquote{border-left:4px solid #486B46;padding-left:16px;margin:1em 0;color:#555;font-style:italic}
        img{max-width:100%;border-radius:12px}figure{margin:1.5em 0}figcaption{text-align:center;font-size:0.85em;color:#777}
        a{color:#486B46}</style></head><body>
        ${form.cover_image_url ? `<img src="${form.cover_image_url}" style="width:100%;border-radius:16px;margin-bottom:24px" />` : ""}
        <h1>${form.title}</h1>
        <p style="color:#777;font-size:0.9em">${form.author} · ${form.excerpt}</p><hr style="border:none;border-top:1px solid #E8E5E0;margin:24px 0" />
        ${form.content}</body></html>`);
    }
  };

  return (
    <>
      <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/blog" className="flex items-center gap-2 text-[13px] text-[#777777] hover:text-[#2F2F2F]">
            <ArrowLeft className="w-4 h-4" /> Retour aux articles
          </Link>
          <div className="flex gap-2">
            <button type="button" onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB]">
              <Eye className="w-4 h-4" /> Aperçu
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E8E5E0] shadow-sm p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Titre</label>
              <input value={form.title} onChange={e => upd("title", e.target.value)} required
                placeholder="Titre de l'article..." className="w-full p-3 border border-[#E5E7EB] rounded-xl text-lg font-semibold outline-none focus:border-[#486B46]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Extrait</label>
              <textarea value={form.excerpt} onChange={e => upd("excerpt", e.target.value)} rows={2}
                placeholder="Courte description..." className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46] resize-none" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Image de couverture</label>
              <div className="flex items-center gap-3">
                <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                <button type="button" onClick={() => coverRef.current?.click()} disabled={uploadingCover}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50">
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingCover ? "Upload..." : "Choisir une image"}
                </button>
                {form.cover_image_url && <img src={form.cover_image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E8E5E0] shadow-sm p-6">
            <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-3 block">Contenu</label>
            <BlogEditor value={form.content} onChange={v => upd("content", v)} onImageUpload={handleEditorImageUpload} />
          </div>

          <div className="bg-white rounded-xl border border-[#E8E5E0] shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#2F2F2F] uppercase tracking-widest">Métadonnées</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Catégorie</label>
                <select value={form.category_id} onChange={e => upd("category_id", e.target.value)}
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46] bg-white">
                  <option value="">Aucune catégorie</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Auteur</label>
                <input value={form.author} onChange={e => upd("author", e.target.value)}
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Tags (séparés par virgules)</label>
              <input value={form.tags} onChange={e => upd("tags", e.target.value)} placeholder="mariage, couple, foi"
                className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Slug (optionnel)</label>
              <input value={form.slug} onChange={e => upd("slug", e.target.value)} placeholder="auto-généré si vide"
                className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46] font-mono text-xs" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={e => upd("featured", e.target.checked)} className="w-4 h-4 accent-[#486B46]" />
                <span className="text-sm font-medium text-[#6B7280]">Article à la une</span>
              </label>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-2 block">Statut</label>
              <div className="flex gap-2">
                {[{ v: "draft", l: "Brouillon" }, { v: "published", l: "Publier" }].map(s => (
                  <button key={s.v} type="button" onClick={() => upd("status", s.v)}
                    className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", form.status === s.v ? "bg-[#486B46] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]")}>
                    {s.l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pb-8">
            <Link href="/admin/blog" className="flex-1 text-center px-4 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium text-sm hover:bg-[#F9FAFB]">Annuler</Link>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#486B46] text-white font-bold text-sm hover:bg-[#3A5A38] disabled:opacity-50">
              <Save className="w-4 h-4" />{saving ? "Création..." : form.status === "published" ? "Publier l'article" : "Enregistrer le brouillon"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
