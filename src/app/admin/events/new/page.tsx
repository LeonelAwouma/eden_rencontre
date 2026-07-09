"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    meeting_link: "",
    location: "",
    event_date: "",
    participant_limit: "",
    is_public: true,
    status: "draft",
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        cover_image_url: form.cover_image_url || null,
        meeting_link: form.meeting_link || null,
        location: form.location || null,
        event_date: form.event_date,
        participant_limit: form.participant_limit ? parseInt(form.participant_limit) : null,
        is_public: form.is_public,
        status: form.status,
      };

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/admin/events");
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la création.");
      }
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
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
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Limite de participants</Label>
              <Input
                type="number"
                min="1"
                value={form.participant_limit}
                onChange={(e) => updateField("participant_limit", e.target.value)}
                placeholder="Illimité"
                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Image de couverture (URL)</Label>
            <Input
              type="url"
              value={form.cover_image_url}
              onChange={(e) => updateField("cover_image_url", e.target.value)}
              placeholder="https://..."
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
            disabled={saving}
            className="flex-1 bg-[#2D5016] hover:bg-[#2D5016]/90 text-white rounded-lg gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Création…" : "Créer l'événement"}
          </Button>
        </div>
      </form>
    </div>
  );
}