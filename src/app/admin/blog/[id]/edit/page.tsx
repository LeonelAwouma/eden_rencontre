"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Eye, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/admin/dashboard-header";
import { BlogEditor } from "@/components/admin/blog-editor";
import { cn } from "@/lib/utils";

interface CategoryOption { id: string; name: string; slug: string; }

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", excerpt: "", content: "", category_id: "", author: "Garden of Alliance",
    cover_image_url: "", status: "draft", featured: false, tags: "", slug: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/blog/categories").then(r => r.json()),
      fetch(`/api/admin/blog/posts/${postId}`).then(r => r.json()),
    ]).then(([catData, postData]) => {
      setCategories(catData.categories || []);
      if (postData.post) {
        const p = postData.post;
        setForm({
          title: p.title || "", excerpt: p.excerpt || "", content: p.content || "",
          category_id: p.category_id || "", author: p.author || "Garden of Alliance",
          cover_image_url: p.cover_image_url || "", status: p.status || "draft",
          featured: p.featured || false, slug: p.slug || "",
          tags: (p.tags || []).map((t: any) => t.name).join(", "),
        });
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [postId]);

  const upd = (f: string, v: string | boolean) => setForm(p => ({ ...p, [f]: v }));

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
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
      const res = await fetch(`/api/admin/blog/posts/${postId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      });
      if (res.ok) router.push("/admin/blog");
      else { const d = await res.json(); alert(d.error || "Erreur"); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handlePreview = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>${form.title||"Aperçu"}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:'Inter',sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#2F2F2F;line-height:1.8}h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:2em}blockquote{border-left:4px solid #486B46;padding-left:16px;font-style:italic}img{max-width:100%;border-radius:12px}a{color:#486B46}</style></head><body>${form.cover_image_url?`<img src="${form.cover_image_url}" style="width:100%;border-radius:16px;margin-bottom:24px"/>`:""}<h1>${form.title}</h1><p style="color:#777">${form.author}</p><hr style="border:none;border-top:1px solid #E8E5E0;margin:24px 0"/>${form.content}</body></html>`);
    }
  };

  if (loading) return (
    <><DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="h-10 bg-white rounded-xl animate-pulse" />
      <div className="h-20 bg-white rounded-xl animate-pulse" />
      <div className="h-96 bg-white rounded-xl animate-pulse" />
    </div></>
  );

  return (
    <>
      <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/blog" className="flex items-center gap-2 text-[13px] text-[#777777] hover:text-[#2F2F2F]">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <button type="button" onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB]">
            <Eye className="w-4 h-4" /> Aperçu
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E8E5E0] shadow-sm p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Titre</label>
              <input value={form.title} onChange={e => upd("title", e.target.value)} required
                className="w-full p-3 border border-[#E5E7EB] rounded-xl text-lg font-semibold outline-none focus:border-[#486B46]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Extrait</label>
              <textarea value={form.excerpt} onChange={e => upd("excerpt", e.target.value)} rows={2}
                className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46] resize-none" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Image de couverture</label>
              <div className="flex items-center gap-3">
                <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                <button type="button" onClick={() => coverRef.current?.click()} disabled={uploadingCover}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E7EB] text-[13px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50">
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingCover ? "Upload..." : "Changer"}
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
                  <option value="">Aucune</option>
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
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Tags (séparés par des virgules)</label>
              <input value={form.tags} onChange={e => upd("tags", e.target.value)} placeholder="mariage, couple, foi"
                className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46]" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">Slug</label>
              <input value={form.slug} onChange={e => upd("slug", e.target.value)}
                className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm outline-none focus:border-[#486B46] font-mono text-xs" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => upd("featured", e.target.checked)} className="w-4 h-4 accent-[#486B46]" />
              <span className="text-sm font-medium text-[#6B7280]">Article à la une</span>
            </label>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-2 block">Statut</label>
              <div className="flex gap-2">
                {[{v:"draft",l:"Brouillon"},{v:"published",l:"Publié"},{v:"archived",l:"Archivé"}].map(s => (
                  <button key={s.v} type="button" onClick={() => upd("status", s.v)}
                    className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      form.status===s.v ? "bg-[#486B46] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]")}>
                    {s.l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pb-8">
            <Link href="/admin/blog" className="flex-1 text-center px-4 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium text-sm hover:bg-[#F9FAFB]">Annuler</Link>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#486B46] text-white font-bold text-sm hover:bg-[#3A5A38] disabled:opacity-50">
              <Save className="w-4 h-4" />{saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

