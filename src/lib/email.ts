// ── Email Service for Garden of Alliance ─────────────────────────
// Uses Hostinger SMTP (contact@gardenofalliance.com) via nodemailer.
// Configure SMTP_USER and SMTP_PASSWORD in .env.local — SMTP_HOST/SMTP_PORT
// default to Hostinger's mail servers and rarely need overriding.
// Les gabarits (mise en page, contenus) vivent dans email-templates.ts.

import nodemailer from "nodemailer";
import {
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
  type RenderedEmail,
  type MeetInvitationEmailParams,
  type MeetingInvitationEmailParams,
} from "./email-templates";
import { EMAIL_LOGO_PNG_BASE64 } from "./email-logo";

export type { MeetInvitationEmailParams, MeetingInvitationEmailParams };

const DEFAULT_SMTP_HOST = "smtp.hostinger.com";
const DEFAULT_SMTP_PORT = 465; // SSL — Hostinger's default secure port
const DEFAULT_SMTP_USER = "contact@gardenofalliance.com";

const SMTP_USER = process.env.SMTP_USER || DEFAULT_SMTP_USER;
const FROM_EMAIL = `Garden of Alliance <${SMTP_USER}>`;

// Create a reusable transporter
function getTransporter() {
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
  });
}

async function sendEmail(to: string, email: RenderedEmail): Promise<boolean> {
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (smtpPassword) {
    // Use Hostinger SMTP via nodemailer
    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.error("SMTP transporter could not be created — missing SMTP_PASSWORD");
        return false;
      }

      await transporter.sendMail({
        from: FROM_EMAIL,
        replyTo: SMTP_USER,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        // Logo joint en ligne : visible même quand les images distantes sont bloquées.
        attachments: [{
          filename: "garden-of-alliance.png",
          content: Buffer.from(EMAIL_LOGO_PNG_BASE64, "base64"),
          contentType: "image/png",
          cid: LOGO_CID,
        }],
      });
      console.log(`📧 Email sent to ${to} — Subject: ${email.subject}`);
      return true;
    } catch (err) {
      console.error("Email send error (SMTP):", err);
      return false;
    }
  }

  // Fallback: log to console (development — no SMTP_PASSWORD configured)
  console.log("═══════════════════════════════════════════");
  console.log("📧 EMAIL (no SMTP_PASSWORD configured)");
  console.log(`From: ${FROM_EMAIL}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${email.subject}`);
  console.log(email.text);
  console.log("═══════════════════════════════════════════");
  return true;
}

// ── Inscription et compte ────────────────────────────────────
export async function sendRegistrationReceivedEmail(email: string, name: string): Promise<boolean> {
  return sendEmail(email, registrationReceivedEmail(name));
}

export async function sendAccountApprovedEmail(email: string, name: string): Promise<boolean> {
  return sendEmail(email, accountApprovedEmail(name));
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
  return sendEmail(params.to, meetInvitationEmail(params));
}

export async function sendMeetingInvitationEmail(params: MeetingInvitationEmailParams): Promise<boolean> {
  return sendEmail(params.to, meetingInvitationEmail(params));
}

export async function sendMeetingRescheduledEmail(params: MeetingInvitationEmailParams): Promise<boolean> {
  return sendEmail(params.to, meetingRescheduledEmail(params));
}

export async function sendMeetingCancelledEmail(
  to: string,
  userName: string,
  meetingTitle: string,
  otherUserName: string,
  reason?: string
): Promise<boolean> {
  return sendEmail(to, meetingCancelledEmail(userName, meetingTitle, otherUserName, reason));
}

// ── Vérification de profil ───────────────────────────────────
export async function sendVerificationApprovedEmail(email: string, name: string): Promise<boolean> {
  return sendEmail(email, verificationApprovedEmail(name));
}

export async function sendVerificationRejectedEmail(email: string, name: string, reason?: string): Promise<boolean> {
  return sendEmail(email, verificationRejectedEmail(name, reason));
}
