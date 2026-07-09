// ── Email Service for Eden Rencontre ─────────────────────────
// Uses Resend API for sending emails.
// Configure RESEND_API_KEY in .env.local

const FROM_EMAIL = "Eden Rencontre <leonelawouma65@gmail.com>";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    // Use Resend API
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Resend API error:", res.status, errText);
      }
      return res.ok;
    } catch (err) {
      console.error("Email send error (Resend):", err);
      return false;
    }
  }

  // Fallback: log to console (development)
  console.log("═══════════════════════════════════════════");
  console.log("📧 EMAIL (no RESEND_API_KEY configured)");
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
    subject: "Inscription reçue — Eden Rencontre",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Eden <em>Rencontre</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Merci de votre inscription sur <strong>Eden Rencontre</strong>.
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
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://edenrencontre.com"}/charte" style="color: #2D5016;">Charte Éthique</a>.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Eden Rencontre — L'alliance bénie commence par une rencontre vraie.
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edenrencontre.com";
  return sendEmail({
    to: email,
    subject: "Votre compte a été approuvé — Eden Rencontre",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Eden <em>Rencontre</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Félicitations ${name} ! 🎉</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Après examen de votre dossier, nous avons le plaisir de vous informer que
            <strong>votre profil a été validé</strong>.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Vous pouvez désormais accéder à la plateforme Eden Rencontre et commencer
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
          © ${new Date().getFullYear()} Eden Rencontre — L'alliance bénie commence par une rencontre vraie.
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
    subject: "Votre demande d'inscription — Eden Rencontre",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Eden <em>Rencontre</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Nous vous remercions pour votre intérêt envers <strong>Eden Rencontre</strong>.
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
            à l'adresse <a href="mailto:leonelawouma65@gmail.com" style="color: #2D5016;">leonelawouma65@gmail.com</a>.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Eden Rencontre — L'alliance bénie commence par une rencontre vraie.
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
    subject: "Suspension de votre compte — Eden Rencontre",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #FAF8F3;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; font-size: 28px; margin: 0;">Eden <em>Rencontre</em></h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 40px; border: 1px solid #e8e4db;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-top: 0;">Bonjour ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Nous vous informons que votre compte sur <strong>Eden Rencontre</strong> a été temporairement suspendu.
          </p>
          ${reason ? `
          <div style="margin: 20px 0; padding: 20px; background: #fff3cd; border-radius: 12px; border-left: 4px solid #ffc107;">
            <p style="color: #856404; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">Motif :</p>
            <p style="color: #555; font-size: 14px; margin: 0;">${reason}</p>
          </div>
          ` : ""}
          <p style="color: #555; font-size: 16px; line-height: 1.7;">
            Pour toute question, contactez-nous à
            <a href="mailto:leonelawouma65@gmail.com" style="color: #2D5016;">leonelawouma65@gmail.com</a>.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
          © ${new Date().getFullYear()} Eden Rencontre — L'alliance bénie commence par une rencontre vraie.
        </p>
      </div>
    `,
  });
}