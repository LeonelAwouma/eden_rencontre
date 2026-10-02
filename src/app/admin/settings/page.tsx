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
            <TestEmailPanel />
            <ApprovalEmailsPanel />
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

/**
 * Test d'envoi : envoie un vrai e-mail avec la configuration du serveur et
 * affiche la cause précise en cas d'échec (mot de passe SMTP absent ou refusé…).
 */
function TestEmailPanel() {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setResult({ ok: false, text: data.error || "Le test n'a pas pu être lancé." });
      else setResult(data.ok
        ? { ok: true, text: `E-mail de test envoyé à ${data.to}. Vérifiez la boîte de réception (et les indésirables).` }
        : { ok: false, text: data.error || "Échec de l'envoi." });
    } catch {
      setResult({ ok: false, text: "Le test n'a pas pu être lancé." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-[#F3F4F6]">
      <h4 className="text-[14px] font-bold text-[#1a1a1a]">Tester l&apos;envoi des e-mails</h4>
      <p className="text-[12px] text-[#6B7280] mt-1">
        Si les membres ne reçoivent pas leurs e-mails (validation de compte…), envoyez un test : en cas d&apos;échec, la cause exacte s&apos;affiche.
      </p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Adresse de test (par défaut : la vôtre)"
          aria-label="Adresse de test"
          className="flex-1 h-10 px-3 rounded-xl border border-[#E5E7EB] text-[13px] outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/10" />
        <button onClick={send} disabled={busy}
          className="h-10 px-4 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-60">
          {busy ? "Envoi…" : "Envoyer un e-mail de test"}
        </button>
      </div>
      {result && (
        <p role="status" className={cn("mt-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium",
          result.ok ? "bg-[#486B46]/10 text-[#2E4A36]" : "bg-[#B42318]/10 text-[#B42318]")}>
          {result.text}
        </p>
      )}
    </div>
  );
}

/**
 * Rattrapage de l'e-mail de validation : membres approuvés sans envoi
 * enregistré (approuvés avant le suivi des envois, ou envoi échoué).
 */
function ApprovalEmailsPanel() {
  const [members, setMembers] = useState<{ email: string; name: string | null }[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/users/approval-emails");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(data.error || "Liste indisponible."); setMembers(null); return; }
      setMembers(data.members || []);
    } catch {
      setLoadError("Liste indisponible.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!members?.length) return;
    if (!window.confirm(`Envoyer l'e-mail « Votre profil est maintenant actif » à ${members.length} membre(s) approuvé(s) ?`)) return;
    setBusy(true);
    setResult(null);
    let sent = 0;
    const failed: { id: string; email: string; error: string }[] = [];
    try {
      // Par lots : la route traite quelques envois à la fois et indique ce qu'il reste.
      for (let guard = 0; guard < 50; guard++) {
        const res = await fetch("/api/admin/users/approval-emails", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skip: failed.map((f) => f.id) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setResult({ ok: false, text: data.error || "L'envoi a été interrompu." }); break; }
        sent += (data.sent || []).length;
        failed.push(...(data.failed || []));
        if (!data.remaining) {
          setResult(failed.length
            ? { ok: false, text: `${sent} e-mail(s) envoyé(s), ${failed.length} échec(s) : ${failed.map((f) => `${f.email} (${f.error})`).join(" ; ")}` }
            : { ok: true, text: `${sent} e-mail(s) de validation envoyé(s).` });
          break;
        }
      }
    } catch {
      setResult({ ok: false, text: `Envoi interrompu après ${sent} e-mail(s). Relancez pour envoyer le reste.` });
    } finally {
      setBusy(false);
      void load();
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-[#F3F4F6]">
      <h4 className="text-[14px] font-bold text-[#1a1a1a]">E-mail de validation non reçu</h4>
      <p className="text-[12px] text-[#6B7280] mt-1">
        Membres approuvés sans envoi enregistré de l&apos;e-mail « Votre profil est maintenant actif » : approuvés avant le suivi des envois, ou envoi échoué.
      </p>
      {loadError ? (
        <p role="alert" className="mt-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium bg-[#B42318]/10 text-[#B42318]">{loadError}</p>
      ) : members === null ? (
        <p className="mt-3 text-[13px] text-[#9CA3AF]">Chargement…</p>
      ) : members.length === 0 ? (
        <p className="mt-3 text-[13px] font-medium text-[#2E4A36]">Tous les membres approuvés ont reçu leur e-mail de validation.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button type="button" onClick={() => setShowList((v) => !v)} aria-expanded={showList}
              className="text-left text-[13px] font-semibold text-[#486B46] hover:underline">
              {members.length} membre(s) concerné(s) {showList ? "▴" : "▾"}
            </button>
            <button onClick={send} disabled={busy}
              className="sm:ml-auto h-10 px-4 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Envoi…" : `Envoyer l'e-mail de validation (${members.length})`}
            </button>
          </div>
          {showList && (
            <ul className="rounded-xl border border-[#F3F4F6] divide-y divide-[#F3F4F6] text-[12px] text-[#374151]">
              {members.map((m) => (
                <li key={m.email} className="px-3 py-2 flex flex-wrap gap-x-2">
                  <span className="font-semibold">{m.name || "Membre"}</span>
                  <span className="text-[#9CA3AF] break-all">{m.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {result && (
        <p role="status" className={cn("mt-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium",
          result.ok ? "bg-[#486B46]/10 text-[#2E4A36]" : "bg-[#B42318]/10 text-[#B42318]")}>
          {result.text}
        </p>
      )}
    </div>
  );
}
