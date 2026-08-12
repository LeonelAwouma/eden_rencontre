"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, Upload, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", meeting_link: "", location: "", event_date: "",
    is_public: true, status: "draft",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const updateField = (field: string, value: string | boolean) => setForm((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    if (userSearch.length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const r = await fetch(`/api/admin/users/search?q=${encodeURIComponent(userSearch)}`);
        const d = await r.json();
        setUserResults((d.users || []).filter((u: UserOption) => !selectedUsers.find((s) => s.id === u.id)));
        setShowUserDropdown(true);
      } catch { setUserResults([]); }
      finally { setSearchingUsers(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, selectedUsers]);

  const addUser = (u: UserOption) => { setSelectedUsers((p) => [...p, u]); setUserSearch(""); setUserResults([]); setShowUserDropdown(false); };
  const removeUser = (id: string) => setSelectedUsers((p) => p.filter((u) => u.id !== id));
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; setImageFile(f); setImagePreview(URL.createObjectURL(f)); };
  const removeImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      let coverImageUrl: string | null = null;
      if (imageFile) {
        setUploadingImage(true);
        const fd = new FormData(); fd.append("file", imageFile);
        const r = await fetch("/api/admin/events/upload-image", { method: "POST", body: fd });
        const d = await r.json(); setUploadingImage(false);
        if (r.ok && d.url) coverImageUrl = d.url;
        else { alert(d.error || "Erreur upload image."); setSaving(false); return; }
      }
      const res = await fetch("/api/admin/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description || null, cover_image_url: coverImageUrl, meeting_link: form.meeting_link || null, location: form.location || null, event_date: form.event_date, participant_ids: selectedUsers.map((u) => u.id), is_public: form.is_public, status: form.status }),
      });
      if (res.ok) router.push("/admin/events");
      else { const d = await res.json(); alert(d.error || "Erreur lors de la création."); }
    } catch { alert("Erreur lors de la création."); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvel événement</h1>
          <p className="text-sm text-gray-500">Créer un événement Meet</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Informations</h2>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Titre *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Ex: Prière en ligne pour les célibataires"
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Décrivez l'événement…"
              className="w-full h-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-[#2D5016]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Date et heure *</Label>
              <Input
                required
                type="datetime-local"
                value={form.event_date}
                onChange={(e) => updateField("event_date", e.target.value)}
                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Lien de réunion</Label>
              <Input
                type="url"
                value={form.meeting_link}
                onChange={(e) => updateField("meeting_link", e.target.value)}
                placeholder="https://meet.google.com/..."
                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
              />
            </div>
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Image de couverture</Label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={imagePreview} alt="Aperçu" className="w-full h-48 object-cover" />
                <button type="button" onClick={removeImage} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#2D5016] hover:border-[#2D5016] transition-all">
                <Upload className="w-6 h-6" />
                <span className="text-sm font-medium">Cliquer pour ajouter une image</span>
                <span className="text-xs">JPG, PNG, WebP — max 5 Mo</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageSelect} className="hidden" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Lieu (optionnel)</Label>
            <Input
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="Ex: Paris, France"
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Participants</h2>
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF5EC] text-[#2D5016] text-[12px] font-medium border border-[#C6D4C0]">
                  {u.name || u.email}
                  <button type="button" onClick={() => removeUser(u.id)} className="hover:text-[#EF4444] transition-colors"><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onFocus={() => { if (userResults.length > 0) setShowUserDropdown(true); }} placeholder="Rechercher un utilisateur par nom ou email…" className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D5016]" />
              {searchingUsers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            </div>
            {showUserDropdown && userResults.length > 0 && (
              <div className="absolute z-20 top-12 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {userResults.map((u) => (
                  <button key={u.id} type="button" onClick={() => addUser(u)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-[#EEF5EC] flex items-center justify-center text-[#2D5016] text-xs font-bold shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" /> : (u.name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name || "Sans nom"}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {selectedUsers.length > 0 ? `${selectedUsers.length} participant${selectedUsers.length > 1 ? "s" : ""} sélectionné${selectedUsers.length > 1 ? "s" : ""}` : "Laissez vide pour un événement ouvert à tous"}
          </p>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Paramètres</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Événement public</p>
              <p className="text-xs text-gray-400">Visible par tous les utilisateurs approuvés</p>
            </div>
            <button
              type="button"
              onClick={() => updateField("is_public", !form.is_public)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.is_public ? "bg-[#2D5016]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_public ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Statut</Label>
            <div className="flex gap-2">
              {[
                { value: "draft", label: "Brouillon" },
                { value: "published", label: "Publié" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("status", opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.status === opt.value
                      ? "bg-[#2D5016] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.status === "published" && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                Sera visible immédiatement sur la plateforme
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1 rounded-lg"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={saving || uploadingImage}
            className="flex-1 bg-[#2D5016] hover:bg-[#2D5016]/90 text-white rounded-lg gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? (uploadingImage ? "Upload de l'image…" : "Création…") : "Créer l'événement"}
          </Button>
        </div>
      </form>
    </div>
  );
}