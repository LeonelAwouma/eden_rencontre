"use client";

import { LogOut } from "lucide-react";
import { Card, DetailItem, SectionTitle } from "@/components/admin/admin-ui";
import { DataState, PageTitle } from "@/components/coach/coach-ui";
import { useCoachChrome } from "@/components/coach/coach-chrome";
import { CoachAvatarEditor } from "@/components/coach/coach-avatar-editor";
import { useCoachData } from "@/components/coach/use-coach-data";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";

interface CoachProfile { name: string; email: string | null; lastLoginAt: string | null }

/** Profil du coach connecté : uniquement ses propres informations. */
export default function CoachProfilePage() {
  const { t, locale } = useI18n();
  const { logout } = useCoachChrome();
  const { state, reload } = useCoachData<CoachProfile>("/api/coach/profile");

  return (
    <>
      <PageTitle title={t("coachProfile.title")} subtitle={t("coachProfile.subtitle")} />
      <DataState state={state} reload={reload}>
        {(p) => (
          <div className="space-y-6 max-w-2xl">
            <Card as="section" className="p-5">
              <SectionTitle title={t("coachProfile.accountTitle")} />
              <div className="mb-5"><CoachAvatarEditor /></div>
              <dl className="grid sm:grid-cols-2 gap-4">
                <DetailItem label={t("coachProfile.name")}>{p.name}</DetailItem>
                <DetailItem label={t("coachProfile.email")}><span className="break-all">{p.email || "—"}</span></DetailItem>
                <DetailItem label={t("coachProfile.lastLogin")}>
                  {p.lastLoginAt
                    ? new Date(p.lastLoginAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
                    : t("coachProfile.lastLoginUnknown")}
                </DetailItem>
              </dl>
            </Card>

            <Card as="section" className="p-5">
              <SectionTitle title={t("coachProfile.languageTitle")} />
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <span className="text-sm text-[#56615A]">{t("coachProfile.languageHint")}</span>
              </div>
            </Card>

            <p className="text-sm text-[#56615A]">{t("coachProfile.privacyNote")}</p>

            <button type="button" onClick={() => void logout()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E3C5BF] bg-white px-4 py-2.5 text-sm font-semibold text-[#8A3B2E] hover:bg-[#FBF3F1]">
              <LogOut className="w-4 h-4" aria-hidden="true" /> {t("coachNav.logout")}
            </button>
          </div>
        )}
      </DataState>
    </>
  );
}
