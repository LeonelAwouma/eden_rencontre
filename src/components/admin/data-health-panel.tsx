"use client";

/**
 * « À traiter » (Admin → Utilisateurs) : ce qui demande une décision ou une
 * relance — comptes à réparer (anomalies techniques), inscriptions en attente,
 * membres approuvés au profil incomplet, comptes de connexion sans profil.
 * « Lancer le contrôle complet » refait le contrôle quotidien (e-mails compris).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Trash2, Mail, Clock, UserX, UserCog, ShieldAlert, Wrench, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Orphan { id: string; email: string; provider: string; created_at: string; last_sign_in_at: string | null }
interface Incomplete { id: string; email: string; name: string | null; pseudo: string | null; missing: string[]; reminded_at: string | null }
interface Pending { id: string; email: string; name: string | null; created_at: string; profileComplete: boolean }
interface Anomaly { id: string; email: string; problems: string[]; repairable: boolean }
interface Health { orphans: Orphan[]; incomplete: Incomplete[]; pending: Pending[]; reminderTracking: boolean; anomalies?: Anomaly[] }
interface ScanResult { checked_at: string; anomalies: Anomaly[]; orphans: number; pendingOld: number; smtp: { ok: boolean; error: string | null } }
type SectionId = "anomalies" | "pending" | "incomplete" | "orphans";

const REMIND_COOLDOWN_MS = 7 * 24 * 3600 * 1000;

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const ago = (iso: string) => { const d = daysSince(iso); return d === 0 ? "aujourd'hui" : d === 1 ? "depuis hier" : `depuis ${d} jours`; };
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function DataHealthPanel() {
  const [data, setData] = useState<Health | null>(null);
  const [open, setOpen] = useState<SectionId | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
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
  const anomalies = data.anomalies || [];
  const total = anomalies.length + data.pending.length + data.incomplete.length + data.orphans.length;

  const runScan = async () => {
    setBusy("scan");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users/data-health", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "scan" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice({ ok: false, text: d.error || "Contrôle impossible." }); return; }
      setScan(d);
      if (d.anomalies?.length) setOpen("anomalies");
    } catch {
      setNotice({ ok: false, text: "Erreur réseau. Réessayez." });
    } finally {
      setBusy(null);
      void load();
    }
  };

  const repair = async (a: Anomaly) => {
    setBusy(a.id);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users/data-health", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "repair", id: a.id }),
      });
      const d = await res.json().catch(() => ({}));
      setNotice(res.ok
        ? { ok: true, text: `${a.email} réparé : ${(d.actions || []).join(", ") || "rien à changer"}. Le membre doit se reconnecter.` }
        : { ok: false, text: d.error || "Réparation impossible." });
    } catch {
      setNotice({ ok: false, text: "Erreur réseau. Réessayez." });
    } finally {
      setBusy(null);
      setScan(null);
      void load();
    }
  };

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
    id: SectionId; icon: typeof Clock; count: number; label: string; children: React.ReactNode;
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
      <div className="px-4 pt-4 pb-2 flex flex-col sm:flex-row sm:items-start gap-2">
        <div className="flex-1">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">À traiter</h2>
          <p className="text-[12px] text-[#6B7280]">
            {total === 0 ? "Tout est en ordre : aucun compte à réparer, aucune décision en attente." : "Comptes à réparer, décisions en attente, profils à compléter et comptes sans profil."}
          </p>
        </div>
        <button type="button" onClick={runScan} disabled={!!busy}
          className="self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-semibold text-[#486B46] hover:bg-[#F9FAFB] disabled:opacity-50">
          {busy === "scan" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          {busy === "scan" ? "Contrôle…" : "Lancer le contrôle complet"}
        </button>
      </div>

      {scan && (
        <div role="status" className={cn("mx-4 mb-3 rounded-xl px-3.5 py-2.5 text-[12px] font-medium",
          scan.smtp.ok && !scan.anomalies.length ? "bg-[#486B46]/10 text-[#2E4A36]" : "bg-amber-50 text-amber-800 border border-amber-200")}>
          Contrôle du {new Date(scan.checked_at).toLocaleString("fr-FR")} :{" "}
          {scan.smtp.ok ? "e-mails opérationnels" : `e-mails EN PANNE — ${scan.smtp.error}`} ·{" "}
          {scan.anomalies.length ? `${scan.anomalies.length} compte(s) à réparer` : "aucun compte à réparer"}
          {scan.pendingOld ? ` · ${scan.pendingOld} inscription(s) en attente depuis plus de 7 jours` : ""}
        </div>
      )}

      <Section id="anomalies" icon={ShieldAlert} count={anomalies.length} label="Comptes à réparer (le membre risque de ne plus pouvoir entrer)">
        <p className="text-[12px] text-[#6B7280] mb-2">
          Réparés aussi automatiquement chaque matin par le contrôle quotidien. Après réparation, le membre doit se reconnecter.
        </p>
        <ul className="divide-y divide-[#F3F4F6] text-[13px]">
          {anomalies.map((a) => (
            <li key={a.id} className="py-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <Link href={`/admin/users/${a.id}`} className="font-semibold text-[#486B46] hover:underline break-all">{a.email || a.id}</Link>
                <p className="text-[12px] text-[#6B7280] mt-0.5">{a.problems.join(" ; ")}</p>
              </div>
              {a.repairable && (
                <button type="button" onClick={() => repair(a)} disabled={!!busy}
                  className="self-start sm:self-center inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#486B46] text-white text-[12px] font-bold hover:bg-[#3A5A38] disabled:opacity-50">
                  {busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                  Réparer
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>

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
