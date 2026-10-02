"use client";

/**
 * « À traiter » (Admin → Utilisateurs) : ce qui demande une décision ou une
 * relance — inscriptions en attente, membres approuvés au profil incomplet,
 * comptes de connexion sans profil. Masqué quand tout est en ordre.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Trash2, Mail, Clock, UserX, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

interface Orphan { id: string; email: string; provider: string; created_at: string; last_sign_in_at: string | null }
interface Incomplete { id: string; email: string; name: string | null; pseudo: string | null; missing: string[]; reminded_at: string | null }
interface Pending { id: string; email: string; name: string | null; created_at: string; profileComplete: boolean }
interface Health { orphans: Orphan[]; incomplete: Incomplete[]; pending: Pending[]; reminderTracking: boolean }

const REMIND_COOLDOWN_MS = 7 * 24 * 3600 * 1000;

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const ago = (iso: string) => { const d = daysSince(iso); return d === 0 ? "aujourd'hui" : d === 1 ? "depuis hier" : `depuis ${d} jours`; };
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function DataHealthPanel() {
  const [data, setData] = useState<Health | null>(null);
  const [open, setOpen] = useState<"pending" | "incomplete" | "orphans" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users/data-health");
      if (res.ok) setData(await res.json());
    } catch { /* bloc facultatif : la liste des membres reste utilisable */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!data) return null;
  const due = data.incomplete.filter((m) => !m.reminded_at || Date.now() - new Date(m.reminded_at).getTime() > REMIND_COOLDOWN_MS);
  const total = data.pending.length + data.incomplete.length + data.orphans.length;
  if (total === 0) return null;

  const deleteOrphan = async (o: Orphan) => {
    if (!window.confirm(`Supprimer définitivement le compte ${o.email} ? Il n'a pas de profil ; cette action est irréversible.`)) return;
    setBusy(o.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${o.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      setNotice(res.ok ? { ok: true, text: `Compte ${o.email} supprimé.` } : { ok: false, text: d.error || "Suppression impossible." });
    } catch {
      setNotice({ ok: false, text: "Erreur réseau. Réessayez." });
    } finally {
      setBusy(null);
      void load();
    }
  };

  const remind = async () => {
    if (!due.length) return;
    if (!window.confirm(`Envoyer l'e-mail « Complétez votre profil » à ${due.length} membre(s) ?`)) return;
    setBusy("remind");
    setNotice(null);
    let sent = 0;
    const failed: { id: string; email: string; error: string }[] = [];
    try {
      for (let guard = 0; guard < 50; guard++) {
        const res = await fetch("/api/admin/users/data-health", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remind", skip: failed.map((f) => f.id) }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setNotice({ ok: false, text: d.error || "Envoi interrompu." }); return; }
        sent += (d.sent || []).length;
        failed.push(...(d.failed || []));
        if (!d.remaining) break;
      }
      setNotice(failed.length
        ? { ok: false, text: `${sent} relance(s) envoyée(s), ${failed.length} échec(s) : ${failed.map((f) => `${f.email} (${f.error})`).join(" ; ")}` }
        : { ok: true, text: `${sent} relance(s) envoyée(s).` });
    } catch {
      setNotice({ ok: false, text: `Envoi interrompu après ${sent} relance(s). Relancez pour le reste.` });
    } finally {
      setBusy(null);
      void load();
    }
  };

  const Section = ({ id, icon: Icon, count, label, children }: {
    id: "pending" | "incomplete" | "orphans"; icon: typeof Clock; count: number; label: string; children: React.ReactNode;
  }) => count === 0 ? null : (
    <div className="border-t border-[#F3F4F6] first:border-t-0">
      <button type="button" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors">
        <Icon className="w-4 h-4 text-[#486B46] shrink-0" />
        <span className="text-[13px] font-semibold text-[#1a1a1a] flex-1">{label}</span>
        <span className="text-[12px] font-bold text-[#486B46] bg-[#486B46]/10 rounded-full px-2 py-0.5">{count}</span>
        <ChevronDown className={cn("w-4 h-4 text-[#9CA3AF] transition-transform", open === id && "rotate-180")} />
      </button>
      {open === id && <div className="px-4 pb-4">{children}</div>}
    </div>
  );

  return (
    <section aria-label="À traiter" className="mb-5 bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[14px] font-bold text-[#1a1a1a]">À traiter</h2>
        <p className="text-[12px] text-[#6B7280]">Décisions en attente, profils à compléter et comptes sans profil.</p>
      </div>

      <Section id="pending" icon={Clock} count={data.pending.length} label="Inscriptions en attente de décision">
        <ul className="divide-y divide-[#F3F4F6] text-[13px]">
          {data.pending.map((m) => (
            <li key={m.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link href={`/admin/users/${m.id}`} className="font-semibold text-[#486B46] hover:underline">{m.name || m.email}</Link>
              <span className="text-[#9CA3AF] break-all">{m.email}</span>
              <span className={cn("text-[12px]", daysSince(m.created_at) > 7 ? "text-amber-700 font-semibold" : "text-[#6B7280]")}>en attente {ago(m.created_at)}</span>
              {!m.profileComplete && <span className="text-[12px] text-[#6B7280]">· inscription non terminée</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="incomplete" icon={UserCog} count={data.incomplete.length} label="Membres approuvés au profil incomplet">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
          <p className="text-[12px] text-[#6B7280] flex-1">
            {data.reminderTracking
              ? `${due.length} peuvent être relancés (une relance par semaine au plus).`
              : "Exécutez la migration 20261002_profile_reminder.sql pour activer les relances."}
          </p>
          <button type="button" onClick={remind} disabled={!data.reminderTracking || !due.length || !!busy}
            className="h-9 px-4 rounded-xl bg-[#486B46] text-white text-[13px] font-bold hover:bg-[#3A5A38] disabled:opacity-50 flex items-center justify-center gap-2">
            {busy === "remind" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {busy === "remind" ? "Envoi…" : `Relancer (${due.length})`}
          </button>
        </div>
        <ul className="divide-y divide-[#F3F4F6] text-[13px]">
          {data.incomplete.map((m) => (
            <li key={m.id} className="py-2">
              <div className="flex flex-wrap items-center gap-x-3">
                <Link href={`/admin/users/${m.id}`} className="font-semibold text-[#486B46] hover:underline">{m.pseudo || m.name || m.email}</Link>
                <span className="text-[#9CA3AF] break-all">{m.email}</span>
                {m.reminded_at && <span className="text-[12px] text-[#6B7280]">relancé le {shortDate(m.reminded_at)}</span>}
              </div>
              <p className="text-[12px] text-[#6B7280] mt-0.5">Manque : {m.missing.join(", ")}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="orphans" icon={UserX} count={data.orphans.length} label="Comptes sans profil">
        <p className="text-[12px] text-[#6B7280] mb-2">
          Comptes de connexion sans fiche : inscription interrompue, ou profil supprimé hors de l&apos;admin. Ils n&apos;apparaissent pas dans la liste.
          Un compte Google sera invité à refaire son inscription à sa prochaine connexion ; un compte e-mail restera bloqué sur la page d&apos;attente : supprimez-le ou recontactez la personne.
        </p>
        <ul className="divide-y divide-[#F3F4F6] text-[13px]">
          {data.orphans.map((o) => (
            <li key={o.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-[#1a1a1a] break-all">{o.email}</span>
              <span className="text-[12px] text-[#6B7280]">
                {o.provider === "google" ? "Google" : "e-mail"} · créé le {shortDate(o.created_at)}
                {o.last_sign_in_at ? ` · dernière connexion le ${shortDate(o.last_sign_in_at)}` : ""}
              </span>
              <button type="button" onClick={() => deleteOrphan(o)} disabled={!!busy}
                className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-red-600/80 hover:text-red-700 disabled:opacity-50">
                {busy === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {notice && (
        <p role="status" className={cn("mx-4 mb-4 rounded-xl px-3.5 py-2.5 text-[13px] font-medium",
          notice.ok ? "bg-[#486B46]/10 text-[#2E4A36]" : "bg-[#B42318]/10 text-[#B42318]")}>
          {notice.text}
        </p>
      )}
    </section>
  );
}
