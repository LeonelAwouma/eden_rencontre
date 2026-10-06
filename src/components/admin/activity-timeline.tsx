"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  UserCheck, UserMinus, UserX, CalendarPlus, CalendarCog, LogIn, Trash2, KeyRound, Mail, MessagesSquare,
  BookOpen, Send, ShieldCheck, Wrench, Flag, Activity, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  target_label?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

type Tone = "green" | "red" | "blue" | "neutral";

const TONES: Record<Tone, string> = {
  green: "bg-primary/[0.08] text-primary ring-primary/15",
  red: "bg-[#D64545]/[0.08] text-[#B83333] ring-[#D64545]/15",
  blue: "bg-[#3B6FD9]/[0.08] text-[#2F5DBF] ring-[#3B6FD9]/15",
  neutral: "bg-[#F3F1EC] text-[#56615A] ring-[#E8E5E0]",
};

const ACTION_CONFIG: Record<string, { label: string; icon: LucideIcon; tone: Tone }> = {
  admin_login: { label: "Connexion admin", icon: LogIn, tone: "blue" },
  admin_password_changed: { label: "Mot de passe admin modifié", icon: KeyRound, tone: "blue" },
  user_approved: { label: "Utilisateur approuvé", icon: UserCheck, tone: "green" },
  user_rejected: { label: "Utilisateur rejeté", icon: UserMinus, tone: "red" },
  user_suspended: { label: "Utilisateur suspendu", icon: UserMinus, tone: "red" },
  user_deleted: { label: "Compte supprimé", icon: UserX, tone: "red" },
  selfie_reviewed: { label: "Selfie vérifié", icon: ShieldCheck, tone: "green" },
  account_repaired: { label: "Compte réparé", icon: Wrench, tone: "neutral" },
  send_message_to_user: { label: "Message envoyé à un membre", icon: Send, tone: "blue" },
  approval_emails_resent: { label: "E-mails d'approbation renvoyés", icon: Mail, tone: "blue" },
  profile_reminders_sent: { label: "Rappels de profil envoyés", icon: Mail, tone: "blue" },
  event_created: { label: "Événement créé", icon: CalendarPlus, tone: "green" },
  event_updated: { label: "Événement modifié", icon: CalendarCog, tone: "neutral" },
  event_deleted: { label: "Événement supprimé", icon: Trash2, tone: "red" },
  blog_post_created: { label: "Article de blog créé", icon: BookOpen, tone: "green" },
  blog_newsletter_sent: { label: "Newsletter envoyée", icon: Mail, tone: "blue" },
  forum_message_sent: { label: "Message de l'équipe (forum)", icon: MessagesSquare, tone: "blue" },
  forum_message_deleted: { label: "Message du forum supprimé", icon: Trash2, tone: "red" },
  forum_member_muted: { label: "Membre mis en sourdine", icon: UserMinus, tone: "red" },
  forum_member_unmuted: { label: "Sourdine levée", icon: UserCheck, tone: "green" },
  accessibility_review_flagged: { label: "Avis d'accessibilité signalé", icon: Flag, tone: "red" },
  accessibility_review_deleted: { label: "Avis d'accessibilité supprimé", icon: Trash2, tone: "red" },
};

function describe(action: string) {
  return ACTION_CONFIG[action] || { label: action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), icon: Activity, tone: "neutral" as Tone };
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Aujourd'hui, ${time}`;
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Hier, ${time}`;
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}, ${time}`;
}

export function ActivityTimeline({ entries, className }: { entries: AuditEntry[]; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.25, ease: "easeOut" }}
      aria-labelledby="activity-title"
      className={cn("bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden flex flex-col min-w-0", className)}
    >
      <div className="px-5 sm:px-6 py-4 border-b border-[#F1EEE9]">
        <h2 id="activity-title" className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
          Activité récente
        </h2>
        <p className="text-[13px] text-[#5F6B63] mt-0.5">Actions de l&apos;équipe sur la plateforme</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F2EC] flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-[#6B746E]" aria-hidden="true" />
          </div>
          <p className="text-[14px] font-medium text-[#3A443E]">Aucune activité récente</p>
          <p className="text-[13px] text-[#5F6B63] mt-1">Les actions seront enregistrées ici</p>
        </div>
      ) : (
        <ol className="px-5 sm:px-6 py-4 max-h-[420px] overflow-y-auto custom-scrollbar">
          {entries.map((entry, i) => {
            const config = describe(entry.action);
            const Icon = config.icon;
            const last = i === entries.length - 1;
            return (
              <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Ligne verticale reliant les événements */}
                {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-[#E8E5E0]" aria-hidden="true" />}
                <span className={cn("relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-1", TONES[config.tone])}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[14px] font-medium text-[#1F2A23] leading-snug">{config.label}</p>
                  {entry.target_label && (
                    <p className="text-[13px] text-[#3A443E] truncate">
                      {entry.target_id ? (
                        <Link href={`/admin/users/${entry.target_id}`} className="hover:text-primary hover:underline">{entry.target_label}</Link>
                      ) : entry.target_label}
                    </p>
                  )}
                  <p className="text-[12px] text-[#5F6B63] mt-0.5 truncate">
                    <time dateTime={entry.created_at}>{formatWhen(entry.created_at)}</time>
                    {entry.admin_email && <> · {entry.admin_email}</>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
