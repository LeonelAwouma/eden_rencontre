"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Edit3, Trash2, Save, X, GripVertical } from "lucide-react";

interface Category { id: string; name: string; slug: string; description: string | null; icon: string | null; color: string; sort_order: number; is_active: boolean; }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon: "", color: "#486B46", sort_order: "0" });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch("/api/admin/mediatheque/categories"); const d = await r.json(); setCategories(d.categories || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const startEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, slug: c.slug, description: c.description || "", icon: c.icon || "", color: c.color, sort_order: c.sort_order.toString() }); setShowForm(true); };
  const startNew = () => { setEditing(null); setForm({ name: "", slug: "", description: "", icon: "", color: "#486B46", sort_order: "0" }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const slug = form.slug || form.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      const body = { ...form, slug, sort_order: parseInt(form.sort_order) || 0 };
      const url = editing ? `/api/admin/mediatheque/categories/${editing.id}` : "/api/admin/mediatheque/categories";
      const r = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { setShowForm(false); fetchCategories(); } else { const d = await r.json(); alert(d.error); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm("Supprimer ?")) return; await fetch(`/api/admin/mediatheque/categories/${id}`, { method: "DELETE" }); fetchCategories(); };

  return (<>
    
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-bold text-[#1a1a1a]">Catégories</h1>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38]"><Plus className="w-4 h-4" /> Ajouter</button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#E8E5E0] p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{editing ? "Modifier" : "Nouvelle"}</h2><button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Nom *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Slug</label><input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
          </div>
          <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46] resize-none" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Icône</label><input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Couleur</label><input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="w-full h-[46px] border border-gray-200 rounded-xl cursor-pointer" /></div>
            <div><label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Ordre</label><input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#486B46]" /></div>
          </div>
          <button onClick={handleSave} disabled={saving || !form.name} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-50"><Save className="w-4 h-4" />{saving ? "..." : "Enregistrer"}</button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-[3px] border-[#E8E5E0] border-t-[#486B46] animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {categories.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-[#E8E5E0] p-4 flex items-center gap-4 hover:shadow-sm transition-all">
              <GripVertical className="w-4 h-4 text-[#D1D5DB]" />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + "15" }}><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} /></div>
              <div className="flex-1 min-w-0"><p className="text-[14px] font-semibold text-[#2F2F2F]">{c.name}</p><p className="text-[11px] text-[#9CA3AF]">{c.description || c.slug}</p></div>
              <span className="text-[11px] text-[#9CA3AF] font-mono">#{c.sort_order}</span>
              <button onClick={() => startEdit(c)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#486B46] hover:bg-[#EEF5EC]"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F56565] hover:bg-[#F56565]/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </>);
}
