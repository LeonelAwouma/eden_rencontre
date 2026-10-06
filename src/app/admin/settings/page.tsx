"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, Bell, Palette, Save, Loader2, CheckCircle2, AlertCircle, Check, Mail, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { Card, HEADING_FONT, LoadingBlock, btn, inputClass } from "@/components/admin/admin-ui";

interface SettingValue {
  [key: string]: unknown;
}

interface SettingsData {
  [category: string]: SettingValue;
}

// Chaque réglage affiché ici a un effet réel (cf. src/lib/platform-settings.ts).
const SECTIONS = [
  { id: "general", label: "Général", description: "Nom et contact", icon: Globe },
  { id: "notifications", label: "Notifications", description: "E-mails envoyés", icon: Bell },
  { id: "appearance", label: "Apparence", description: "Couleur et bandeau", icon: Palette },
];

const DEFAULTS: Record<string, unknown> = {
  "general.platform_name": "Garden of Alliance",
  "general.contact_email": "contact@gardenofalliance.com",
  "notifications.email_enabled": true,
  "appearance.accent_color": "#486B46",
  "appearance.banner_text": "",
};

/** En-tête d'un panneau de réglages. */
function PanelHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={HEADING_FONT}>{title}</h2>
      {description && <p className="text-[13px] text-[#5F6B63] mt-0.5">{description}</p>}
    </div>
  );
}

/** Ligne de réglage : libellé + aide à gauche, contrôle à droite (ou dessous sur mobile). */
function FieldRow({ label, description, htmlFor, children, inline = false }: {
  label: string; description?: string; htmlFor?: string; children: React.ReactNode; inline?: boolean;
}) {
  return (
    <div className={cn("py-5 border-b border-[#F1EEE9] last:border-0", inline ? "flex items-start justify-between gap-6" : "grid gap-3 md:grid-cols-[minmax(0,240px)_1fr] md:gap-8")}>
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-[#1F2A23]">{label}</label>
        ) : (
          <p className="text-[14px] font-semibold text-[#1F2A23]">{label}</p>
        )}
        {description && <p className="text-[13px] text-[#5F6B63] mt-1 leading-relaxed">{description}</p>}
      </div>
      <div className={cn("min-w-0", inline && "shrink-0")}>{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn(
        "relative w-11 h-6 shrink-0 rounded-full transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-[#D9D4CC]"
      )}>
      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-[left] duration-150", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function ResultNote({ result }: { result: { ok: boolean; text: string } }) {
  return (
    <p role="status" className={cn("mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium",
      result.ok ? "bg-primary/[0.08] text-[#2F5A2D]" : "bg-[#D64545]/[0.08] text-[#B83333]")}>
      {result.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      {result.text}
    </p>
  );
}

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
    setSaved(false);
    setEditedValues((prev) => ({ ...prev, [`${category}.${key}`]: value }));
  };

  const hasChanges = (category: string) =>
    Object.keys(editedValues).some((k) => k.startsWith(`${category}.`));

  const discardSection = (category: string) => {
    setSaveError(null);
    setEditedValues((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${category}.`))));
  };

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

  const renderTextField = (category: string, key: string, label: string, type: "text" | "email", description?: string) => (
    <FieldRow label={label} description={description} htmlFor={`${category}-${key}`}>
      <input
        id={`${category}-${key}`}
        type={type}
        value={String(getValue(category, key))}
        onChange={(e) => setValue(category, key, e.target.value)}
        className={inputClass}
      />
    </FieldRow>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <>
            <PanelHeader title="Paramètres généraux" description="Utilisés dans tous les e-mails envoyés aux membres." />
            {renderTextField("general", "platform_name", "Nom de la plateforme", "text",
              "Nom de l'expéditeur, repris dans l'objet et le texte des e-mails.")}
            {renderTextField("general", "contact_email", "E-mail de contact", "email",
              "Reçoit les réponses des membres et apparaît comme contact dans les e-mails.")}
          </>
        );
      case "notifications": {
        const isOn = getValue("notifications", "email_enabled") === true || getValue("notifications", "email_enabled") === "true";
        return (
          <>
            <PanelHeader title="Notifications par e-mail" description="Les e-mails liés au compte (inscription, validation, mot de passe, vérification) partent toujours." />
            <FieldRow inline label="E-mails de réunion"
              description="Invitations, reports et annulations de réunions. Désactivés, les invitations sont notées « non envoyées » et vous pourrez les renvoyer plus tard.">
              <Switch checked={isOn} onChange={(v) => setValue("notifications", "email_enabled", v)} label="E-mails de réunion" />
            </FieldRow>
            <TestEmailPanel />
            <ApprovalEmailsPanel />
          </>
        );
      }
      case "appearance":
        return <AppearanceSection getValue={getValue} setValue={setValue} />;
      default:
        return null;
    }
  };

  const dirty = hasChanges(activeSection);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Paramètres" subtitle="Configuration de la plateforme" />

      {loading ? (
        <Card><LoadingBlock label="Chargement des paramètres…" /></Card>
      ) : loadError ? (
        <p role="alert" className="p-4 rounded-xl bg-[#D64545]/[0.08] border border-[#D64545]/20 text-[14px] font-medium text-[#B83333] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {loadError}
        </p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Navigation des sections : onglets horizontaux sur mobile, colonne sur desktop */}
          <nav aria-label="Sections des paramètres" className="lg:w-[240px] shrink-0">
            <Card className="p-1.5 flex lg:flex-col gap-1 overflow-x-auto">
              {SECTIONS.map((section) => {
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => { setActiveSection(section.id); setSaveError(null); setSaved(false); }}
                    className={cn(
                      "flex-1 lg:flex-none flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150 whitespace-nowrap",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active ? "bg-primary/[0.08] text-[#2F5A2D]" : "text-[#4A534D] hover:bg-[#F5F3EF] hover:text-[#1F2A23]"
                    )}
                  >
                    <section.icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-primary" : "text-[#6B746E]")} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={cn("block text-[14px]", active ? "font-semibold" : "font-medium")}>{section.label}</span>
                      <span className="hidden lg:block text-[12px] text-[#5F6B63]">{section.description}</span>
                    </span>
                    {hasChanges(section.id) && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" title="Modifications non enregistrées">
                        <span className="sr-only">Modifications non enregistrées</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </Card>
          </nav>

          <Card as="section" className="flex-1 min-w-0 p-5 sm:p-6">
            {renderSection()}

            {(dirty || saved || saveError) && (
              <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 mt-6 px-5 sm:px-6 py-4 border-t border-[#F1EEE9] bg-white/95 backdrop-blur rounded-b-2xl flex flex-wrap items-center gap-3">
                {saveError ? (
                  <span role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-[#B83333] mr-auto">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                  </span>
                ) : saved && !dirty ? (
                  <span role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-primary mr-auto">
                    <CheckCircle2 className="w-4 h-4" /> Modifications enregistrées
                  </span>
                ) : (
                  <span className="text-[13px] text-[#5F6B63] mr-auto">Modifications non enregistrées</span>
                )}
                {dirty && (
                  <>
                    <button type="button" onClick={() => discardSection(activeSection)} disabled={saving} className={btn.secondary}>Annuler</button>
                    <button type="button" onClick={() => saveSection(activeSection)} disabled={saving} className={btn.primary}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Apparence ─────────────────────── */

const ACCENT_COLORS = [
  { color: "#486B46", label: "Vert Eden", note: "Recommandé" },
  { color: "#38C172", label: "Vert vif" },
  { color: "#FF9E45", label: "Orange" },
  { color: "#4F7DF3", label: "Bleu" },
  { color: "#8B5CF6", label: "Violet" },
  { color: "#C6A15B", label: "Doré" },
];

function AppearanceSection({
  getValue,
  setValue,
}: {
  getValue: (cat: string, key: string) => unknown;
  setValue: (cat: string, key: string, val: unknown) => void;
}) {
  const currentAccent = String(getValue("appearance", "accent_color") || "#486B46");
  const currentBanner = String(getValue("appearance", "banner_text") || "");
  const current = ACCENT_COLORS.find((c) => c.color.toLowerCase() === currentAccent.toLowerCase());

  return (
    <>
      <PanelHeader title="Apparence" description="Personnalisez la couleur d'accent et le message d'accueil de la plateforme." />

      <FieldRow label="Couleur d'accent" description="Couleur des menus, boutons et badges de l'interface admin et de l'espace membre.">
        <div role="radiogroup" aria-label="Couleur d'accent" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACCENT_COLORS.map((c) => {
            const selected = currentAccent.toLowerCase() === c.color.toLowerCase();
            return (
              <button
                key={c.color}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setValue("appearance", "accent_color", c.color)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  selected ? "border-[#1F2A23]/30 bg-[#FAF8F5]" : "border-[#E8E5E0] hover:border-[#D9D4CC] hover:bg-[#FAF8F5]"
                )}
              >
                <span className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ring-1 ring-black/5" style={{ backgroundColor: c.color }}>
                  {selected && <Check className="w-4 h-4 text-white" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#1F2A23] truncate">{c.label}</span>
                  <span className="block text-[12px] text-[#5F6B63] font-mono">{c.note ?? c.color}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Aperçu en direct de la couleur choisie */}
        <div className="mt-4 rounded-xl border border-[#F1EEE9] bg-[#FAF8F5] p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5F6B63] mb-3">Aperçu</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-white text-[13px] font-semibold" style={{ backgroundColor: currentAccent }}>
              Bouton principal
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
              style={{ backgroundColor: `${currentAccent}1a`, color: currentAccent }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" /> Approuvé
            </span>
            <span className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-[13px] font-semibold"
              style={{ backgroundColor: `${currentAccent}14`, color: currentAccent }}>
              <Palette className="w-4 h-4" /> Menu actif
            </span>
          </div>
          {current && current.color !== "#486B46" && (
            <p className="mt-3 text-[12px] text-[#5F6B63]">Le logo reste toujours en vert Eden, quelle que soit la couleur d&apos;accent.</p>
          )}
        </div>
      </FieldRow>

      <FieldRow label="Texte du bandeau" htmlFor="appearance-banner_text"
        description="Message affiché en haut de la page d'accueil. Laissez vide pour ne rien afficher.">
        <input
          id="appearance-banner_text"
          type="text"
          maxLength={200}
          value={currentBanner}
          onChange={(e) => setValue("appearance", "banner_text", e.target.value)}
          placeholder="Bienvenue sur Garden of Alliance"
          className={inputClass}
        />
        <div className="mt-1.5 flex justify-end text-[12px] text-[#5F6B63] tabular-nums">{currentBanner.length} / 200</div>
        {currentBanner.trim() && (
          <div className="mt-2 rounded-xl overflow-hidden border border-[#F1EEE9]">
            <p className="px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#5F6B63] bg-[#FAF8F5] border-b border-[#F1EEE9]">Aperçu sur l&apos;accueil</p>
            {/* Même rendu que src/components/garden/announcement-bar.tsx */}
            <div className="relative bg-deep-eden text-background text-center text-[12px] font-semibold tracking-wide py-2.5 px-10">
              {currentBanner.trim()}
              <X className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-80" aria-hidden="true" />
            </div>
          </div>
        )}
      </FieldRow>
    </>
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
    <FieldRow label="Tester l'envoi des e-mails" htmlFor="test-email-to"
      description="Si les membres ne reçoivent pas leurs e-mails, envoyez un test : en cas d'échec, la cause exacte s'affiche.">
      <div className="flex flex-col sm:flex-row gap-2">
        <input id="test-email-to" type="email" value={to} onChange={(e) => setTo(e.target.value)}
          placeholder="Adresse de test (par défaut : la vôtre)" className={cn(inputClass, "flex-1")} />
        <button type="button" onClick={send} disabled={busy} className={btn.secondary}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {busy ? "Envoi…" : "Envoyer un test"}
        </button>
      </div>
      {result && <ResultNote result={result} />}
    </FieldRow>
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
    <FieldRow label="E-mail de validation non reçu"
      description="Membres approuvés sans envoi enregistré de l'e-mail « Votre profil est maintenant actif » : approuvés avant le suivi des envois, ou envoi échoué.">
      {loadError ? (
        <ResultNote result={{ ok: false, text: loadError }} />
      ) : members === null ? (
        <p className="text-[13px] text-[#5F6B63] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</p>
      ) : members.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] font-medium text-primary">
          <CheckCircle2 className="w-4 h-4" /> Tous les membres approuvés ont reçu leur e-mail de validation.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button type="button" onClick={() => setShowList((v) => !v)} aria-expanded={showList}
              className="inline-flex items-center gap-1 text-left text-[13px] font-semibold text-primary hover:underline">
              {members.length} membre(s) concerné(s)
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-150", showList && "rotate-180")} aria-hidden="true" />
            </button>
            <button type="button" onClick={send} disabled={busy} className={cn(btn.primary, "sm:ml-auto")}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Envoi…" : `Envoyer l'e-mail de validation (${members.length})`}
            </button>
          </div>
          {showList && (
            <ul className="rounded-xl border border-[#F1EEE9] divide-y divide-[#F1EEE9] text-[13px] max-h-64 overflow-y-auto">
              {members.map((m) => (
                <li key={m.email} className="px-3 py-2 flex flex-wrap gap-x-2">
                  <span className="font-semibold text-[#1F2A23]">{m.name || "Membre"}</span>
                  <span className="text-[#5F6B63] break-all">{m.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {result && <ResultNote result={result} />}
    </FieldRow>
  );
}
