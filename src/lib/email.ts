// ── Email Service for Garden of Alliance ─────────────────────────
// Uses Hostinger SMTP (contact@gardenofalliance.com) via nodemailer.
// Configure SMTP_USER and SMTP_PASSWORD in .env.local — SMTP_HOST/SMTP_PORT
// default to Hostinger's mail servers and rarely need overriding.
// Les gabarits (mise en page, contenus) vivent dans email-templates.ts.

import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { saveToSentFolder } from "./email-sent-copy";
import {
  CONTACT_EMAIL,
  LOGO_CID,
  registrationReceivedEmail,
  accountApprovedEmail,
  accountRejectedEmail,
  otpEmail,
  passwordResetSuccessEmail,
  meetInvitationEmail,
  meetingInvitationEmail,
  meetingRescheduledEmail,
  meetingCancelledEmail,
  accountSuspendedEmail,
  verificationApprovedEmail,
  verificationRejectedEmail,
  newsletterWelcomeEmail,
  testEmail,
  profileReminderEmail,
  type RenderedEmail,
  type MeetInvitationEmailParams,
  type MeetingInvitationEmailParams,
} from "./email-templates";
import { EMAIL_LOGO_PNG_BASE64 } from "./email-logo";
import { getEmailSettings, DEFAULT_PLATFORM_NAME, type EmailSettings } from "./platform-settings";

export type { MeetInvitationEmailParams, MeetingInvitationEmailParams };

const DEFAULT_SMTP_HOST = "smtp.hostinger.com";
const DEFAULT_SMTP_PORT = 465; // SSL — Hostinger's default secure port
const DEFAULT_SMTP_USER = "contact@gardenofalliance.com";

const SMTP_USER = process.env.SMTP_USER || DEFAULT_SMTP_USER;

// Create a reusable transporter
// `pool` : une seule connexion SMTP réutilisée pour un envoi groupé (newsletter).
function getTransporter(pool = false) {
  const smtpPassword = process.env.SMTP_PASSWORD;
  if (!smtpPassword) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || DEFAULT_SMTP_PORT;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || DEFAULT_SMTP_HOST,
    port,
    secure: port === 465, // true pour le port 465 (SSL) ; STARTTLS sur 587
    auth: {
      user: SMTP_USER,
      pass: smtpPassword,
    },
    ...(pool ? { pool: true, maxConnections: 1 } : {}),
  });
}

/** Message prêt pour nodemailer, avec le logo joint en ligne. */
function buildMail(settings: EmailSettings, to: string, email: RenderedEmail, headers?: Record<string, string>) {
  return {
    // L'adresse d'envoi reste celle du compte SMTP (exigé par Hostinger) ; seul le nom affiché change.
    from: { name: settings.platformName, address: SMTP_USER },
    replyTo: settings.contactEmail,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers,
    // Logo joint en ligne : visible même quand les images distantes sont bloquées.
    attachments: [{
      filename: "garden-of-alliance.png",
      content: Buffer.from(EMAIL_LOGO_PNG_BASE64, "base64"),
      contentType: "image/png",
      cid: LOGO_CID,
    }],
  };
}

/** En-têtes de désabonnement en un clic (RFC 8058), attendus par Gmail/Yahoo pour les envois groupés. */
function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Applique les réglages d'Admin → Paramètres au message rendu : nom de la
 * plateforme et adresse de contact remplacent les valeurs par défaut des gabarits.
 */
function applySettings(email: RenderedEmail, settings: EmailSettings): RenderedEmail {
  const swap = (s: string) =>
    s.split(DEFAULT_PLATFORM_NAME).join(settings.platformName).split(CONTACT_EMAIL).join(settings.contactEmail);
  return { ...email, subject: swap(email.subject), html: swap(email.html), text: swap(email.text) };
}

/**
 * - "account" : inscription, compte, mot de passe, vérification — part toujours.
 * - "meeting" : invitations, reports et annulations de réunion — désactivable
 *   dans Admin → Paramètres → Notifications.
 */
type EmailKind = "account" | "meeting";

/**
 * Cause du dernier échec d'envoi, en clair, pour l'admin (« pourquoi le membre
 * n'a-t-il rien reçu ? »). Remise à zéro à chaque envoi.
 */
let lastEmailError: string | null = null;
export const getLastEmailError = () => lastEmailError;

function explainSmtpError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; response?: string; message?: string };
  if (e.responseCode === 535 || e.code === "EAUTH") {
    return "Identifiants SMTP refusés par le serveur d'e-mail : vérifiez SMTP_USER et SMTP_PASSWORD dans Vercel (mot de passe de la boîte contact@ chez Hostinger).";
  }
  if (e.code === "ECONNECTION" || e.code === "ETIMEDOUT" || e.code === "ESOCKET" || e.code === "EDNS") {
    return "Serveur d'e-mail injoignable (SMTP_HOST / SMTP_PORT) : vérifiez la configuration ou réessayez plus tard.";
  }
  if (e.responseCode && e.responseCode >= 500) {
    return `Message refusé par le serveur d'e-mail (${e.responseCode}) : ${String(e.response || "").slice(0, 160)}`;
  }
  return `Erreur d'envoi : ${String(e.message || err).slice(0, 160)}`;
}

async function sendEmail(
  to: string,
  rendered: RenderedEmail,
  kind: EmailKind = "account",
  headers?: Record<string, string>
): Promise<boolean> {
  const settings = await getEmailSettings();
  if (kind === "meeting" && !settings.meetingEmailsEnabled) {
    console.log(`📧 E-mail de réunion non envoyé à ${to} : désactivé dans Admin → Paramètres.`);
    return false;
  }
  const email = applySettings(rendered, settings);
  const smtpPassword = process.env.SMTP_PASSWORD;
  lastEmailError = null;

  if (smtpPassword) {
    // Use Hostinger SMTP via nodemailer
    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.error("SMTP transporter could not be created — missing SMTP_PASSWORD");
        lastEmailError = "SMTP_PASSWORD manquant sur le serveur.";
        return false;
      }

      // Message compilé une seule fois : la copie de « Envoyée » est identique à l'e-mail parti.
      const raw = await new MailComposer(buildMail(settings, to, email, headers)).compile().build();
      await transporter.sendMail({ envelope: { from: SMTP_USER, to }, raw });
      console.log(`📧 Email sent to ${to} — Subject: ${email.subject}`);
      // Attendu (et non lancé en tâche de fond) : sur Vercel la fonction s'arrête au retour.
      await saveToSentFolder(SMTP_USER, smtpPassword, raw);
      return true;
    } catch (err) {
      console.error("Email send error (SMTP):", err);
      lastEmailError = explainSmtpError(err);
      return false;
    }
  }

  // Fallback: log to console (development — no SMTP_PASSWORD configured)
  console.log("═══════════════════════════════════════════");
  console.log("📧 EMAIL (no SMTP_PASSWORD configured)");
  console.log(`From: ${settings.platformName} <${SMTP_USER}> (réponse : ${settings.contactEmail})`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${email.subject}`);
  console.log(email.text);
  console.log("═══════════════════════════════════════════");
  // En production, rien n'est parti : on le signale au lieu de faire croire à un envoi.
  if (process.env.NODE_ENV === "production") {
    console.error("Email NOT sent: SMTP_PASSWORD is missing in production.");
    lastEmailError = "Aucun e-mail ne peut partir : la variable SMTP_PASSWORD n'est pas définie dans Vercel (Settings → Environment Variables), puis redéployez.";
    return false;
  }
  return true;
}

/** E-mail de test (Admin → Paramètres) : renvoie la cause précise en cas d'échec. */
export async function sendTestEmail(to: string): Promise<{ ok: boolean; error: string | null }> {
  const ok = await sendEmail(to, testEmail());
  return { ok, error: ok ? null : lastEmailError || "Échec de l'envoi." };
}

// ── Inscription et compte ────────────────────────────────────
export async function sendRegistrationReceivedEmail(email: string, name: string): Promise<boolean> {
  return sendEmail(email, registrationReceivedEmail(name));
}

export async function sendAccountApprovedEmail(email: string, name: string): Promise<boolean> {
  return sendEmail(email, accountApprovedEmail(name));
}

export async function sendProfileReminderEmail(email: string, name: string, missing: string[]): Promise<boolean> {
  return sendEmail(email, profileReminderEmail(name, missing));
}

export async function sendAccountRejectedEmail(email: string, name: string, reason?: string): Promise<boolean> {
  return sendEmail(email, accountRejectedEmail(name, reason));
}

export async function sendAccountSuspendedEmail(email: string, name: string, reason?: string): Promise<boolean> {
  return sendEmail(email, accountSuspendedEmail(name, reason));
}

// ── Mot de passe ─────────────────────────────────────────────
export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  return sendEmail(email, otpEmail(otp));
}

export async function sendPasswordResetSuccessEmail(email: string, name?: string): Promise<boolean> {
  return sendEmail(email, passwordResetSuccessEmail(name));
}

// ── Réunions et rendez-vous ──────────────────────────────────
export async function sendMeetInvitationEmail(params: MeetInvitationEmailParams): Promise<boolean> {
  return sendEmail(params.to, meetInvitationEmail(params), "meeting");
}

export async function sendMeetingInvitationEmail(params: MeetingInvitationEmailParams): Promise<boolean> {
  return sendEmail(params.to, meetingInvitationEmail(params), "meeting");
}

export async function sendMeetingRescheduledEmail(params: MeetingInvitationEmailParams): Promise<boolean> {
  return sendEmail(params.to, meetingRescheduledEmail(params), "meeting");
}

export async function sendMeetingCancelledEmail(
  to: string,
  userName: string,
  meetingTitle: string,
  otherUserName: string,
  reason?: string
): Promise<boolean> {
  return sendEmail(to, meetingCancelledEmail(userName, meetingTitle, otherUserName, reason), "meeting");
}

// ── Vérification de profil ───────────────────────────────────
export async function sendVerificationApprovedEmail(email: string, name: string, auto = false): Promise<boolean> {
  return sendEmail(email, verificationApprovedEmail(name, auto));
}

export async function sendVerificationRejectedEmail(email: string, name: string, reason?: string): Promise<boolean> {
  return sendEmail(email, verificationRejectedEmail(name, reason));
}

// ── Newsletter du blog ───────────────────────────────────────
export async function sendNewsletterWelcomeEmail(email: string, unsubscribeUrl: string): Promise<boolean> {
  return sendEmail(email, newsletterWelcomeEmail(unsubscribeUrl), "account", unsubscribeHeaders(unsubscribeUrl));
}

export interface NewsletterMessage {
  to: string;
  rendered: RenderedEmail;
  unsubscribeUrl: string;
}

/**
 * Envoi groupé (un e-mail individuel par abonné, jamais de copie cachée) sur une
 * seule connexion SMTP. Renvoie le nombre d'e-mails effectivement partis.
 */
export async function sendNewsletterEmails(messages: NewsletterMessage[]): Promise<number> {
  if (messages.length === 0) return 0;
  const settings = await getEmailSettings();
  const transporter = getTransporter(true);

  if (!transporter) {
    // Pas de SMTP_PASSWORD : en développement on journalise, en production rien ne part.
    console.log(`📧 Newsletter (no SMTP_PASSWORD configured) — ${messages.length} destinataire(s) : ${messages[0].rendered.subject}`);
    if (process.env.NODE_ENV === "production") {
      console.error("Newsletter NOT sent: SMTP_PASSWORD is missing in production.");
      return 0;
    }
    return messages.length;
  }

  let sent = 0;
  try {
    for (const m of messages) {
      try {
        await transporter.sendMail(buildMail(settings, m.to, applySettings(m.rendered, settings), unsubscribeHeaders(m.unsubscribeUrl)));
        sent++;
      } catch (err) {
        console.error(`Newsletter send error (SMTP) to ${m.to}:`, err);
      }
    }
  } finally {
    transporter.close();
  }
  console.log(`📧 Newsletter sent to ${sent}/${messages.length} recipient(s) — Subject: ${messages[0].rendered.subject}`);
  return sent;
}
