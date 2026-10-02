// ── Gabarits des e-mails Garden of Alliance ─────────────────────
// Mise en page volontairement sobre : logo → message → bouton → signature →
// pied de page. Tableaux et styles en ligne pour Outlook, Gmail et Apple Mail.
// Chaque gabarit renvoie { subject, html, text } ; l'envoi se fait dans email.ts.
//
// Toute valeur venant d'un utilisateur ou d'un admin (nom, motif, titre de
// rendez-vous…) passe par esc() avant d'entrer dans le HTML.

export const CONTACT_EMAIL = "contact@gardenofalliance.com";
/** Identifiant de la pièce jointe inline du logo (voir email.ts). */
export const LOGO_CID = "logo@gardenofalliance.com";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "https://gardenofalliance.com";
const siteLabel = () => appUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/* ─────────────────────────── Palette ─────────────────────────── */

const C = {
  page: "#F7F5F0",
  white: "#FFFFFF",
  border: "#E4E1D9",
  green: "#486B46",
  greenDark: "#2E4A36",
  heading: "#1E2621",
  text: "#333A36",
  muted: "#6E746F",
  box: "#F4F3EF",
  danger: "#A4332A",
};

// Serif réservée au logo ; tout le contenu est en police système.
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ─────────────────────────── Utilitaires ─────────────────────────── */

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Version texte brut, pour les clients sans HTML et les filtres anti-spam. */
function toText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<div[^>]*display:none[\s\S]*?<\/div>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const l = label.replace(/<[^>]+>/g, "").trim();
      return href.startsWith("mailto:") || l === href || href.endsWith(l) ? l : `${l} : ${href}`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|tr|table|div)>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ─────────────────────────── Composants ─────────────────────────── */

/** Paragraphe. `html` doit déjà être échappé. */
const p = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:24px;color:${C.text};">${html}</p>`;

const b = (html: string) => `<strong style="color:${C.heading};">${html}</strong>`;

const link = (href: string, label: string) =>
  `<a href="${esc(href)}" style="color:${C.green};text-decoration:underline;">${label}</a>`;

const greeting = (name?: string) => p(name ? `Bonjour ${esc(name)},` : "Bonjour,");

const replyLine = (lead = "Si vous avez une question") =>
  p(`${lead}, vous pouvez simplement répondre à cet e-mail.`);

/** Bouton classique, cliquable partout (y compris Outlook). */
function button(href: string, label: string) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td bgcolor="${C.green}" style="background:${C.green};border-radius:6px;">
      <a href="${esc(href)}" target="_blank"
         style="display:inline-block;padding:12px 26px;font-family:${SANS};font-size:15px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:6px;">
        ${esc(label)}
      </a>
    </td>
  </tr>
</table>`;
}

/** Encadré neutre (motif, message de l'équipe…). `body` doit déjà être échappé. */
function note(title: string, body: string, tone: "neutral" | "danger" = "neutral") {
  const edge = tone === "danger" ? C.danger : "#C9C5BA";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  <tr>
    <td style="background:${C.box};border-left:3px solid ${edge};padding:12px 16px;">
      <p style="margin:0 0 2px;font-family:${SANS};font-size:13px;line-height:20px;font-weight:600;color:${C.heading};">${esc(title)}</p>
      <p style="margin:0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.text};">${body}</p>
    </td>
  </tr>
</table>`;
}

/** Informations de rendez-vous, en lignes libellé / valeur. */
function details(rows: [string, string][]) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:${C.box};">
  ${rows.map(([label, value], i) => `
  <tr>
    <td width="110" valign="top" style="padding:${i === 0 ? "14px" : "8px"} 12px ${i === rows.length - 1 ? "14px" : "8px"} 16px;font-family:${SANS};font-size:14px;line-height:20px;color:${C.muted};">${esc(label)}</td>
    <td valign="top" style="padding:${i === 0 ? "14px" : "8px"} 16px ${i === rows.length - 1 ? "14px" : "8px"} 0;font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:${C.heading};">${esc(value)}</td>
  </tr>`).join("")}
</table>`;
}

/** Code de vérification lisible d'un coup d'œil. */
function code(value: string) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
  <tr>
    <td style="background:${C.box};border:1px solid ${C.border};border-radius:6px;padding:14px 22px;">
      <span style="font-family:'Courier New', Courier, monospace;font-size:30px;line-height:36px;font-weight:bold;letter-spacing:8px;color:${C.heading};">${esc(value)}</span>
    </td>
  </tr>
</table>`;
}

const fine = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">${html}</p>`;

/* ─────────────────────────── Mise en page ─────────────────────────── */

interface LayoutOptions {
  /** Aperçu affiché par la messagerie à côté du sujet. */
  preheader: string;
  title: string;
  body: string;
  /** Raison d'envoi affichée en pied de page (HTML déjà échappé). Par défaut : compte membre. */
  footer?: string;
}

function layout({ preheader, title, body, footer }: LayoutOptions): string {
  const url = appUrl();
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<style>
  body { margin:0; padding:0; }
  @media (max-width: 620px) {
    .container { width:100% !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:28px 12px 32px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0"
               bgcolor="${C.white}" style="width:600px;max-width:600px;background:${C.white};border:1px solid ${C.border};">

          <!-- Logo -->
          <tr>
            <td class="pad" align="center" style="padding:26px 40px 22px;border-bottom:1px solid ${C.border};">
              <img src="cid:${LOGO_CID}" width="40" height="34" alt="" style="display:block;border:0;width:40px;height:34px;margin:0 auto 6px;">
              <span style="font-family:${SERIF};font-size:20px;line-height:26px;color:${C.greenDark};">Garden <em>of Alliance</em></span>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td class="pad" style="padding:34px 40px 30px;">
              <h1 style="margin:0 0 22px;font-family:${SANS};font-size:22px;line-height:30px;font-weight:600;color:${C.heading};">${esc(title)}</h1>
              ${body}
              <p style="margin:8px 0 0;font-family:${SANS};font-size:15px;line-height:24px;color:${C.text};">
                Bien cordialement,<br>
                <strong style="color:${C.heading};">L'équipe Garden of Alliance</strong>
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td class="pad" style="padding:18px 40px 22px;border-top:1px solid ${C.border};">
              <p style="margin:0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.muted};">
                <a href="${esc(url)}" style="color:${C.muted};text-decoration:underline;">${esc(siteLabel())}</a><br>
                ${footer ?? "Vous recevez cet e-mail car vous avez un compte sur Garden of Alliance."}<br>
                © ${year} Garden of Alliance
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function render(subject: string, opts: LayoutOptions): RenderedEmail {
  const html = layout(opts);
  return { subject, html, text: toText(html) };
}

/* ─────────────────────────── Dates ─────────────────────────── */

function formatMeeting(date: Date, minutes: number) {
  const d = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const t = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const duration = minutes >= 60
    ? `${Math.floor(minutes / 60)} h${minutes % 60 > 0 ? ` ${String(minutes % 60).padStart(2, "0")}` : ""}`
    : `${minutes} minutes`;
  return { date: d.charAt(0).toUpperCase() + d.slice(1), time: t, duration };
}

const meetButton = (meetLink: string) =>
  button(meetLink, "Rejoindre la visioconférence") +
  fine(`Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${link(meetLink, esc(meetLink))}`);

/* ─────────────────────────── Gabarits ─────────────────────────── */

export function registrationReceivedEmail(name: string): RenderedEmail {
  return render("Nous avons bien reçu votre inscription — Garden of Alliance", {
    preheader: "Notre équipe vérifie votre profil. Nous vous écrirons dès qu'il sera validé.",
    title: "Nous avons bien reçu votre inscription",
    body:
      greeting(name) +
      p("Merci de votre inscription sur Garden of Alliance. Notre équipe vérifie actuellement votre profil : cette étape nous permet de garantir la sécurité de chacun au sein de la communauté.") +
      p("Vous recevrez un e-mail dès que votre compte sera validé.") +
      p(`En attendant, vous pouvez prendre connaissance de notre ${link(`${appUrl()}/charte`, "charte éthique")}.`) +
      replyLine(),
  });
}

/** E-mail de test envoyé depuis Admin → Paramètres. */
export function testEmail(): RenderedEmail {
  return render("Test d'envoi — Garden of Alliance", {
    preheader: "Les e-mails de la plateforme partent correctement.",
    title: "Les e-mails fonctionnent",
    body: p("Cet e-mail de test confirme que la plateforme peut envoyer des e-mails : les membres recevront bien les confirmations d'inscription, de validation et de vérification."),
  });
}

export function accountApprovedEmail(name: string): RenderedEmail {
  return render("Votre profil est maintenant actif — Garden of Alliance", {
    preheader: "Votre profil a été validé : vous pouvez maintenant accéder à votre compte.",
    title: "Votre profil est maintenant actif",
    body:
      greeting(name) +
      p("Nous avons terminé la vérification de votre inscription. Votre profil Garden of Alliance a été validé et vous pouvez maintenant accéder à votre compte.") +
      button(`${appUrl()}/login`, "Accéder à Garden of Alliance") +
      replyLine("Si vous n'êtes pas à l'origine de cette inscription ou si vous avez une question"),
  });
}

export function accountRejectedEmail(name: string, reason?: string): RenderedEmail {
  return render("Votre demande d'inscription — Garden of Alliance", {
    preheader: "Réponse à votre demande d'inscription sur Garden of Alliance.",
    title: "Votre demande d'inscription",
    body:
      greeting(name) +
      p("Merci pour l'intérêt que vous portez à Garden of Alliance. Après examen de votre dossier, nous ne sommes pas en mesure de valider votre inscription pour le moment.") +
      (reason ? note("Motif", esc(reason), "danger") : "") +
      p("Si vous pensez qu'il s'agit d'une erreur, répondez simplement à cet e-mail : nous relirons votre dossier."),
  });
}

export function otpEmail(otp: string): RenderedEmail {
  return render("Votre code de vérification — Garden of Alliance", {
    preheader: `Votre code : ${otp}. Il est valable 10 minutes.`,
    title: "Votre code de vérification",
    body:
      greeting() +
      p("Voici le code qui vous permettra de réinitialiser votre mot de passe :") +
      code(otp) +
      p(`Ce code est valable ${b("10 minutes")}. Ne le communiquez à personne : notre équipe ne vous le demandera jamais.`) +
      p("Si vous n'avez pas demandé à changer votre mot de passe, vous pouvez ignorer cet e-mail ; votre mot de passe ne sera pas modifié."),
  });
}

export function passwordResetSuccessEmail(name?: string): RenderedEmail {
  return render("Votre mot de passe a été modifié — Garden of Alliance", {
    preheader: "Le mot de passe de votre compte vient d'être modifié.",
    title: "Votre mot de passe a été modifié",
    body:
      greeting(name) +
      p("Le mot de passe de votre compte Garden of Alliance vient d'être modifié. Vous pouvez dès maintenant vous connecter avec votre nouveau mot de passe.") +
      button(`${appUrl()}/login`, "Se connecter") +
      p(`${b("Vous n'êtes pas à l'origine de ce changement ?")} Répondez immédiatement à cet e-mail afin que nous puissions sécuriser votre compte.`),
  });
}

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

export function meetInvitationEmail(params: MeetInvitationEmailParams): RenderedEmail {
  const { userName, meetingTitle, meetingDescription, meetingDate, duration, meetLink, meetingCode, adminMessage } = params;
  const f = formatMeeting(meetingDate, duration);
  const rows: [string, string][] = [["Réunion", meetingTitle], ["Date", f.date], ["Heure", f.time], ["Durée", f.duration]];
  if (meetingCode) rows.push(["Code", meetingCode]);
  return render(`Invitation : ${meetingTitle} — Garden of Alliance`, {
    preheader: `${f.date} à ${f.time}.`,
    title: "Vous êtes invité(e) à une réunion",
    body:
      greeting(userName) +
      p(meetingDescription ? esc(meetingDescription) : "Vous êtes invité(e) à une réunion en visioconférence avec l'équipe Garden of Alliance.") +
      details(rows) +
      (adminMessage ? note("Message de l'équipe", esc(adminMessage)) : "") +
      (meetLink
        ? meetButton(meetLink) + fine("Connectez-vous à votre compte Garden of Alliance pour accéder à la salle.")
        : p("Le lien de la réunion n'a pas pu être généré. Répondez à cet e-mail et nous vous l'enverrons.")),
  });
}

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

export function meetingInvitationEmail(params: MeetingInvitationEmailParams): RenderedEmail {
  const { userName, meetingTitle, meetingDescription, meetingDate, durationMinutes, meetLink, otherUserName } = params;
  const f = formatMeeting(meetingDate, durationMinutes);
  return render(`Votre rendez-vous vidéo avec ${otherUserName} — Garden of Alliance`, {
    preheader: `${f.date} à ${f.time}.`,
    title: `Votre rendez-vous vidéo avec ${otherUserName}`,
    body:
      greeting(userName) +
      p(`Un rendez-vous vidéo a été organisé entre vous et ${b(esc(otherUserName))}.${meetingDescription ? ` ${esc(meetingDescription)}` : ""}`) +
      details([["Rendez-vous", meetingTitle], ["Date", f.date], ["Heure", f.time], ["Durée", f.duration]]) +
      (meetLink
        ? meetButton(meetLink)
        : p("Le lien de la visioconférence n'est pas encore disponible. Il vous sera envoyé avant le rendez-vous.")) +
      replyLine(),
  });
}

export function meetingRescheduledEmail(params: MeetingInvitationEmailParams): RenderedEmail {
  const { userName, meetingTitle, meetingDate, durationMinutes, meetLink, otherUserName } = params;
  const f = formatMeeting(meetingDate, durationMinutes);
  return render(`Votre rendez-vous a été déplacé — Garden of Alliance`, {
    preheader: `Nouvelle date : ${f.date} à ${f.time}.`,
    title: "Votre rendez-vous a été déplacé",
    body:
      greeting(userName) +
      p(`Votre rendez-vous vidéo avec ${b(esc(otherUserName))} a été déplacé. Voici la nouvelle date :`) +
      details([["Rendez-vous", meetingTitle], ["Date", f.date], ["Heure", f.time], ["Durée", f.duration]]) +
      (meetLink ? meetButton(meetLink) : "") +
      replyLine("Si ce nouvel horaire ne vous convient pas"),
  });
}

export function meetingCancelledEmail(userName: string, meetingTitle: string, otherUserName: string, reason?: string): RenderedEmail {
  return render(`Votre rendez-vous a été annulé — Garden of Alliance`, {
    preheader: `Le rendez-vous « ${meetingTitle} » a été annulé.`,
    title: "Votre rendez-vous a été annulé",
    body:
      greeting(userName) +
      p(`Votre rendez-vous vidéo « ${esc(meetingTitle)} » avec ${b(esc(otherUserName))} a été annulé.`) +
      (reason ? note("Raison", esc(reason)) : "") +
      p(`Vous pouvez en planifier un nouveau depuis ${link(`${appUrl()}/dashboard`, "votre espace")}.`),
  });
}

export function accountSuspendedEmail(name: string, reason?: string): RenderedEmail {
  return render("Votre compte est temporairement suspendu — Garden of Alliance", {
    preheader: "Votre compte Garden of Alliance a été temporairement suspendu.",
    title: "Votre compte est temporairement suspendu",
    body:
      greeting(name) +
      p("Nous vous informons que votre compte Garden of Alliance a été temporairement suspendu.") +
      (reason ? note("Motif", esc(reason), "danger") : "") +
      replyLine("Pour toute question ou pour nous apporter des précisions"),
  });
}

/** `auto` : badge attribué automatiquement (profil et questionnaire complets), et non par l'équipe. */
export function verificationApprovedEmail(name: string, auto = false): RenderedEmail {
  return render("Votre profil est vérifié — Garden of Alliance", {
    preheader: "Le badge « Profil vérifié » est maintenant visible sur votre profil.",
    title: "Votre profil est vérifié",
    body:
      greeting(name) +
      p(auto
        ? "Votre profil et votre questionnaire sont maintenant complets : le badge « Profil vérifié » vous est attribué. Il est désormais visible par les autres membres, ce qui leur permet d'échanger avec vous en confiance."
        : "Notre équipe a vérifié votre profil. Le badge « Profil vérifié » est désormais visible par les autres membres, ce qui leur permet d'échanger avec vous en confiance.") +
      button(`${appUrl()}/dashboard`, "Accéder à Garden of Alliance"),
  });
}

export function verificationRejectedEmail(name: string, reason?: string): RenderedEmail {
  return render("Vérification de votre profil — Garden of Alliance", {
    preheader: "Réponse à votre demande de vérification de profil.",
    title: "Vérification de votre profil",
    body:
      greeting(name) +
      p("Nous avons examiné votre demande de vérification, mais nous ne pouvons pas la valider pour le moment.") +
      (reason ? note("Raison", esc(reason), "danger") : "") +
      p("Vous pouvez compléter ou mettre à jour votre profil, puis soumettre une nouvelle demande.") +
      button(`${appUrl()}/dashboard/profile`, "Mettre à jour mon profil") +
      replyLine(),
  });
}

/* ─────────────────────────── Newsletter du blog ─────────────────────────── */

const newsletterFooter = (unsubscribeUrl: string) =>
  `Vous recevez cet e-mail car vous êtes abonné(e) à la newsletter de Garden of Alliance.<br>` +
  `<a href="${esc(unsubscribeUrl)}" style="color:${C.muted};text-decoration:underline;">Se désabonner</a>`;

export function newsletterWelcomeEmail(unsubscribeUrl: string): RenderedEmail {
  return render("Bienvenue dans la newsletter — Garden of Alliance", {
    preheader: "Vous recevrez nos prochains articles directement dans votre boîte mail.",
    title: "Merci pour votre abonnement",
    body:
      greeting() +
      p("Votre inscription à la newsletter de Garden of Alliance est confirmée. Vous recevrez nos prochains articles, conseils et méditations directement dans votre boîte mail.") +
      button(`${appUrl()}/blog`, "Découvrir le blog") +
      p("Si vous n'êtes pas à l'origine de cette inscription, utilisez le lien de désabonnement en bas de cet e-mail."),
    footer: newsletterFooter(unsubscribeUrl),
  });
}

export interface BlogPostNewsletterParams {
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  author?: string | null;
  postUrl: string;
  unsubscribeUrl: string;
}

export function blogPostNewsletterEmail(params: BlogPostNewsletterParams): RenderedEmail {
  const { title, excerpt, coverImageUrl, author, postUrl, unsubscribeUrl } = params;
  const cover = coverImageUrl
    ? `<a href="${esc(postUrl)}" target="_blank"><img src="${esc(coverImageUrl)}" width="520" alt="" style="display:block;width:100%;max-width:520px;height:auto;border:0;margin:0 0 20px;border-radius:6px;"></a>`
    : "";
  return render(`${title} — Garden of Alliance`, {
    preheader: excerpt || "Un nouvel article vient d'être publié sur le blog.",
    title,
    body:
      cover +
      (author ? fine(`Par ${esc(author)}`) : "") +
      p(excerpt ? esc(excerpt) : "Un nouvel article vient d'être publié sur le blog de Garden of Alliance.") +
      button(postUrl, "Lire l'article"),
    footer: newsletterFooter(unsubscribeUrl),
  });
}
