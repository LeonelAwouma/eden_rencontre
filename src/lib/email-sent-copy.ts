// ── Copie des e-mails envoyés dans le dossier « Envoyée » ─────────
// Le SMTP ne garde aucune trace : c'est le client de messagerie qui dépose
// une copie dans « Envoyée ». On fait de même par IMAP (imap.hostinger.com,
// mêmes identifiants que le SMTP), pour voir les envois dans le webmail.
// Jamais bloquant : un échec ici n'annule pas un e-mail déjà parti.
// Désactivable avec SAVE_SENT_COPY=false ; IMAP_HOST / IMAP_PORT surchargent.

import { ImapFlow } from "imapflow";

const DEFAULT_IMAP_HOST = "imap.hostinger.com";
const DEFAULT_IMAP_PORT = 993;
const DEFAULT_SENT_FOLDER = "INBOX.Sent"; // nom chez Hostinger si le serveur n'annonce pas \Sent
const TIMEOUT_MS = 10_000;

export async function saveToSentFolder(user: string, password: string, raw: Buffer): Promise<void> {
  if (process.env.SAVE_SENT_COPY === "false") return;

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || DEFAULT_IMAP_HOST,
    port: Number(process.env.IMAP_PORT) || DEFAULT_IMAP_PORT,
    secure: true,
    auth: { user, pass: password },
    logger: false,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  // Sans écouteur, une erreur de socket ferait tomber le processus.
  client.on("error", (err) => console.error("IMAP (copie Envoyée) :", err));

  try {
    await client.connect();
    const folders = await client.list();
    const sent = folders.find((f) => f.specialUse === "\\Sent")?.path ?? DEFAULT_SENT_FOLDER;
    await client.append(sent, raw, ["\\Seen"]);
  } catch (err) {
    console.error("Copie dans « Envoyée » impossible (l'e-mail est bien parti) :", err);
  } finally {
    await client.logout().catch(() => client.close());
  }
}
