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
    title: "Les Centres d'Intérêt, Passions & Loisirs",
    objective: "Briser la glace naturellement et découvrir ce qui anime votre journée.",
    questions: [
      "Comment occupez-vous votre temps libre après le travail ou les engagements ecclésiaux ?",
      "Quels sont les hobbies ou centres d'intérêt qui vous permettent de vous ressourcer ?",
      "Y a-t-il une passion ou une activité créative que vous aimeriez développer à l'avenir ?",
    ],
  },
  {
    number: 2,
    title: "L'Enfance, les Racines & les Valeurs Familiales",
    objective: "Comprendre votre arrière-plan culturel, familial et l'origine de vos valeurs.",
    questions: [
      "Dans quelle ville ou région avez-vous grandi et quel est votre plus beau souvenir d'enfance ?",
      "Quelle est la valeur clé que vos parents ou tuteurs vous ont transmise et qui vous guide aujourd'hui ?",
      "Comment définissez-vous la place de la famille et de la fraternité dans votre vie ?",
    ],
  },
  {
    number: 3,
    title: "La Marche Spirituelle & le Service dans l'Église",
    objective: "Échanger sur votre appel, vos engagements et votre vie de foi au quotidien.",
    questions: [
      "Dans quel département ou ministère vous investissez-vous au sein de votre assemblée locale ?",
      "Comment s'articule votre appel ministériel ou spirituel avec votre vie professionnelle ?",
      "Quel est le passage biblique ou le principe de foi qui soutient votre marche en ce moment ?",
    ],
    example: "« Je sers au sein du département d'accueil à l'église, ce qui m'apprend la patience. Quel est le domaine dans lequel tu sens que Dieu t'appelle à servir activement ? »",
  },
  {
    number: 4,
    title: "L'Amitié, les Relations & le Rapport aux Autres",
    objective: "Observer votre maturité relationnelle, le pardon et la gestion du cercle d'amis.",
    questions: [
      "Selon vous, quelles sont les qualités indispensables pour construire une amitié solide et durable ?",
      "Comment gérez-vous la communication lorsque survient un désaccord ou une mauvaise compréhension ?",
      "Quelle importance accordez-vous au conseil spirituel et aux redevabilités dans votre entourage ?",
    ],
    example: "« Pour moi, la sincérité et l'écoute sont les piliers de l'amitié. Selon toi, comment réagir avec sagesse lorsque quelqu'un nous déçoit ? »",
  },
  {
    number: 5,
    title: "Appréhensions, Frustrations Passées & Projections Saines",
    objective: "Aborder avec vulnérabilité et maturité vos craintes et aspirations profondes.",
    questions: [
      "Quelles sont les craintes ou appréhensions que vous avez apprises à surmonter dans votre parcours ?",
      "Quels sont les enseignements que vous tirez de vos difficultés passées pour bâtir un avenir serein ?",
      "Quelle est votre vision d'une communication saine et transparente au sein d'un couple chrétien ?",
    ],
    example: "« Il n'est pas toujours facile d'exprimer ses appréhensions, mais la prière m'a beaucoup aidé(e) à apaiser mes inquiétudes. Quels sont les défis qui t'ont le plus fortifié(e) spirituellement ? »",
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
            Guide des 5 Premières Conversations
          </h2>
          <p className="italic text-sm max-w-md mx-auto leading-relaxed" style={{ color: COLORS.textMuted }}>
            « Des paroles agréables sont un rayon de miel, Douces pour l'âme et salutaires pour le corps. »
            <span className="block mt-1 not-italic font-semibold text-xs" style={{ color: COLORS.green }}>— Proverbes 16:24</span>
          </p>
        </div>

        {/* Charter reminder */}
        <div className="rounded-xl p-4" style={{ background: COLORS.lightGold, border: `1px solid ${COLORS.gold}30` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.gold }}>
            <Heart className="w-3 h-3 inline mr-1" /> Rappel de la Charte d'Engagement
          </p>
          <p className="text-xs leading-relaxed" style={{ color: COLORS.text }}>
            Vos échanges dans la messagerie intégrée doivent refléter la sainteté, la dignité et la bienveillance chrétienne.
            Sont strictement proscrits : les propos vulgaires, l'impureté verbale, les insinuations charnelles et tout manque de respect.
            <strong> Que la paix et la grâce de Christ dirigent chacune de vos paroles.</strong>
          </p>
        </div>

        {/* Security rules */}
        <div className="rounded-xl p-4" style={{ background: "#FEF2F2", border: "1px solid #EF444430" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "#EF4444" }}>
            <ShieldAlert className="w-3.5 h-3.5" /> Consignes de Sécurité & Interdiction Formelle
          </p>
          <ul className="space-y-2 text-xs leading-relaxed" style={{ color: COLORS.text }}>
            <li className="flex gap-2">
              <span style={{ color: "#EF4444" }}>•</span>
              <span>Ne communiquez <strong>AUCUNE</strong> donnée personnelle sensible (adresse résidentielle exacte, informations financières, lieux de travail précis).</span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: "#EF4444" }}>•</span>
              <span><strong>INTERDICTION FORMELLE</strong> de transmettre vos numéros de téléphone, adresses e-mail ou liens vers des réseaux sociaux durant ces premières interactions. Tout partage précoce de coordonnées constitue un motif d'avertissement.</span>
            </li>
          </ul>
          {!acceptedRules && (
            <button onClick={() => setAcceptedRules(true)}
              className="mt-3 w-full h-9 rounded-lg text-xs font-bold transition-colors"
              style={{ background: "#EF4444", color: "#FFFFFF" }}>
              J'ai lu et j'accepte ces règles de sécurité
            </button>
          )}
          {acceptedRules && (
            <p className="mt-2 text-[11px] font-bold flex items-center gap-1.5" style={{ color: COLORS.green }}>
              ✓ Règles acceptées — vous pouvez commencer vos échanges
            </p>
          )}
        </div>

        {/* Rewards */}
        <div className="rounded-xl p-4" style={{ background: COLORS.lightGreen, border: `1px solid ${COLORS.borderGreen}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.green }}>
            <Calendar className="w-3 h-3 inline mr-1" /> Un Cadre Sécurisé & des Rendez-Vous Récompensés
          </p>
          <div className="space-y-2 text-xs" style={{ color: COLORS.text }}>
            <div className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: COLORS.green, color: "#FFFFFF" }}>1</span>
              <span><strong>Après 1 mois</strong> d'échange régulier et édifiant : Les administrateurs organiseront un tête-à-tête vidéo privilégié (webinaire privé sécurisé).</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: COLORS.green, color: "#FFFFFF" }}>2</span>
              <span><strong>Après 2 mois</strong> d'interaction : Pour les membres résidant dans la même ville, un tête-à-tête physique en restaurant sera offert et organisé par la plateforme en récompense de votre constance.</span>
            </div>
          </div>
        </div>

        {/* 5 Sessions */}
        <div className="space-y-3">
          <h3 className="font-headline text-base font-bold text-center" style={{ color: COLORS.text }}>
            Guide des 5 Premières Séances de Discussion
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
                          💬 Exemple d'échange
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
            Compris, démarrer la conversation
          </button>
          <p className="text-[10px] mt-2" style={{ color: COLORS.textMuted }}>
            Vous pourrez retrouver ce guide dans votre profil à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
}