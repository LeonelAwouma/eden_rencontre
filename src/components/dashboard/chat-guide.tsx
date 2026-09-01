"use client";

import { useState } from "react";
import { BookOpen, ShieldAlert, Calendar, ChevronDown, ChevronUp, X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Session {
  number: number;
  title: string;
  objective: string;
  questions: string[];
  example?: string;
}

const COLORS = {
  green: "#486B46",
  gold: "#C6A15B",
  lightGreen: "#EEF5EC",
  lightGold: "#F5EDE8",
  border: "#E8E5E0",
  borderGreen: "#C6D4C0",
  text: "#2F2F2F",
  textMuted: "#777777",
  bg: "#FAF9F6",
};

const SESSION_COLORS = [
  { bg: COLORS.lightGreen, border: COLORS.borderGreen, accent: COLORS.green },
  { bg: COLORS.lightGreen, border: COLORS.borderGreen, accent: COLORS.green },
  { bg: COLORS.lightGreen, border: COLORS.borderGreen, accent: COLORS.green },
  { bg: COLORS.lightGold, border: COLORS.gold, accent: COLORS.gold },
  { bg: COLORS.lightGold, border: COLORS.gold, accent: COLORS.gold },
];

export function ChatGuide({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const toggle = (n: number) => setExpanded(expanded === n ? null : n);

  const SESSIONS: Session[] = [
    {
      number: 1,
      title: t("chatGuide.session1Title"),
      objective: t("chatGuide.session1Objective"),
      questions: [t("chatGuide.session1Q1"), t("chatGuide.session1Q2"), t("chatGuide.session1Q3")],
    },
    {
      number: 2,
      title: t("chatGuide.session2Title"),
      objective: t("chatGuide.session2Objective"),
      questions: [t("chatGuide.session2Q1"), t("chatGuide.session2Q2"), t("chatGuide.session2Q3")],
    },
    {
      number: 3,
      title: t("chatGuide.session3Title"),
      objective: t("chatGuide.session3Objective"),
      questions: [t("chatGuide.session3Q1"), t("chatGuide.session3Q2"), t("chatGuide.session3Q3")],
      example: t("chatGuide.session3Example"),
    },
    {
      number: 4,
      title: t("chatGuide.session4Title"),
      objective: t("chatGuide.session4Objective"),
      questions: [t("chatGuide.session4Q1"), t("chatGuide.session4Q2"), t("chatGuide.session4Q3")],
      example: t("chatGuide.session4Example"),
    },
    {
      number: 5,
      title: t("chatGuide.session5Title"),
      objective: t("chatGuide.session5Objective"),
      questions: [t("chatGuide.session5Q1"), t("chatGuide.session5Q2"), t("chatGuide.session5Q3")],
      example: t("chatGuide.session5Example"),
    },
  ];

  return (
    <div className="relative h-full overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: COLORS.lightGreen, border: `1px solid ${COLORS.borderGreen}` }}>
            <BookOpen className="w-7 h-7" style={{ color: COLORS.green }} />
          </div>
          <h2 className="font-headline text-xl sm:text-2xl font-bold" style={{ color: COLORS.text }}>
            {t("chatGuide.headerTitle")}
          </h2>
          <p className="italic text-sm max-w-md mx-auto leading-relaxed" style={{ color: COLORS.textMuted }}>
            {t("chatGuide.headerVerse")}
            <span className="block mt-1 not-italic font-semibold text-xs" style={{ color: COLORS.green }}>{t("chatGuide.headerVerseRef")}</span>
          </p>
        </div>

        {/* Charter reminder */}
        <div className="rounded-xl p-4" style={{ background: COLORS.lightGold, border: `1px solid ${COLORS.gold}30` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.gold }}>
            <Heart className="w-3 h-3 inline mr-1" /> {t("chatGuide.charterLabel")}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: COLORS.text }}>
            {t("chatGuide.charterText")}
            <strong> {t("chatGuide.charterTextBold")}</strong>
          </p>
        </div>

        {/* Security rules */}
        <div className="rounded-xl p-4" style={{ background: "#FEF2F2", border: "1px solid #EF444430" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "#EF4444" }}>
            <ShieldAlert className="w-3.5 h-3.5" /> {t("chatGuide.safetyLabel")}
          </p>
          <ul className="space-y-2 text-xs leading-relaxed" style={{ color: COLORS.text }}>
            <li className="flex gap-2">
              <span style={{ color: "#EF4444" }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: t("chatGuide.safetyItem1") }} />
            </li>
            <li className="flex gap-2">
              <span style={{ color: "#EF4444" }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: t("chatGuide.safetyItem2") }} />
            </li>
          </ul>
          {!acceptedRules && (
            <button onClick={() => setAcceptedRules(true)}
              className="mt-3 w-full h-9 rounded-lg text-xs font-bold transition-colors"
              style={{ background: "#EF4444", color: "#FFFFFF" }}>
              {t("chatGuide.acceptRules")}
            </button>
          )}
          {acceptedRules && (
            <p className="mt-2 text-[11px] font-bold flex items-center gap-1.5" style={{ color: COLORS.green }}>
              {t("chatGuide.rulesAccepted")}
            </p>
          )}
        </div>

        {/* Rewards */}
        <div className="rounded-xl p-4" style={{ background: COLORS.lightGreen, border: `1px solid ${COLORS.borderGreen}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.green }}>
            <Calendar className="w-3 h-3 inline mr-1" /> {t("chatGuide.rewardsLabel")}
          </p>
          <div className="space-y-2 text-xs" style={{ color: COLORS.text }}>
            <div className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: COLORS.green, color: "#FFFFFF" }}>1</span>
              <span dangerouslySetInnerHTML={{ __html: t("chatGuide.reward1") }} />
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: COLORS.green, color: "#FFFFFF" }}>2</span>
              <span dangerouslySetInnerHTML={{ __html: t("chatGuide.reward2") }} />
            </div>
          </div>
        </div>

        {/* 5 Sessions */}
        <div className="space-y-3">
          <h3 className="font-headline text-base font-bold text-center" style={{ color: COLORS.text }}>
            {t("chatGuide.sessionsTitle")}
          </h3>
          {SESSIONS.map((session) => {
            const isOpen = expanded === session.number;
            const colors = SESSION_COLORS[session.number - 1];
            return (
              <div key={session.number} className="rounded-xl overflow-hidden transition-all"
                style={{ background: "#FFFFFF", border: `1px solid ${isOpen ? COLORS.green : COLORS.border}`, boxShadow: isOpen ? "0 4px 16px rgba(72,107,70,0.1)" : "none" }}>
                <button onClick={() => toggle(session.number)}
                  className="w-full flex items-center gap-3 p-4 text-left">
                  <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
                    style={{ background: colors.bg, color: colors.accent, border: `1px solid ${colors.border}` }}>
                    {session.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: COLORS.text }}>{session.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: COLORS.textMuted }}>{session.objective}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: COLORS.textMuted }} />
                    : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: COLORS.textMuted }} />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <div className="pt-3 space-y-2">
                      {session.questions.map((q, i) => (
                        <div key={i} className="flex gap-2.5">
                          <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                            style={{ background: colors.bg, color: colors.accent }}>
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{q}</p>
                        </div>
                      ))}
                    </div>
                    {session.example && (
                      <div className="rounded-lg p-3" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: COLORS.green }}>
                          {t("chatGuide.exampleExchange")}
                        </p>
                        <p className="text-xs italic leading-relaxed" style={{ color: COLORS.text }}>
                          {session.example}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dismiss button */}
        <div className="text-center pt-2 pb-6">
          <button onClick={onDismiss}
            className="h-10 px-6 rounded-xl text-sm font-bold transition-colors"
            style={{ background: COLORS.green, color: "#FFFFFF" }}>
            {t("chatGuide.gotIt")}
          </button>
          <p className="text-[10px] mt-2" style={{ color: COLORS.textMuted }}>
            {t("chatGuide.findGuideAnytime")}
          </p>
        </div>
      </div>
    </div>
  );
}
