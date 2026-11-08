"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, EyeOff, Search } from "lucide-react";
import { Badge, Card, DetailItem, MemberAvatar, SectionTitle } from "@/components/admin/admin-ui";
import { CoachFormationPanel } from "@/components/coach/coach-formation-panel";
import { MemberFollowUp } from "@/components/coach/member-followup";
import { DataState, EmptyBlock, FormationStateBadge, fmtDate } from "@/components/coach/coach-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import type { CoachFormationSummary, FormationState } from "@/lib/coach/members-view";
import { useI18n } from "@/lib/i18n";

interface MemberDetail {
  member: { id: string; pseudo: string | null; avatarUrl: string | null; country: string | null; city: string | null };
  assignment: { status: string; consentStatus: string; assignedAt: string; consentAt: string | null };
  formation: { state: FormationState; summary: CoachFormationSummary | null };
  unavailable: string[];
}

/** Fiche d'un membre accompagné : uniquement les données autorisées, et ce qui n'est pas disponible est dit. */
export default function CoachMemberPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  // La langue ne change que les titres de leçons (côté serveur) ; changer de langue recharge la fiche.
  const { state, reload } = useCoachData<MemberDetail>(`/api/coach/members/${encodeURIComponent(id)}?lang=${locale === "en" ? "en" : "fr"}`);

  const back = (
    <Link href="/coach/members" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#28543C] hover:underline">
      <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("coachMembers.back")}
    </Link>
  );

  return (
    <>
      {back}
      <DataState state={state} reload={reload}
        notFound={<EmptyBlock icon={Search} title={t("coachMembers.notFoundTitle")} description={t("coachMembers.notFoundDesc")} />}>
        {(d) => (
          <div className="space-y-6">
            <header className="flex items-center gap-4">
              <MemberAvatar name={d.member.pseudo ?? ""} url={d.member.avatarUrl ?? undefined} size={64} />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1C241F] truncate font-headline">{d.member.pseudo ?? t("coachMembers.noPseudo")}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone="green">{t("coachMembers.followActive")}</Badge>
                  <FormationStateBadge state={d.formation.state} />
                </div>
              </div>
            </header>

            <Card as="section" className="p-5">
              <SectionTitle title={t("coachMembers.infoTitle")} />
              <dl className="grid sm:grid-cols-2 gap-4">
                <DetailItem label={t("coachMembers.location")}>{[d.member.city, d.member.country].filter(Boolean).join(", ") || "—"}</DetailItem>
                <DetailItem label={t("coachMembers.followStatus")}>{t("coachMembers.followActive")}</DetailItem>
                <DetailItem label={t("coachMembers.assignedAt")}>{fmtDate(d.assignment.assignedAt, locale)}</DetailItem>
                <DetailItem label={t("coachMembers.consentAt")}>{fmtDate(d.assignment.consentAt, locale)}</DetailItem>
              </dl>
            </Card>

            <Card as="section" className="p-5">
              <SectionTitle title={t("coachMembers.formationTitle")} />
              {d.formation.summary
                ? <CoachFormationPanel summary={d.formation.summary} />
                : <p className="text-sm text-[#8A6A1F]">{t("coachMembers.formationUnavailable")}</p>}
            </Card>

            <Card as="section" className="p-5">
              <SectionTitle title={t("coachMembers.unavailableTitle")} subtitle={t("coachMembers.unavailableNote")} />
              <ul className="space-y-2">
                {d.unavailable.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-[#56615A]">
                    <EyeOff className="w-4 h-4 shrink-0 text-[#8A948D]" aria-hidden="true" />
                    <span><span className="font-medium text-[#1C241F]">{t(`coachMembers.unavailableItems.${key}`)}</span> — {t("coachMembers.notAvailable")}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Lot 3 : séances, notes privées, compte rendu partagé et actions de CE membre. */}
            <MemberFollowUp memberId={d.member.id} pseudo={d.member.pseudo} />
          </div>
        )}
      </DataState>
    </>
  );
}
