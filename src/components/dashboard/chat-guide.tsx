"use client";

import { useState } from "react";
import { BookOpen, ShieldAlert, Calendar, ChevronDown, ChevronUp, X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  number: number;
  title: string;
  objective: string;
  questions: string[];
  example?: string;
}

const SESSIONS: Session[] = [
  {
    number: 1,
    title: "Interests, Passions & Hobbies",
    objective: "Break the ice naturally and discover what drives your day.",
    questions: [
      "How do you spend your free time after work or church commitments?",
      "What hobbies or interests help you recharge?",
      "Is there a passion or creative activity you'd like to develop in the future?",
    ],
  },
  {
    number: 2,
    title: "Childhood, Roots & Family Values",
    objective: "Understand your cultural, familial background and the origin of your values.",
    questions: [
      "What city or region did you grow up in and what is your fondest childhood memory?",
      "What is the key value your parents or guardians passed on to you that guides you today?",
      "How do you define the place of family and brotherhood in your life?",
    ],
  },
  {
    number: 3,
    title: "Spiritual Walk & Service in the Church",
    objective: "Share about your calling, commitments and daily faith life.",
    questions: [
      "What department or ministry are you involved in at your local assembly?",
      "How does your ministerial or spiritual calling align with your professional life?",
      "What Bible passage or faith principle sustains your walk right now?",
    ],
    example: "\"I serve in the welcome department at church, which teaches me patience. What area do you feel God is calling you to actively serve in?\"",
  },
  {
    number: 4,
    title: "Friendship, Relationships & Interacting with Others",
    objective: "Observe your relational maturity, forgiveness and management of your social circle.",
    questions: [
      "In your opinion, what are the essential qualities for building a solid and lasting friendship?",
      "How do you handle communication when a disagreement or misunderstanding arises?",
      "What importance do you place on spiritual counsel and accountability in your circle?",
    ],
    example: "\"For me, sincerity and listening are the pillars of friendship. In your opinion, how should one react wisely when someone disappoints us?\"",
  },
  {
    number: 5,
    title: "Fears, Past Frustrations & Healthy Projections",
    objective: "Address with vulnerability and maturity your fears and deep aspirations.",
    questions: [
      "What fears or apprehensions have you learned to overcome in your journey?",
      "What lessons do you draw from past difficulties to build a serene future?",
      "What is your vision of healthy and transparent communication within a Christian couple?",
    ],
    example: "\"It's not always easy to express one's fears, but prayer has greatly helped me calm my worries. What challenges have strengthened you the most spiritually?\"",
  },
];

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
  const [expanded, setExpanded] = useState<number | null>(null);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const toggle = (n: number) => setExpanded(expanded === n ? null : n);

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
            Guide to Your First 5 Conversations
          </h2>
          <p className="italic text-sm max-w-md mx-auto leading-relaxed" style={{ color: COLORS.textMuted }}>
            "Gracious words are a honeycomb, sweet to the soul and healing to the body."
            <span className="block mt-1 not-italic font-semibold text-xs" style={{ color: COLORS.green }}>— Proverbs 16:24</span>
          </p>
        </div>

        {/* Charter reminder */}
        <div className="rounded-xl p-4" style={{ background: COLORS.lightGold, border: `1px solid ${COLORS.gold}30` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.gold }}>
            <Heart className="w-3 h-3 inline mr-1" /> Commitment Charter Reminder
          </p>
          <p className="text-xs leading-relaxed" style={{ color: COLORS.text }}>
            Your exchanges in the integrated messaging must reflect holiness, dignity and Christian kindness.
            Strictly prohibited: vulgar language, verbal impurity, carnal insinuations and any lack of respect.
            <strong> May the peace and grace of Christ guide each of your words.</strong>
          </p>
        </div>

        {/* Security rules */}
        <div className="rounded-xl p-4" style={{ background: "#FEF2F2", border: "1px solid #EF444430" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "#EF4444" }}>
            <ShieldAlert className="w-3.5 h-3.5" /> Safety Rules & Strict Prohibition
          </p>
          <ul className="space-y-2 text-xs leading-relaxed" style={{ color: COLORS.text }}>
            <li className="flex gap-2">
              <span style={{ color: "#EF4444" }}>•</span>
              <span>Do not share <strong>ANY</strong> sensitive personal data (exact residential address, financial information, precise workplace locations).</span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: "#EF4444" }}>•</span>
              <span><strong>STRICTLY PROHIBITED</strong> from sharing your phone numbers, email addresses or links to social networks during these initial interactions. Any premature sharing of contact details constitutes grounds for a warning.</span>
            </li>
          </ul>
          {!acceptedRules && (
            <button onClick={() => setAcceptedRules(true)}
              className="mt-3 w-full h-9 rounded-lg text-xs font-bold transition-colors"
              style={{ background: "#EF4444", color: "#FFFFFF" }}>
              I have read and accept these safety rules
            </button>
          )}
          {acceptedRules && (
            <p className="mt-2 text-[11px] font-bold flex items-center gap-1.5" style={{ color: COLORS.green }}>
              ✓ Rules accepted — you may begin your exchanges
            </p>
          )}
        </div>

        {/* Rewards */}
        <div className="rounded-xl p-4" style={{ background: COLORS.lightGreen, border: `1px solid ${COLORS.borderGreen}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.green }}>
            <Calendar className="w-3 h-3 inline mr-1" /> A Secure Setting & Rewarded Meetings
          </p>
          <div className="space-y-2 text-xs" style={{ color: COLORS.text }}>
            <div className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: COLORS.green, color: "#FFFFFF" }}>1</span>
              <span><strong>After 1 month</strong> of regular and edifying exchange: The administrators will arrange a private video one-on-one (secure private webinar).</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: COLORS.green, color: "#FFFFFF" }}>2</span>
              <span><strong>After 2 months</strong> of interaction: For members residing in the same city, an in-person one-on-one dinner will be offered and organized by the platform as a reward for your consistency.</span>
            </div>
          </div>
        </div>

        {/* 5 Sessions */}
        <div className="space-y-3">
          <h3 className="font-headline text-base font-bold text-center" style={{ color: COLORS.text }}>
            Guide to Your First 5 Discussion Sessions
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
                          💬 Example exchange
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
            Got it, start the conversation
          </button>
          <p className="text-[10px] mt-2" style={{ color: COLORS.textMuted }}>
            You can find this guide in your profile at any time.
          </p>
        </div>
      </div>
    </div>
  );
}