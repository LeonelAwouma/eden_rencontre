"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { formatDateTime } from "@/components/admin/forum/forum-admin-shared";

type Status = "pending" | "approved" | "rejected" | "used" | "expired";

interface ResetRequest {
  id: string;
  user_id: string;
  phone: string | null;
  status: Status;
  note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  name: string | null;
  pseudo: string | null;
}

const FILTERS: { value: "pending" | "all"; label: string }[] = [
  { value: "pending", label: "À traiter" },
  { value: "all", label: "Toutes" },
];

const STATUS_LABEL: Record<Status, { label: string; tone: string }> = {
  pending: { label: "À vérifier", tone: "bg-amber-100 text-amber-800" },
  approved: { label: "Lien émis", tone: "bg-primary/15 text-primary" },
  rejected: { label: "Refusée", tone: "bg-muted text-muted-foreground" },
  used: { label: "Mot de passe changé", tone: "bg-primary/15 text-primary" },
  expired: { label: "Lien expiré", tone: "bg-muted text-muted-foreground" },
};

export default function AdminPasswordResetsPage() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  // Lien émis, montré une seule fois (seul son haché est conservé côté serveur).
  const [issued, setIssued] = useState<{ id: string; link: string; phone: string | null } | null>(null);

  const flash = (text: string) => { setNotice(text); setTimeout(() => setNotice(null), 3500); };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/password-resets");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Impossible de charger les demandes."); return; }
      setError(data.migrationMissing ? "La migration 20261111_phone_signup.sql n'a pas encore été exécutée." : null);
      setRequests(data.requests ?? []);
    } catch { setError("Impossible de charger les demandes."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(id);
  }, [load]);

  const approve = async (r: ResetRequest) => {
    setBusy(r.id);
    const res = await fetch(`/api/admin/password-resets/${r.id}/approve`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { flash(data.error || "Action impossible. Réessayez."); return; }
    setIssued({ id: r.id, link: data.link, phone: r.phone });
    load();
  };

  const reject = async (r: ResetRequest) => {
    setBusy(r.id);
    const res = await fetch(`/api/admin/password-resets/${r.id}/reject`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    setBusy(null);
    if (!res.ok) { flash("Action impossible. Réessayez."); return; }
    if (issued?.id === r.id) setIssued(null);
    flash("Demande refusée. Le compte reste inchangé.");
    load();
  };

  const copy = async (link: string) => {
    try { await navigator.clipboard.writeText(link); flash("Lien copié."); }
    catch { flash("Copie impossible : sélectionnez le lien à la main."); }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const visible = filter === "pending" ? requests.filter((r) => r.status === "pending") : requests;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes de réinitialisation"
        subtitle="Membres inscrits par téléphone qui ont oublié leur mot de passe. Vérifiez leur identité, puis envoyez-leur le lien : vous ne voyez jamais leur nouveau mot de passe."
      />

      {error && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">{notice}</p>}

      {issued && (
        <section aria-label="Lien de réinitialisation" className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Lien à transmettre au membre{issued.phone ? ` (${issued.phone})` : ""}</p>
          <p className="text-xs text-muted-foreground">
            Valable une heure, utilisable une seule fois. Il ne sera plus affiché une fois cette fenêtre fermée : en cas de perte, générez-en un nouveau.
          </p>
          <input
            readOnly
            value={issued.link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Lien de réinitialisation"
            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-xs text-foreground"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(issued.link)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-[#3A5A38]">
              <Copy className="h-4 w-4" /> Copier le lien
            </button>
            <a
              href={`https://wa.me/${(issued.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`Voici votre lien pour choisir un nouveau mot de passe (valable 1 heure, usage unique) : ${issued.link}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
            </a>
            <button type="button" onClick={() => setIssued(null)} className="inline-flex h-10 items-center rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground">
              Fermer
            </button>
          </div>
        </section>
      )}

      {loading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {!loading && (
        <section aria-label="Demandes" className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "h-10 shrink-0 rounded-xl border px-4 text-sm transition-colors",
                  filter === f.value ? "border-primary/40 bg-primary/10 font-semibold text-primary" : "border-input bg-card text-foreground hover:bg-muted",
                )}
              >
                {f.label}{f.value === "pending" && pendingCount ? ` (${pendingCount})` : ""}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card">
              <EmptyState
                icon={KeyRound}
                title={filter === "pending" ? "Aucune demande à traiter" : "Aucune demande pour le moment"}
                description="Quand un membre inscrit par téléphone aura oublié son mot de passe, sa demande apparaîtra ici."
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((r) => {
                const st = STATUS_LABEL[r.status];
                const actionable = r.status === "pending" || r.status === "approved" || r.status === "expired";
                return (
                  <li key={r.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {r.pseudo || r.name || "Membre"}
                          {r.name && r.pseudo && <span className="font-normal text-muted-foreground"> · {r.name}</span>}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{r.phone ?? "Numéro inconnu"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", st.tone)}>{st.label}</span>
                        <time dateTime={r.created_at} className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</time>
                      </div>
                    </div>

                    {r.decided_by && r.status !== "pending" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Traitée par {r.decided_by}{r.decided_at ? ` · ${formatDateTime(r.decided_at)}` : ""}
                      </p>
                    )}

                    {actionable && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => approve(r)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-[#3A5A38] disabled:opacity-60"
                        >
                          {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          {r.status === "pending" ? "Identité vérifiée : générer le lien" : "Générer un nouveau lien"}
                        </button>
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => reject(r)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                        >
                          <X className="h-4 w-4" /> Refuser
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
