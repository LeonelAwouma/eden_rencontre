"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Globe,
  Shield,
  Calendar,
  Bell,
  Lock,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

interface SettingValue {
  [key: string]: unknown;
}

interface SettingsData {
  [category: string]: SettingValue;
}

const SECTIONS = [
  { id: "general", label: "Général", icon: Globe },
  { id: "moderation", label: "Modération", icon: Shield },
  { id: "meets", label: "Meets", icon: Calendar },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Sécurité", icon: Lock },
  { id: "appearance", label: "Apparence", icon: Palette },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (res.ok) setSettings(data.settings);
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const getValue = (category: string, key: string) => {
    if (editedValues[`${category}.${key}`] !== undefined) return editedValues[`${category}.${key}`];
    const val = settings[category]?.[key];
    return val !== undefined ? val : "";
  };

  const setValue = (category: string, key: string, value: unknown) => {
    setEditedValues((prev) => ({ ...prev, [`${category}.${key}`]: value }));
  };

  const hasChanges = (category: string) => {
    return Object.keys(editedValues).some((k) => k.startsWith(`${category}.`));
  };

  const saveSection = async (category: string) => {
    setSaving(true);
    try {
      const entries = Object.entries(editedValues).filter(([k]) => k.startsWith(`${category}.`));
      await Promise.all(
        entries.map(([k, v]) => {
          const key = k.split(".")[1];
          return fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category, key, value: v }),
          });
        })
      );
      // Clear edited values for this section
      const cleared = { ...editedValues };
      entries.forEach(([k]) => delete cleared[k]);
      setEditedValues(cleared);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetchSettings();
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (category: string, key: string, label: string, type: "text" | "email" | "toggle" | "number" | "select", options?: string[]) => {
    const value = getValue(category, key);

    if (type === "toggle") {
      const isOn = value === true || value === "true";
      return (
        <div key={`${category}-${key}`} className="flex items-center justify-between py-4 border-b border-[#F3F4F6] last:border-0">
          <div>
            <p className="text-[13px] font-semibold text-[#1a1a1a]">{label}</p>
          </div>
          <button
            onClick={() => setValue(category, key, !isOn)}
            className={cn(
              "relative w-11 h-6 rounded-full transition-all duration-200",
              isOn ? "bg-[#38C172]" : "bg-[#E5E7EB]"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200",
              isOn ? "left-[22px]" : "left-0.5"
            )} />
          </button>
        </div>
      );
    }

    if (type === "select" && options) {
      return (
        <div key={`${category}-${key}`} className="py-4 border-b border-[#F3F4F6] last:border-0">
          <p className="text-[13px] font-semibold text-[#1a1a1a] mb-2">{label}</p>
          <select
            value={String(value)}
            onChange={(e) => setValue(category, key, e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={`${category}-${key}`} className="py-4 border-b border-[#F3F4F6] last:border-0">
        <p className="text-[13px] font-semibold text-[#1a1a1a] mb-2">{label}</p>
        <input
          type={type}
          value={String(value)}
          onChange={(e) => setValue(category, key, type === "number" ? Number(e.target.value) : e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all"
        />
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-0">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Paramètres généraux</h3>
            {renderField("general", "platform_name", "Nom de la plateforme", "text")}
            {renderField("general", "contact_email", "Email de contact", "email")}
            {renderField("general", "support_email", "Email de support", "email")}
            {renderField("general", "default_language", "Langue par défaut", "select", ["fr", "en"])}
            {renderField("general", "timezone", "Fuseau horaire", "select", ["Africa/Douala", "Europe/Paris", "America/New_York", "UTC"])}
          </div>
        );
      case "moderation":
        return (
          <div className="space-y-0">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Paramètres de modération</h3>
            {renderField("moderation", "auto_approve", "Approbation automatique", "toggle")}
            {renderField("moderation", "require_verification", "Vérification requise", "toggle")}
            {renderField("moderation", "report_threshold", "Seuil de signalements pour suspension", "number")}
            {renderField("moderation", "suspension_duration_days", "Durée de suspension (jours)", "number")}
          </div>
        );
      case "meets":
        return (
          <div className="space-y-0">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Paramètres des Meets</h3>
            {renderField("meets", "max_participants", "Nombre maximum de participants", "number")}
            {renderField("meets", "registration_deadline_hours", "Délai d'inscription (heures)", "number")}
            {renderField("meets", "default_visibility", "Visibilité par défaut", "select", ["public", "private"])}
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-0">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Paramètres de notification</h3>
            {renderField("notifications", "email_enabled", "Notifications par email", "toggle")}
            {renderField("notifications", "push_enabled", "Notifications push", "toggle")}
            {renderField("notifications", "weekly_report", "Rapport hebdomadaire", "toggle")}
            {renderField("notifications", "admin_alerts", "Alertes administrateur", "toggle")}
          </div>
        );
      case "security":
        return (
          <div className="space-y-0">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Paramètres de sécurité</h3>
            <div className="py-4 border-b border-[#F3F4F6]">
              <p className="text-[13px] font-semibold text-[#1a1a1a] mb-2">Changer le mot de passe</p>
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all mb-3"
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all"
              />
              <button className="mt-3 px-4 py-2.5 rounded-xl bg-[#38C172] text-white text-[12px] font-semibold hover:bg-[#22C55E] transition-all">
                Mettre à jour le mot de passe
              </button>
            </div>
            <div className="py-4">
              <p className="text-[13px] font-semibold text-[#1a1a1a] mb-1">Sessions actives</p>
              <p className="text-[12px] text-[#9CA3AF]">Session actuelle — Ce navigateur</p>
            </div>
          </div>
        );
      case "appearance":
        return (
          <div className="space-y-0">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Apparence</h3>
            <div className="py-4 border-b border-[#F3F4F6]">
              <p className="text-[13px] font-semibold text-[#1a1a1a] mb-3">Thème</p>
              <div className="flex gap-3">
                {["Clair", "Sombre", "Système"].map((theme) => (
                  <button
                    key={theme}
                    className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[12px] font-semibold text-[#4B5563] hover:border-[#38C172] hover:text-[#38C172] transition-all bg-white"
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
            <div className="py-4">
              <p className="text-[13px] font-semibold text-[#1a1a1a] mb-3">Couleur d'accent</p>
              <div className="flex gap-3">
                {[
                  { color: "#38C172", label: "Vert" },
                  { color: "#FF9E45", label: "Orange" },
                  { color: "#4F7DF3", label: "Bleu" },
                  { color: "#8B5CF6", label: "Violet" },
                ].map((c) => (
                  <button
                    key={c.label}
                    className="w-10 h-10 rounded-xl border-2 border-transparent hover:border-[#1a1a1a]/20 transition-all"
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <DashboardHeader adminName="Administrateur" onMenuClick={() => {}} />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
          Paramètres
        </h1>
        <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium mb-6">Configuration de la plateforme</p>
      </motion.div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-[3px] border-[#38C172]/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement…</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:w-[240px] flex-shrink-0"
          >
            <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all",
                    activeSection === section.id
                      ? "bg-[#38C172]/10 text-[#38C172]"
                      : "text-[#6B7280] hover:text-[#1a1a1a] hover:bg-[#F9FAFB]"
                  )}
                >
                  <section.icon className="w-[18px] h-[18px]" />
                  {section.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 bg-white rounded-[20px] border border-[#E5E7EB] p-6"
          >
            {renderSection()}

            {/* Save Button */}
            {hasChanges(activeSection) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center gap-3"
              >
                <button
                  onClick={() => saveSection(activeSection)}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#38C172] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(56,193,114,0.3)] hover:shadow-[0_6px_24px_rgba(56,193,114,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Sauvegarde…" : "Sauvegarder"}
                </button>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#38C172]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Sauvegardé avec succès
                  </motion.span>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}