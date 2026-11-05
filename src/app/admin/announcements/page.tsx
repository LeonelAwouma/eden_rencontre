"use client";

import { useEffect, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

type Status = "inactive" | "scheduled" | "expired" | "unavailable" | "live";

interface Row {
  id: string;
  surface: "public" | "member" | "admin";
  title: string;
  active: boolean;
  availability: string;
  href: string;
  navHref: string | null;
  activatesAt: string;
  expiresAt: string;
  status: Status;
  views: number;
  clicks: number;
  dismissals: number;
}

const STATUS: Record<Status, { label: string; hint: string; tone: string }> = {
  live: { label: "En ligne", hint: "Affichée aux personnes concernées", tone: "bg-[#EEF5EE] text-[#28543C] border-[#C6D4C0]" },
  inactive: { label: "Inactive", hint: "active: false dans le registre", tone: "bg-[#F4F2EE] text-[#56615A] border-[#E6E2DA]" },
  scheduled: { label: "Programmée", hint: "Date d'activation pas encore atteinte", tone: "bg-[#FBF5E8] text-[#8A6B2F] border-[#EBDDB8]" },
  expired: { label: "Expirée", hint: "Date de fin dépassée", tone: "bg-[#F4F2EE] text-[#56615A] border-[#E6E2DA]" },
  unavailable: { label: "Indisponible", hint: "La fonctionnalité n'est pas activée", tone: "bg-[#FDF1EF] text-[#B42318] border-[#F3D5D2]" },
};

const SURFACE = { public: "Visiteurs", member: "Membres", admin: "Administrateurs" } as const;

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcements", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRows(d.announcements))
      .catch(() => setError(true));
  }, []);

  return (
    <div>
      <PageHeader
        title="Annonces"
        subtitle="Nouveautés présentées aux visiteurs, aux membres et aux administrateurs."
      />

      <p className="mb-5 max-w-3xl rounded-xl border border-[#E8E5E0] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#56615A]">
        Les chiffres ci-dessous sont des <strong>événements agrégés</strong> (affichages, clics, fermetures), sans
        aucun identifiant de personne. Ils ne représentent <strong>pas des utilisateurs uniques</strong> : une même
        personne peut être comptée plusieurs fois, sur plusieurs sessions ou appareils. Le registre se modifie dans le
        code (<code>src/lib/whats-new.ts</code>) ; une annonce n&apos;est activée qu&apos;après le déploiement réel de sa fonctionnalité.
      </p>

      {error && <p className="text-sm text-[#B42318]">Impossible de charger les annonces.</p>}
      {!rows && !error && (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#486B46]" /></div>
      )}

      {rows && rows.length === 0 && (
        <div className="rounded-2xl border border-[#E8E5E0] bg-white p-10 text-center">
          <Megaphone className="w-8 h-8 mx-auto text-[#C6D4C0]" aria-hidden="true" />
          <p className="mt-3 text-sm text-[#56615A]">Aucune annonce enregistrée.</p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5E0] bg-white">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="border-b border-[#E8E5E0] text-[11px] uppercase tracking-wider text-[#6B746E]">
              <tr>
                <th className="px-4 py-3 font-semibold">Annonce</th>
                <th className="px-4 py-3 font-semibold">Audience</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Période</th>
                <th className="px-4 py-3 text-right font-semibold">Affichages</th>
                <th className="px-4 py-3 text-right font-semibold">Clics</th>
                <th className="px-4 py-3 text-right font-semibold">Fermetures</th>
                <th className="px-4 py-3 text-right font-semibold">Taux de clic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EEE9]">
              {rows.map((r) => {
                const s = STATUS[r.status];
                const rate = r.views > 0 ? `${Math.round((r.clicks / r.views) * 100)} %` : "—";
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#1C241F]">{r.title}</p>
                      <p className="text-[12px] text-[#6B746E]">
                        <code>{r.id}</code>
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#4A564F]">{SURFACE[r.surface]}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", s.tone)} title={s.hint}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4A564F]">{fmt(r.activatesAt)} → {fmt(r.expiresAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.views}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.clicks}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.dismissals}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{rate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
