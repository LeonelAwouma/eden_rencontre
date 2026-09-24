"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Bell,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingValue {
  [key: string]: unknown;
}

interface SettingsData {
  [category: string]: SettingValue;
}

// Chaque réglage affiché ici a un effet réel (cf. src/lib/platform-settings.ts).
const SECTIONS = [
  { id: "general", label: "Général", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Apparence", icon: Palette },
];

const DEFAULTS: Record<string, unknown> = {
  "general.platform_name": "Garden of Alliance",
  "general.contact_email": "contact@gardenofalliance.com",
  "notifications.email_enabled": true,
  "appearance.accent_color": "#486B46",
  "appearance.banner_text": "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Chargement impossible.");
      setSettings(data.settings || {});
      setLoadError(null);
    } catch (err) {
      console.error("Error fetching settings:", err);
      setLoadError("Impossible de charger les paramètres. Rechargez la page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const getValue = (category: string, key: string) => {
    const id = `${category}.${key}`;
    if (editedValues[id] !== undefined) return editedValues[id];
    const val = settings[category]?.[key];
    return val !== undefined ? val : DEFAULTS[id] ?? "";
  };

  const setValue = (category: string, key: string, value: unknown) => {
    setSaveError(null);
    setEditedValues((prev) => ({ ...prev, [`${category}.${key}`]: value }));
  };

  const hasChanges = (category: string) =>
    Object.keys(editedValues).some((k) => k.startsWith(`${category}.`));

  const saveSection = async (category: string) => {
    setSaving(true);
    setSaveError(null);
    const entries = Object.entries(editedValues).filter(([k]) => k.startsWith(`${category}.`));
    const errors: string[] = [];
    const succeeded: string[] = [];

    for (const [id, value] of entries) {
      const key = id.slice(category.length + 1);
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, key, value }),
        });
        if (res.ok) {
          succeeded.push(id);
        } else {
          const data = await res.json().catch(() => ({}));
          errors.push(data.error || "Enregistrement refusé par le serveur.");
        }
      } catch {
        errors.push("Erreur réseau. Vérifiez votre connexion.");
      }
    }

    // On ne retire que ce qui a vraiment été enregistré : le reste reste modifiable.
    setEditedValues((prev) => {
      const next = { ...prev };
      succeeded.forEach((id) => delete next[id]);
      return next;
    });
    await fetchSettings();

    if (succeeded.includes("appearance.accent_color")) {
      const accent = String(editedValues["appearance.accent_color"]);
      document.documentElement.style.setProperty("--accent-hex", accent);
      document.documentElement.style.setProperty("--accent-hex-10", accent + "1a");
      document.documentElement.style.setProperty("--accent-hex-20", accent + "33");
      document.documentElement.style.setProperty("--accent-hex-50", accent + "80");
    }

    if (errors.length) {
      setSaveError(Array.from(new Set(errors)).join(" "));
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const renderField = (
    category: string,
    key: string,
    label: string,
    type: "text" | "email" | "toggle",
    description?: string
  ) => {
    const value = getValue(category, key);

    if (type === "toggle") {
      const isOn = value === true || value === "true";
      return (
        <div key={`${category}-${key}`} className="flex items-center justify-between gap-6 py-4 border-b border-[#F3F4F6] last:border-0">
          <div>
            <p className="text-[13px] font-semibold text-[#1a1a1a]">{label}</p>
            {description && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{description}</p>}
          </div>
          <button
            role="switch"
            aria-checked={isOn}
            aria-label={label}
            onClick={() => setValue(category, key, !isOn)}
            className={cn(
              "relative w-11 h-6 shrink-0 rounded-full transition-all duration-200",
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

    return (
      <div key={`${category}-${key}`} className="py-4 border-b border-[#F3F4F6] last:border-0">
        <label htmlFor={`${category}-${key}`} className="block text-[13px] font-semibold text-[#1a1a1a] mb-1">{label}</label>
        {description && <p className="text-[11px] text-[#9CA3AF] mb-2">{description}</p>}
        <input
          id={`${category}-${key}`}
          type={type}
          value={String(value)}
          onChange={(e) => setValue(category, key, e.target.value)}
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
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-1">Paramètres généraux</h3>
            <p className="text-[12px] text-[#9CA3AF] mb-2">Utilisés dans tous les e-mails envoyés aux membres.</p>
            {renderField("general", "platform_name", "Nom de la plateforme", "text",
              "Nom de l'expéditeur, et nom repris dans l'objet et le texte des e-mails.")}
            {renderField("general", "contact_email", "E-mail de contact", "email",
              "Adresse qui reçoit les réponses des membres et qui est indiquée comme contact dans les e-mails.")}
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-0">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Notifications par e-mail</h3>
            {renderField("notifications", "email_enabled", "E-mails de réunion", "toggle",
              "Invitations, reports et annulations de réunions. Désactivé, les invitations sont notées « non envoyées » et vous pourrez les renvoyer plus tard.")}
            <p className="text-[11px] text-[#9CA3AF] pt-4">
              Les e-mails liés au compte (inscription, validation, mot de passe, vérification) partent toujours.
            </p>
          </div>
        );
      case "appearance":
        return <AppearanceSection getValue={getValue} setValue={setValue} />;
      default:
        return null;
    }
  };

  return (
    <>
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
      ) : loadError ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[13px] font-medium text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {loadError}
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
                  onClick={() => { setActiveSection(section.id); setSaveError(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all",
                    activeSection === section.id
                      ? "bg-[#38C172]/10 text-[#38C172]"
                      : "text-[#6B7280] hover:text-[#1a1a1a] hover:bg-[#F9FAFB]"
                  )}
                >
                  <section.icon className="w-[18px] h-[18px]" />
                  {section.label}
                  {hasChanges(section.id) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF9E45]" aria-label="Modifications non enregistrées" />}
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

            {(hasChanges(activeSection) || saved || saveError) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-4 border-t border-[#F3F4F6] flex flex-wrap items-center gap-3"
              >
                {hasChanges(activeSection) && (
                  <button
                    onClick={() => saveSection(activeSection)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#38C172] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(56,193,114,0.3)] hover:shadow-[0_6px_24px_rgba(56,193,114,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                )}
                {saved && !saveError && (
                  <span role="status" className="flex items-center gap-1.5 text-[12px] font-semibold text-[#38C172]">
                    <CheckCircle2 className="w-4 h-4" /> Sauvegardé avec succès
                  </span>
                )}
                {saveError && (
                  <span role="alert" className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                  </span>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}

/* ───────────────────── Appearance Section ─────────────────────── */

function AppearanceSection({
  getValue,
  setValue,
}: {
  getValue: (cat: string, key: string) => unknown;
  setValue: (cat: string, key: string, val: unknown) => void;
}) {
  const currentAccent = String(getValue("appearance", "accent_color") || "#486B46");
  const currentBanner = String(getValue("appearance", "banner_text") || "");

  const accentColors = [
    { color: "#486B46", label: "Vert Eden" },
    { color: "#38C172", label: "Vert vif" },
    { color: "#FF9E45", label: "Orange" },
    { color: "#4F7DF3", label: "Bleu" },
    { color: "#8B5CF6", label: "Violet" },
    { color: "#C6A15B", label: "Doré" },
  ];

  return (
    <div className="space-y-0">
      <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-4">Apparence</h3>

      {/* Accent Color */}
      <div className="py-4 border-b border-[#F3F4F6]">
        <p className="text-[13px] font-semibold text-[#1a1a1a] mb-1">Couleur d'accent</p>
        <p className="text-[11px] text-[#9CA3AF] mb-3">Couleur des menus, boutons et badges de l'interface admin et de l'espace membre.</p>
        <div className="flex flex-wrap gap-3">
          {accentColors.map((c) => (
            <button
              key={c.label}
              onClick={() => setValue("appearance", "accent_color", c.color)}
              className={cn(
                "w-10 h-10 rounded-xl transition-all relative",
                currentAccent === c.color
                  ? "ring-2 ring-offset-2 ring-[#1a1a1a]/30 scale-110"
                  : "hover:scale-105"
              )}
              style={{ backgroundColor: c.color }}
              title={c.label}
              aria-label={c.label}
              aria-pressed={currentAccent === c.color}
            >
              {currentAccent === c.color && (
                <CheckCircle2 className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Banner Text */}
      <div className="py-4">
        <label htmlFor="appearance-banner_text" className="block text-[13px] font-semibold text-[#1a1a1a] mb-1">Texte du bandeau</label>
        <p className="text-[11px] text-[#9CA3AF] mb-2">Message affiché en haut de la page d'accueil. Laissez vide pour ne rien afficher.</p>
        <input
          id="appearance-banner_text"
          type="text"
          maxLength={200}
          value={currentBanner}
          onChange={(e) => setValue("appearance", "banner_text", e.target.value)}
          placeholder="Bienvenue sur Garden of Alliance"
          className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all"
        />
      </div>
    </div>
  );
}
