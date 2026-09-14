// ── Email Service for Garden of Alliance ─────────────────────────
// Uses Gmail SMTP via nodemailer for sending emails.
// Configure GMAIL_USER and GMAIL_APP_PASSWORD in .env.local

import nodemailer from "nodemailer";

const FROM_EMAIL = "Garden of Alliance <corpceleste3@gmail.com>";

// Create a reusable transporter
function getTransporter() {
  const gmailUser = process.env.GMAIL_USER || "corpceleste3@gmail.com";
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailAppPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (gmailAppPassword) {
    // Use Gmail SMTP via nodemailer
    try {
      const transporter = getTransporter();
      if (!transporter) {
        console.error("Gmail transporter could not be created — missing GMAIL_APP_PASSWORD");
        return false;
      }

      await transporter.sendMail({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`📧 Email sent to ${options.to} — Subject: ${options.subject}`);
      return true;
    } catch (err) {
      console.error("Email send error (Gmail SMTP):", err);
      return false;
    }
  }

  // Fallback: log to console (development — no GMAIL_APP_PASSWORD configured)
  console.log("═══════════════════════════════════════════");
  console.log("📧 EMAIL (no GMAIL_APP_PASSWORD configured)");
  console.log(`From: ${FROM_EMAIL}`);
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Body: ${options.html}`);
  console.log("═══════════════════════════════════════════");
  return true;
}

// ── Registration Received Email ──────────────────────────────
export async function sendRegistrationReceivedEmail(
  email: string,
  name: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Inscription reçue — Garden of Alliance",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Merci de votre inscription sur <strong>Garden of Alliance</strong>.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Vos informations sont actuellement <strong>en cours de vérification</strong> par notre équipe.
            Cette étape nous permet de garantir la qualité et la sécurité de notre communauté.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Vous recevrez un email dès que votre compte aura été validé.
          </p>
          <div style="margin: 30px 0; padding: 20px; background: #f0ede6; border-radius: 12px; border-left: 4px solid #2D5016;">
            <p style="color: #2D5016; font-size: 14px; margin: 0; font-weight: bold;">
              ⏳ Statut : En attente de validation
            </p>
          </div>
          <p style="color: #888; font-size: 13px; margin-bottom: 0;">
            En attendant, nous vous invitons à relire notre
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://edenconnexion.com"}/charte" style="color: #2D5016;">Charte Éthique</a>.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Account Approved Email ───────────────────────────────────
export async function sendAccountApprovedEmail(
  email: string,
  name: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edenconnexion.com";
  return sendEmail({
    to: email,
    subject: "Votre compte a été approuvé — Garden of Alliance",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Félicitations ${name} ! 🎉</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Après examen de votre dossier, nous avons le plaisir de vous informer que
            <strong>votre profil a été validé</strong>.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Vous pouvez désormais accéder à la plateforme Garden of Alliance et commencer
            votre chemin vers l'alliance bénie.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/login"
               style="display: inline-block; background: #2D5016; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Accéder à mon compte
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            Connectez-vous avec l'email et le mot de passe que vous avez choisis lors de votre inscription.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Account Rejected Email ───────────────────────────────────
export async function sendAccountRejectedEmail(
  email: string,
  name: string,
  reason?: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Votre demande d'inscription — Garden of Alliance",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Nous vous remercions pour votre intérêt envers <strong>Garden of Alliance</strong>.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Après examen de votre dossier, nous avons le regret de vous informer que
            votre demande d'inscription n'a pas pu être approuvée à ce stade.
          </p>
          ${reason ? `
          <div style="margin: 20px 0; padding: 20px; background: #fdf2f2; border-radius: 12px; border-left: 4px solid #dc3545;">
            <p style="color: #dc3545; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">Motif :</p>
            <p style="color: #555; font-size: 14px; margin: 0;">${reason}</p>
          </div>
          ` : ""}
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à nous contacter
            à l'adresse <a href="mailto:corpceleste3@gmail.com" style="color: #2D5016;">corpceleste3@gmail.com</a>.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Password Reset OTP Email ────────────────────────────────
export async function sendOTPEmail(
  email: string,
  otp: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edenconnexion.com";
  return sendEmail({
    to: email,
    subject: "Code de vérification — Réinitialisation de mot de passe",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Réinitialisation de mot de passe</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Bonjour,
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Nous avons reçu une demande de réinitialisation de votre mot de passe.
            Votre code de vérification est :
          </p>
          <div style="text-align: center; margin: 30px 0; padding: 24px; background: #f0ede6; border-radius: 12px;">
            <p style="color: #2D5016; font-size: 40px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
              ${otp}
            </p>
          </div>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Ce code expire dans <strong>10 minutes</strong>.
          </p>
          <div style="margin: 20px 0; padding: 16px; background: #fff3cd; border-radius: 12px; border-left: 4px solid #ffc107;">
            <p style="color: #856404; font-size: 14px; margin: 0;">
              ⚠️ Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
            </p>
          </div>
          <p style="color: #888; font-size: 13px; margin-bottom: 0;">
            Ne partagez ce code avec personne. L'équipe Garden of Alliance ne vous demandera jamais votre code.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Password Reset Success Email ────────────────────────────
export async function sendPasswordResetSuccessEmail(
  email: string,
  name?: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edenconnexion.com";
  return sendEmail({
    to: email,
    subject: "Votre mot de passe a été modifié — Garden of Alliance",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Mot de passe modifié ✓</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            ${name ? `Bonjour ${name},` : "Bonjour,"}
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Votre mot de passe a été modifié avec succès. Toutes vos sessions actives ont été invalidées
            pour des raisons de sécurité.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/login"
               style="display: inline-block; background: #2D5016; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Se reconnecter
            </a>
          </div>
          <div style="margin: 20px 0; padding: 16px; background: #fdf2f2; border-radius: 12px; border-left: 4px solid #dc3545;">
            <p style="color: #dc3545; font-size: 14px; margin: 0;">
              🔒 Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement notre support à
              <a href="mailto:corpceleste3@gmail.com" style="color: #dc3545;">corpceleste3@gmail.com</a>.
            </p>
          </div>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Meet Invitation Email ────────────────────────────────────
export interface MeetInvitationEmailParams {
  to: string;
  userName: string;
  meetingTitle: string;
  meetingDescription: string | null;
  meetingDate: Date;
  duration: number;
  meetLink: string | null;
  meetingCode: string | null;
  adminMessage: string | null;
}

export async function sendMeetInvitationEmail(
  params: MeetInvitationEmailParams
): Promise<boolean> {
  const { to, userName, meetingTitle, meetingDescription, meetingDate, duration, meetLink, meetingCode, adminMessage } = params;

  const formattedDate = meetingDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = meetingDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const durationLabel =
    duration >= 60
      ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? `${duration % 60}` : ""}`
      : `${duration} minutes`;

  const joinButtonHtml = meetLink
    ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${meetLink}"
           style="display: inline-block; background: #2D5016; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Rejoindre Google Meet
        </a>
      </div>`
    : `<div style="margin: 20px 0; padding: 16px; background: #fff3cd; border-radius: 12px; border-left: 4px solid #ffc107;">
        <p style="color: #856404; font-size: 14px; margin: 0;">
          ⚠️ Le lien de réunion n'a pas pu être généré. Veuillez contacter l'administrateur.
        </p>
      </div>`;

  const meetingCodeHtml = meetingCode
    ? `<p style="color: #6B7280; font-size: 13px; margin-top: 8px;">
        Code de réunion : <strong>${meetingCode}</strong>
      </p>`
    : "";

  return sendEmail({
    to,
    subject: `Invitation à une réunion — ${meetingTitle}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${userName},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Vous êtes invité(e) à une réunion Google Meet.
          </p>

          <div style="margin: 24px 0; padding: 24px; background: #f0ede6; border-radius: 12px;">
            <p style="color: #2D5016; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">
              ${meetingTitle}
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #888; font-size: 14px; width: 100px;">📅 Date</td>
                <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888; font-size: 14px;">🕐 Heure</td>
                <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${formattedTime}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888; font-size: 14px;">⏱ Durée</td>
                <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${durationLabel}</td>
              </tr>
            </table>
            ${meetingCodeHtml}
          </div>

          ${adminMessage ? `
          <div style="margin: 20px 0; padding: 16px; background: #EEF5EC; border-radius: 12px; border-left: 4px solid #2D5016;">
            <p style="color: #2D5016; font-size: 14px; margin: 0 0 4px 0; font-weight: bold;">Message de l'administrateur :</p>
            <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">${adminMessage}</p>
          </div>
          ` : ""}

          ${joinButtonHtml}

          ${meetLink ? `
          <p style="color: #888; font-size: 12px; text-align: center; word-break: break-all;">
            Ou copiez ce lien : <a href="${meetLink}" style="color: #2D5016;">${meetLink}</a>
          </p>
          ` : ""}
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Meeting (Rendez-vous) Invitation Email ───────────────────
export interface MeetingInvitationEmailParams {
  to: string;
  userName: string;
  meetingTitle: string;
  meetingDescription: string | null;
  meetingDate: Date;
  durationMinutes: number;
  meetLink: string | null;
  otherUserName: string;
}

export async function sendMeetingInvitationEmail(
  params: MeetingInvitationEmailParams
): Promise<boolean> {
  const { to, userName, meetingTitle, meetingDescription, meetingDate, durationMinutes, meetLink, otherUserName } = params;

  const formattedDate = meetingDate.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const formattedTime = meetingDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });
  const durationLabel = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? `${durationMinutes % 60}` : ""}`
    : `${durationMinutes} minutes`;

  const joinButtonHtml = meetLink
    ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${meetLink}" style="display: inline-block; background: #2D5016; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Rejoindre Google Meet
        </a>
      </div>`
    : `<div style="margin: 20px 0; padding: 16px; background: #fff3cd; border-radius: 12px; border-left: 4px solid #ffc107;">
        <p style="color: #856404; font-size: 14px; margin: 0;">
          ⚠️ Le lien de réunion n'a pas encore été généré. Il sera disponible prochainement.
        </p>
      </div>`;

  return sendEmail({
    to,
    subject: `Invitation à un rendez-vous vidéo — ${meetingTitle}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${userName},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Vous êtes invité(e) à un rendez-vous vidéo avec <strong>${otherUserName}</strong>.
          </p>
          <div style="margin: 24px 0; padding: 24px; background: #f0ede6; border-radius: 12px;">
            <p style="color: #2D5016; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">${meetingTitle}</p>
            ${meetingDescription ? `<p style="color: #6B7280; font-size: 14px; margin: 0 0 12px 0; line-height: 1.6;">${meetingDescription}</p>` : ""}
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #888; font-size: 14px; width: 100px;">📅 Date</td><td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${formattedDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">🕐 Heure</td><td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${formattedTime}</td></tr>
              <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">⏱ Durée</td><td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${durationLabel}</td></tr>
              <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">👤 Avec</td><td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${otherUserName}</td></tr>
            </table>
          </div>
          ${joinButtonHtml}
          ${meetLink ? `<p style="color: #888; font-size: 12px; text-align: center; word-break: break-all;">Ou copiez ce lien : <a href="${meetLink}" style="color: #2D5016;">${meetLink}</a></p>` : ""}
          <p style="color: #888; font-size: 13px; margin-top: 24px; text-align: center;">Connectez-vous à votre espace pour plus de détails.</p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Meeting Rescheduled Email ─────────────────────────────────
export async function sendMeetingRescheduledEmail(
  params: MeetingInvitationEmailParams
): Promise<boolean> {
  const { to, userName, meetingTitle, meetingDate, durationMinutes, meetLink, otherUserName } = params;

  const formattedDate = meetingDate.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const formattedTime = meetingDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });
  const durationLabel = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? `${durationMinutes % 60}` : ""}`
    : `${durationMinutes} minutes`;

  const joinButtonHtml = meetLink
    ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${meetLink}" style="display: inline-block; background: #2D5016; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Rejoindre Google Meet
        </a>
      </div>` : "";

  return sendEmail({
    to,
    subject: `Rendez-vous reprogrammé — ${meetingTitle}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${userName},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Votre rendez-vous vidéo avec <strong>${otherUserName}</strong> a été <strong style="color: #8B5CF6;">reprogrammé</strong>.
          </p>
          <div style="margin: 24px 0; padding: 24px; background: #F5F3FF; border-radius: 12px; border-left: 4px solid #8B5CF6;">
            <p style="color: #5B21B6; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">${meetingTitle}</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #888; font-size: 14px; width: 100px;">📅 Nouvelle date</td><td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${formattedDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">🕐 Heure</td><td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${formattedTime}</td></tr>
              <tr><td style="padding: 6px 0; color: #888; font-size: 14px;">⏱ Durée</td><td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 500;">${durationLabel}</td></tr>
            </table>
          </div>
          ${joinButtonHtml}
          ${meetLink ? `<p style="color: #888; font-size: 12px; text-align: center; word-break: break-all;">Ou copiez ce lien : <a href="${meetLink}" style="color: #2D5016;">${meetLink}</a></p>` : ""}
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Meeting Cancelled Email ───────────────────────────────────
export async function sendMeetingCancelledEmail(
  to: string,
  userName: string,
  meetingTitle: string,
  otherUserName: string,
  reason?: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Rendez-vous annulé — ${meetingTitle}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${userName},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Votre rendez-vous vidéo <strong>« ${meetingTitle} »</strong> avec <strong>${otherUserName}</strong> a été <strong style="color: #EF4444;">annulé</strong>.
          </p>
          ${reason ? `
          <div style="margin: 20px 0; padding: 16px; background: #fef2f2; border-radius: 12px; border-left: 4px solid #EF4444;">
            <p style="color: #991B1B; font-size: 14px; margin: 0 0 4px 0; font-weight: bold;">Raison :</p>
            <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">${reason}</p>
          </div>
          ` : ""}
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            N'hésitez pas à planifier un nouveau rendez-vous depuis votre espace.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Account Suspended Email ──────────────────────────────────
export async function sendAccountSuspendedEmail(
  email: string,
  name: string,
  reason?: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Suspension de votre compte — Garden of Alliance",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Nous vous informons que votre compte sur <strong>Garden of Alliance</strong> a été temporairement suspendu.
          </p>
          ${reason ? `
          <div style="margin: 20px 0; padding: 20px; background: #fff3cd; border-radius: 12px; border-left: 4px solid #ffc107;">
            <p style="color: #856404; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">Motif :</p>
            <p style="color: #555; font-size: 14px; margin: 0;">${reason}</p>
          </div>
          ` : ""}
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Pour toute question, contactez-nous à
            <a href="mailto:corpceleste3@gmail.com" style="color: #2D5016;">corpceleste3@gmail.com</a>.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Verification Approved Email ──────────────────────────────
export async function sendVerificationApprovedEmail(
  email: string,
  name: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edenconnexion.com";
  return sendEmail({
    to: email,
    subject: "✅ Profil Vérifié — Garden of Alliance",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Félicitations ${name} ! ✅</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Votre profil a été <strong>vérifié</strong> par notre équipe.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Le badge <strong style="color: #2D5016;">« Profil Vérifié »</strong> est maintenant affiché sur votre profil.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/dashboard"
               style="display: inline-block; background: #2D5016; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Accéder à mon espace
            </a>
          </div>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}

// ── Verification Rejected Email ──────────────────────────────
export async function sendVerificationRejectedEmail(
  email: string,
  name: string,
  reason?: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edenconnexion.com";
  return sendEmail({
    to: email,
    subject: "Vérification de profil — Garden of Alliance",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Garden <em>of Alliance</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Après examen, votre demande de <strong>vérification de profil</strong> n'a pas pu être approuvée à ce stade.
          </p>
          ${reason ? `
          <div style="margin: 20px 0; padding: 16px; background: #fef2f2; border-radius: 12px; border-left: 4px solid #EF4444;">
            <p style="color: #991B1B; font-size: 14px; margin: 0 0 4px 0; font-weight: bold;">Raison :</p>
            <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">${reason}</p>
          </div>
          ` : ""}
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Vous pouvez compléter ou mettre à jour votre profil, puis soumettre à nouveau une demande.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/dashboard/profile"
               style="display: inline-block; background: #2D5016; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Mettre à jour mon profil
            </a>
          </div>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Garden of Alliance — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}