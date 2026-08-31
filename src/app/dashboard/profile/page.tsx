"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSession, updateProfile, logout, EdenUser } from "@/lib/auth";
import { saveOnboarding, QUESTIONNAIRES, Questionnaire, Section, Field } from "@/lib/onboarding";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { Tab } from "@/components/dashboard/dashboard-types";
import {
  User, Edit3, Save, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight,
  MapPin, Briefcase, BookOpen, Lock, Heart
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { isProfileFullyComplete } from "@/lib/profile-completion";


/* ─────────────────────────── Types ─────────────────────────── */

interface ProfileData {
  id: string;
  email: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  gender: string | null;
  civil_status: string | null;
  region: string | null;
  profession: string | null;
  bio: string | null;
  marriage_vision: string[] | null;
  birth_date: string | null;
  questionnaire: Record<string, any>;
  onboarding_completed: boolean;
  verification_status: string;
  updated_at: string;
}

/* ─────────────────────── Helpers ─────────────────────────── */

const CIVIL_STATUS_OPTIONS = ["Single", "Divorced", "Widowed", "Separated"];
const GENDER_OPTIONS = ["Male", "Female"];
const MARRIAGE_VISION_OPTIONS = [
  "Biblical marriage", "Prayer-based", "Ministry as a couple",
  "Christian education of children", "Absolute fidelity", "Open communication"
];

function getAvatarLetter(name?: string | null) {
  return name?.charAt(0)?.toUpperCase() || "E";
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function ProfileAvatar({ name, avatarUrl, size = "lg" }: { name?: string | null; avatarUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "w-10 h-10 text-sm", md: "w-16 h-16 text-xl", lg: "w-24 h-24 text-3xl" }[size];
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || ""} className={`${sizeClasses} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizeClasses} rounded-full bg-[#EEF5EC] text-[#486B46] font-bold flex items-center justify-center`}>
      {getAvatarLetter(name)}
    </div>
  );
}

/* ───────────────────── Toast ──────────────────────────── */

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? "bg-[#486B46]" : "bg-red-500";
  const Icon = type === "success" ? CheckCircle : AlertCircle;
  return (
    <div className={`fixed bottom-6 right-6 ${bg} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in z-[100]`}>
      <Icon size={18} /><span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14} /></button>
    </div>
  );
}

/* ────────────────── Basic Info Section ─────────────────────── */

function BasicInfoCard({ profile, onRefresh, onSwitchToFaith }: { profile: ProfileData; onRefresh: () => void; onSwitchToFaith: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: profile.name || "",
    city: profile.city || "",
    country: profile.country || "",
    region: profile.region || "",
    profession: profile.profession || "",
    bio: profile.bio || "",
    civil_status: profile.civil_status || "",
    gender: profile.gender || "",
    birth_date: profile.birth_date || "",
    marriage_vision: (profile.marriage_vision || []) as string[],
  });

  useEffect(() => {
    setForm({
      name: profile.name || "", city: profile.city || "", country: profile.country || "",
      region: profile.region || "", profession: profile.profession || "", bio: profile.bio || "",
      civil_status: profile.civil_status || "", gender: profile.gender || "",
      birth_date: profile.birth_date || "", marriage_vision: profile.marriage_vision || [],
    });
  }, [profile]);

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Name is required."); return; }
    setSaving(true);
    try {
      if (!supabase) return;
      const { error } = await supabase.from("profiles").update({
        name: form.name.trim(), city: form.city.trim(), country: form.country.trim(),
        region: form.region.trim(), profession: form.profession.trim(), bio: form.bio.trim(),
        civil_status: form.civil_status, gender: form.gender, birth_date: form.birth_date || null,
        marriage_vision: form.marriage_vision, updated_at: new Date().toISOString(),
      }).eq("id", profile.id);
      if (error) throw error;
      await updateProfile({ name: form.name.trim(), city: form.city, country: form.country, profession: form.profession, bio: form.bio, marriageVision: form.marriage_vision });
      setEditing(false);
      onRefresh();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally { setSaving(false); }
  };

  const toggleVision = (v: string) => {
    setForm(f => ({
      ...f,
      marriage_vision: f.marriage_vision.includes(v) ? f.marriage_vision.filter(x => x !== v) : [...f.marriage_vision, v]
    }));
  };

  return (
    <div className="eden-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#2F2F2F] flex items-center gap-2">
          <User size={20} className="text-[#486B46]" /> Personal Information
        </h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="eden-btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5">
            <Edit3 size={14} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="eden-btn-outline text-xs px-3 py-1.5"><X size={14} /></button>
            <button onClick={handleSave} disabled={saving} className="eden-btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="space-y-5">
          {/* Profile Header */}
          <div className="flex items-center gap-5 pb-5 border-b border-[#F0EDE8]">
            <ProfileAvatar name={profile.name} avatarUrl={profile.avatar_url} size="lg" />
            <div className="min-w-0">
              <h4 className="text-xl font-bold text-[#2F2F2F] truncate inline-flex items-center gap-2">
                {profile.name || "—"}
                {profile.verification_status === "verified" && isProfileFullyComplete(profile) && <VerifiedBadge size={18} />}
              </h4>
              <p className="text-sm text-[#777777] truncate">{profile.email}</p>
              {profile.city && <p className="text-sm text-[#777777] flex items-center gap-1 mt-0.5"><MapPin size={12} />{profile.city}{profile.country ? `, ${profile.country}` : ""}</p>}
            </div>
          </div>

          {/* Personal Info Section */}
          <div>
            <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={14} /> Personal Information
            </h4>
            <div className="space-y-0">
              <InfoRow label="Full Name" value={profile.name} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Date of Birth" value={formatDate(profile.birth_date)} />
              <InfoRow label="Civil Status" value={profile.civil_status} />
            </div>
          </div>

          {/* Location Section */}
          <div>
            <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin size={14} /> Location
            </h4>
            <div className="space-y-0">
              <InfoRow label="City" value={profile.city} />
              <InfoRow label="Country" value={profile.country} />
              <InfoRow label="Region" value={profile.region} />
            </div>
          </div>

          {/* Professional Info */}
          <div>
            <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase size={14} /> Professional Background
            </h4>
            <div className="space-y-0">
              <InfoRow label="Profession" value={profile.profession} />
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div>
              <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-3">About Me</h4>
              <p className="text-sm text-[#2F2F2F] leading-relaxed whitespace-pre-wrap bg-[#FAFAF7] rounded-xl p-4 border border-[#F0EDE8]">{profile.bio}</p>
            </div>
          )}

          {/* Marriage Vision */}
          {profile.marriage_vision && profile.marriage_vision.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Heart size={14} /> Marriage Vision
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.marriage_vision.map(v => (
                  <span key={v} className="px-3 py-1.5 bg-[#EEF5EC] text-[#486B46] rounded-full text-xs font-medium">{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Onboarding Summary */}
          {profile.questionnaire && Object.keys(profile.questionnaire).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen size={14} /> Faith Journey Data
              </h4>
              <p className="text-xs text-[#777777] mb-3">Answers saved during onboarding. Editable in the "Faith Journey" tab.</p>
              <div className="space-y-0">
                {QUESTIONNAIRES.flatMap(q => q.sections.flatMap(s => s.fields))
                  .filter(f => {
                    const v = profile.questionnaire[f.id];
                    return v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
                  })
                  .slice(0, 15)
                  .map(f => {
                    const v = profile.questionnaire[f.id];
                    const display = Array.isArray(v) ? v.join(", ") : String(v);
                    return <InfoRow key={f.id} label={f.label} value={display} />;
                  })}
              </div>
              {Object.keys(profile.questionnaire).filter(k => {
                const v = profile.questionnaire[k];
                return v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
              }).length > 15 && (
                <button onClick={onSwitchToFaith} className="text-xs text-[#486B46] font-semibold mt-3 hover:underline">
                  View all answers in Faith Journey →
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Identité */}
          <div>
            <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-[#F0EDE8]">
              <User size={14} /> Identity
            </h4>
            <div className="space-y-4">
              <EditField label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField label="Gender" value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))} type="select" options={GENDER_OPTIONS} />
                <EditField label="Date of Birth" value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} type="date" />
                <EditField label="Civil Status" value={form.civil_status} onChange={v => setForm(f => ({ ...f, civil_status: v }))} type="select" options={CIVIL_STATUS_OPTIONS} />
                <EditField label="Profession" value={form.profession} onChange={v => setForm(f => ({ ...f, profession: v }))} />
              </div>
            </div>
          </div>

          {/* Section: Location */}
          <div>
            <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-[#F0EDE8]">
              <MapPin size={14} /> Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <EditField label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
              <EditField label="Country" value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} />
              <EditField label="Region" value={form.region} onChange={v => setForm(f => ({ ...f, region: v }))} />
            </div>
          </div>

          {/* Section: Bio */}
          <div>
            <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-4 pb-2 border-b border-[#F0EDE8]">About Me</h4>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4}
              placeholder="Describe yourself in a few words…"
              className="w-full border border-[#E0DDD8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20 resize-none" />
          </div>

          {/* Section: Marriage Vision */}
          <div>
            <h4 className="text-xs font-bold text-[#486B46] uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-[#F0EDE8]">
              <Heart size={14} /> Marriage Vision
            </h4>
            <div className="flex flex-wrap gap-2">
              {MARRIAGE_VISION_OPTIONS.map(v => (
                <button key={v} onClick={() => toggleVision(v)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${form.marriage_vision.includes(v) ? "bg-[#486B46] text-white shadow-sm" : "bg-[#F5F3F0] text-[#777777] hover:bg-[#EEF5EC] hover:text-[#486B46] border border-[#E0DDD8]"}`}>
                  {form.marriage_vision.includes(v) ? "✓ " : ""}{v}
                </button>
              ))}
            </div>
          </div>

          {/* Save / Cancel buttons at bottom */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0EDE8]">
            <button onClick={() => setEditing(false)} className="eden-btn-outline text-sm px-5 py-2.5">
              <X size={16} className="mr-1.5 inline" /> Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="eden-btn-primary text-sm px-6 py-2.5 flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save les modifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#F0EDE8] last:border-0">
      <span className="text-xs font-semibold text-[#777777] uppercase tracking-wider w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#2F2F2F] flex items-center gap-1.5">{icon}{value || "—"}</span>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text", options, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
  options?: string[]; required?: boolean; placeholder?: string;
}) {
  if (type === "select" && options) {
    return (
      <div>
        <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider mb-1 block">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-[#E0DDD8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20 bg-white">
          <option value="">Sélectionner…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (type === "textarea") {
    return (
      <div>
        <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider mb-1 block">{label}</label>
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full border border-[#E0DDD8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20 resize-none" />
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full border border-[#E0DDD8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20" />
    </div>
  );
}

/* ────────────────── Faith Journey Section ─────────────────────── */

function FaithJourneyCard({ profileId, answers, onRefresh }: { profileId: string; answers: Record<string, any>; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<string | null>(null);
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>(answers || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalAnswers(answers || {}); }, [answers]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setLocalAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleMultiToggle = (fieldId: string, option: string) => {
    const current: string[] = localAnswers[fieldId] || [];
    handleFieldChange(fieldId, current.includes(option) ? current.filter(x => x !== option) : [...current, option]);
  };

  const handleSaveQuestionnaire = async () => {
    setSaving(true);
    try {
      const result = await saveOnboarding(localAnswers, true);
      if (!result.ok) throw new Error(result.error);
      setEditingQ(null);
      onRefresh();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally { setSaving(false); }
  };

  const getCompletionCount = (q: Questionnaire) => {
    let total = 0, filled = 0;
    q.sections.forEach(s => s.fields.forEach(f => {
      total++;
      const v = localAnswers[f.id];
      if (v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "")) filled++;
    }));
    return { total, filled, pct: total > 0 ? Math.round((filled / total) * 100) : 0 };
  };

  return (
    <div className="eden-card p-6">
      <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#2F2F2F] flex items-center gap-2 mb-6">
        <BookOpen size={20} className="text-[#486B46]" /> Mon Faith Journey
      </h3>
      <div className="space-y-4">
        {QUESTIONNAIRES.map(q => {
          const { filled, total, pct } = getCompletionCount(q);
          const isExpanded = expanded === q.key;
          const isEditing = editingQ === q.key;

          return (
            <div key={q.key} className="border border-[#E0DDD8] rounded-xl overflow-hidden">
              <button onClick={() => { setExpanded(isExpanded ? null : q.key); setEditingQ(null); }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAF7] transition-colors text-left">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-sm text-[#2F2F2F]">{q.title}</h4>
                    <span className="text-xs text-[#777777]">{q.subtitle}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 max-w-[200px] bg-[#F0EDE8] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#486B46] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[#777777]">{filled}/{total} réponses</span>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={18} className="text-[#777777]" /> : <ChevronRight size={18} className="text-[#777777]" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#F0EDE8]">
                  {q.note && (
                    <div className="mt-4 mb-3 px-4 py-3 rounded-xl text-center" style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
                      <p className="text-xs font-semibold leading-relaxed" style={{ color: "#486B46" }}>
                        {q.note}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-4 mb-4">
                    {!isEditing ? (
                      <button onClick={() => setEditingQ(q.key)} className="eden-btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <Edit3 size={14} /> Edit
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setEditingQ(null); setLocalAnswers(answers || {}); }} className="eden-btn-outline text-xs px-3 py-1.5"><X size={14} /></button>
                        <button onClick={handleSaveQuestionnaire} disabled={saving} className="eden-btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                      </>
                    )}
                  </div>
                  {q.sections.map(section => (
                    <SectionBlock key={section.key} section={section} answers={localAnswers} isEditing={isEditing}
                      onFieldChange={handleFieldChange} onMultiToggle={handleMultiToggle} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionBlock({ section, answers, isEditing, onFieldChange, onMultiToggle }: {
  section: Section; answers: Record<string, any>; isEditing: boolean;
  onFieldChange: (id: string, val: any) => void; onMultiToggle: (id: string, opt: string) => void;
}) {
  return (
    <div className="mb-5">
      <h5 className="text-sm font-bold text-[#486B46] mb-1 flex items-center gap-2">
        {section.title}
        {section.private && <Lock size={12} className="text-[#C6A15B]" />}
      </h5>
      {section.intro && <p className="text-xs text-[#777777] mb-3 italic">{section.intro}</p>}
      <div className="space-y-3">
        {section.fields.map(field => (
          <FieldDisplay key={field.id} field={field} value={answers[field.id]} isEditing={isEditing}
            onChange={v => onFieldChange(field.id, v)} onMultiToggle={opt => onMultiToggle(field.id, opt)} />
        ))}
      </div>
    </div>
  );
}

function FieldDisplay({ field, value, isEditing, onChange, onMultiToggle }: {
  field: Field; value: any; isEditing: boolean;
  onChange: (v: any) => void; onMultiToggle: (opt: string) => void;
}) {
  const displayValue = () => {
    if (!value) return <span className="text-[#BBBBBB] italic text-sm">Not specified</span>;
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v: string) => <span key={v} className="px-2.5 py-0.5 bg-[#EEF5EC] text-[#486B46] rounded-full text-xs">{v}</span>)}
        </div>
      );
    }
    return <span className="text-sm text-[#2F2F2F] whitespace-pre-wrap">{String(value)}</span>;
  };

  if (isEditing) {
    switch (field.type) {
      case "text":
        return (
          <div>
            <label className="text-xs text-[#777777] font-medium mb-1 block">{field.label}</label>
            <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder}
              className="w-full border border-[#E0DDD8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20" />
          </div>
        );
      case "textarea":
        return (
          <div>
            <label className="text-xs text-[#777777] font-medium mb-1 block">{field.label}</label>
            <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3} placeholder={field.placeholder}
              className="w-full border border-[#E0DDD8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20 resize-none" />
            {field.help && <p className="text-xs text-[#999] mt-1">{field.help}</p>}
          </div>
        );
      case "single":
      case "qcm":
        return (
          <div>
            <label className="text-xs text-[#777777] font-medium mb-1.5 block">{field.label}</label>
            <div className="space-y-1.5">
              {field.options?.map(opt => (
                <button key={opt} onClick={() => onChange(opt)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${value === opt ? "bg-[#486B46] text-white" : "bg-[#F5F3F0] text-[#2F2F2F] hover:bg-[#EEF5EC]"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case "multi":
        return (
          <div>
            <label className="text-xs text-[#777777] font-medium mb-1.5 block">{field.label}</label>
            <div className="flex flex-wrap gap-2">
              {field.options?.map(opt => {
                const selected = Array.isArray(value) && value.includes(opt);
                return (
                  <button key={opt} onClick={() => onMultiToggle(opt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selected ? "bg-[#486B46] text-white" : "bg-[#F5F3F0] text-[#777777] hover:bg-[#EEF5EC]"}`}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {field.help && <p className="text-xs text-[#999] mt-1">{field.help}</p>}
          </div>
        );
      case "agerange":
        return (
          <div>
            <label className="text-xs text-[#777777] font-medium mb-1 block">{field.label}</label>
            <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Ex : 25-35"
              className="w-full border border-[#E0DDD8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20" />
          </div>
        );
    }
  }

  return (
    <div className="py-2 border-b border-[#F5F3F0] last:border-0">
      <p className="text-xs text-[#777777] font-medium mb-1">{field.label}</p>
      {displayValue()}
    </div>
  );
}

/* ────────────────── Profile Completion ─────────────────────── */

function ProfileCompletionCard({ profile }: { profile: ProfileData }) {
  const checks = [
    { label: "Profile Photo", done: !!profile.avatar_url },
    { label: "Full Name", done: !!profile.name },
    { label: "Bio", done: !!profile.bio },
    { label: "City", done: !!profile.city },
    { label: "Profession", done: !!profile.profession },
    { label: "Civil Status", done: !!profile.civil_status },
    { label: "Marriage Vision", done: !!(profile.marriage_vision && profile.marriage_vision.length > 0) },
    { label: "Faith Journey", done: profile.onboarding_completed },
  ];
  const done = checks.filter(c => c.done).length;
  const pct = Math.round((done / checks.length) * 100);

  return (
    <div className="eden-card p-6">
      <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#2F2F2F] mb-4">Profile Completion</h3>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#EEF5EC" strokeWidth="4" />
            <circle cx="28" cy="28" r="24" fill="none" stroke="#486B46" strokeWidth="4"
              strokeDasharray={`${pct * 1.508} 150.8`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#486B46]">{pct}%</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#2F2F2F]">{done}/{checks.length} completed</p>
          <p className="text-xs text-[#777777]">Complete your profile for more visibility</p>
        </div>
      </div>
      <div className="space-y-2">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${c.done ? "bg-[#486B46]" : "border-2 border-[#D0CDC8]"}`}>
              {c.done && <CheckCircle size={12} className="text-white" />}
            </div>
            <span className={`text-sm ${c.done ? "text-[#2F2F2F]" : "text-[#777777]"}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── Main Page ────────────────────────────── */

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"profile" | "faith">("profile");
  const [mobileNav, setMobileNav] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadProfile = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const session = await getSession();
      if (!session?.id) { router.replace("/login"); return; }

      const { data, error } = await supabase.from("profiles")
        .select("id, email, name, city, country, avatar_url, gender, civil_status, region, profession, bio, marriage_vision, birth_date, questionnaire, onboarding_completed, verification_status, updated_at")
        .eq("id", session.id)
        .maybeSingle();
      if (error) throw error;
      if (data) setProfile(data as ProfileData);
    } catch (e: any) {
      console.error("[Profile]", e);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleRefresh = () => {
    loadProfile();
    setToast({ message: "Profile updated successfully", type: "success" });
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleSetActiveTab = (t: Tab) => {
    if (t === "Profile") return;
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#486B46] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#777777]">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="text-center p-8 eden-card max-w-md mx-4">
          <AlertCircle size={40} className="text-[#C6A15B] mx-auto mb-4" />
          <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#2F2F2F] mb-2">Profile not found</h2>
          <p className="text-sm text-[#777777] mb-4">Unable to load your profile. Please try again.</p>
          <Link href="/dashboard" className="eden-btn-primary inline-flex items-center gap-2 text-sm px-5 py-2.5">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const sidebarProps = {
    activeTab: "Profile" as Tab,
    setActiveTab: handleSetActiveTab,
    displayName: profile.name || "Member",
    displayInitial: getAvatarLetter(profile.name),
    myAvatar: profile.avatar_url || undefined,
    displayLocation: profile.city || "",
    totalUnread: 0,
    incomingRequestCount: 0,
    notifCount: 0,
    onLogout: handleLogout,
  };

  return (
    <div className="flex h-screen bg-[#FAF9F6]">
      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <DashboardSidebar {...sidebarProps} />
      </div>

      {/* Mobile nav */}
      <div className="lg:hidden">
        <button onClick={() => setMobileNav(true)}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow flex items-center justify-center border border-[#E0DDD8]">
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><path d="M1 1h16M1 7h16M1 13h16" stroke="#2F2F2F" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        {mobileNav && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNav(false)} />
            <div className="relative z-10 h-full w-[280px]">
              <DashboardSidebar {...sidebarProps} />
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E0DDD8] px-4 sm:px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <ProfileAvatar name={profile.name} avatarUrl={profile.avatar_url} size="md" />
            <div className="flex-1 min-w-0">
              <h1 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-[#2F2F2F] truncate inline-flex items-center gap-2">
                {profile.name || "My Profile"}
                {profile.verification_status === "verified" && isProfileFullyComplete(profile) && <VerifiedBadge size={20} />}
              </h1>
              <p className="text-sm text-[#777777] truncate">{profile.email} {profile.city ? `· ${profile.city}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTab("profile")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "profile" ? "bg-[#486B46] text-white" : "bg-white text-[#777777] hover:bg-[#EEF5EC]"}`}>Profile</button>
              <button onClick={() => setTab("faith")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === "faith" ? "bg-[#486B46] text-white" : "bg-white text-[#777777] hover:bg-[#EEF5EC]"}`}>Faith Journey</button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
          {tab === "profile" ? (
            <>
              <BasicInfoCard profile={profile} onRefresh={handleRefresh} onSwitchToFaith={() => setTab("faith")} />
              <ProfileCompletionCard profile={profile} />
            </>
          ) : (
            <FaithJourneyCard profileId={profile.id} answers={profile.questionnaire || {}} onRefresh={handleRefresh} />
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}