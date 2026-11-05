"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, KeyRound, Pencil, RefreshCw, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";

type Coach = { user_id: string; email: string; display_name: string; active: boolean; created_at: string; last_login_at?: string | null };
type Pending = { kind: "delete" | "reset"; coach: Coach } | null;

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

async function call(method: string, body?: unknown) {
  const res = await fetch("/api/admin/coaches", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Opération refusée");
  return data;
}

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  // Mot de passe temporaire : affiché une seule fois, jamais conservé après fermeture.
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coaches", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoaches(data.coaches || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id); setError(""); setNotice("");
    try { await fn(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusyId(null); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await call("POST", { name, email, password });
      setName(""); setEmail(""); setPassword("");
      setNotice("Compte Coach créé. Il peut se connecter avec son adresse e-mail et son mot de passe.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur de création"); }
    finally { setSaving(false); }
  };

  const toggle = (c: Coach) => run(c.user_id, async () => {
    await call("PATCH", { id: c.user_id, active: !c.active });
    setNotice(c.active ? "Coach suspendu : sa connexion est refusée." : "Coach réactivé.");
  });

  const rename = () => {
    if (!editing) return;
    const { id, name: next } = editing;
    return run(id, async () => {
      await call("PATCH", { id, name: next });
      setEditing(null);
      setNotice("Nom mis à jour.");
    });
  };

  const confirm = () => {
    if (!pending) return;
    const { kind, coach } = pending;
    setPending(null);
    return run(coach.user_id, async () => {
      if (kind === "delete") {
        await call("DELETE", { id: coach.user_id });
        setNotice("Compte Coach supprimé définitivement.");
      } else {
        const data = await call("POST", { action: "reset_password", id: coach.user_id });
        setTemp({ email: coach.email, password: data.password });
        setCopied(false);
      }
    });
  };

  const copy = async () => {
    if (!temp) return;
    try { await navigator.clipboard.writeText(temp.password); setCopied(true); } catch { setError("Copie impossible : recopiez le mot de passe manuellement."); }
  };

  return (
    <main className="space-y-6">
      <Link href="/admin/users" className="inline-flex gap-2 items-center text-sm text-primary font-semibold"><ArrowLeft className="h-4 w-4" />Retour aux utilisateurs</Link>
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary" />Coachs de la plateforme</h1>
        <p className="text-sm text-[#56615A]">Comptes professionnels distincts des profils membres, sans questionnaire matrimonial. Un coach n&apos;a accès ni aux alliances, ni aux messages privés, ni aux profils des membres.</p>
      </header>

      {temp && (
        <div role="status" className="rounded-2xl border border-[#C6D4C0] bg-[#EEF5EC] p-4 space-y-2">
          <p className="text-sm font-semibold">Mot de passe temporaire pour {temp.email}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white border px-3 py-2 text-base tracking-wide break-all select-all">{temp.password}</code>
            <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copié" : "Copier"}
            </button>
            <button type="button" onClick={() => setTemp(null)} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm"><X className="h-4 w-4" />Fermer</button>
          </div>
          <p className="text-xs text-[#56615A]">Il n&apos;est affiché qu&apos;une seule fois et n&apos;est enregistré nulle part. Transmettez-le par un canal sécurisé.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-5">
        <form onSubmit={create} className="bg-white border rounded-2xl p-5 space-y-4 self-start">
          <h2 className="font-semibold flex gap-2 items-center"><UserPlus className="h-5 w-5 text-primary" />Ajouter un coach</h2>
          <label className="block text-sm font-medium">Nom du coach (facultatif)<input value={name} onChange={e => setName(e.target.value)} maxLength={100} className="mt-1 block w-full border rounded-lg px-3 py-2" /></label>
          <label className="block text-sm font-medium">Adresse e-mail<input required type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2" /></label>
          <label className="block text-sm font-medium">Mot de passe initial<input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2" /><span className="text-xs text-[#56615A]">12 caractères minimum, lettres et chiffres. Transmettez-le par un canal sécurisé.</span></label>
          <button disabled={saving} className="rounded-xl bg-[#486B46] text-white px-4 py-2 w-full disabled:opacity-50">{saving ? "Création…" : "Créer le compte Coach"}</button>
        </form>

        <section className="bg-white border rounded-2xl p-5 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Comptes Coach ({coaches.length})</h2>
            <button onClick={() => void load()} aria-label="Actualiser" className="border rounded-lg p-2"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {loading ? <p>Chargement…</p> : coaches.length === 0 ? <p className="text-sm text-[#56615A]">Aucun coach enregistré.</p> : (
            <ul className="divide-y">
              {coaches.map(c => {
                const busy = busyId === c.user_id;
                const isEditing = editing?.id === c.user_id;
                return (
                  <li key={c.user_id} className="py-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        {isEditing ? (
                          <form onSubmit={e => { e.preventDefault(); void rename(); }} className="flex items-center gap-2">
                            <input autoFocus value={editing.name} maxLength={100} onChange={e => setEditing({ id: c.user_id, name: e.target.value })} aria-label="Nom du coach" className="border rounded-lg px-3 py-1.5 text-sm" />
                            <button disabled={busy || !editing.name.trim()} aria-label="Enregistrer le nom" className="border rounded-lg p-2 disabled:opacity-50"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={() => setEditing(null)} aria-label="Annuler" className="border rounded-lg p-2"><X className="w-4 h-4" /></button>
                          </form>
                        ) : <p className="font-semibold">{c.display_name}</p>}
                        <p className="text-xs text-[#56615A] break-all">{c.email}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.active ? "bg-[#EEF5EC] text-[#486B46]" : "bg-[#F4ECEA] text-[#8A3B2E]"}`}>{c.active ? "Actif" : "Suspendu"}</span>
                    </div>
                    <p className="text-xs text-[#56615A]">Créé le {fmt(c.created_at)} · Dernière connexion : {fmt(c.last_login_at)}</p>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy} onClick={() => setEditing({ id: c.user_id, name: c.display_name })} className="inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"><Pencil className="w-3.5 h-3.5" />Modifier le nom</button>
                      <button disabled={busy} onClick={() => setPending({ kind: "reset", coach: c })} className="inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"><KeyRound className="w-3.5 h-3.5" />Réinitialiser le mot de passe</button>
                      <button disabled={busy} onClick={() => void toggle(c)} className="border px-3 py-1.5 rounded-lg text-sm disabled:opacity-50">{busy ? "…" : c.active ? "Suspendre" : "Réactiver"}</button>
                      <button disabled={busy} onClick={() => setPending({ kind: "delete", coach: c })} className="inline-flex items-center gap-1.5 border border-[#E3C5BF] text-[#8A3B2E] px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" />Supprimer</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="coach-confirm-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4">
            <h2 id="coach-confirm-title" className="text-lg font-semibold">{pending.kind === "delete" ? "Supprimer définitivement ce coach ?" : "Réinitialiser son mot de passe ?"}</h2>
            <p className="text-sm text-[#56615A]">
              {pending.kind === "delete"
                ? `Le compte de ${pending.coach.display_name} (${pending.coach.email}) sera supprimé définitivement. Cette action est irréversible.`
                : `Un nouveau mot de passe temporaire sera généré pour ${pending.coach.email}. L'ancien cessera de fonctionner.`}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPending(null)} className="border rounded-lg px-4 py-2 text-sm">Annuler</button>
              <button onClick={() => void confirm()} className={`rounded-lg px-4 py-2 text-sm text-white ${pending.kind === "delete" ? "bg-[#8A3B2E]" : "bg-[#486B46]"}`}>{pending.kind === "delete" ? "Supprimer" : "Réinitialiser"}</button>
            </div>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    </main>
  );
}
