// Lecteur intégré (YouTube / Vimeo) de la médiathèque — partagé entre la page publique et l'espace Coach.
// L'identifiant est extrait par expression régulière PUIS l'hôte de l'URL d'origine est revérifié contre une
// liste blanche : une adresse qui contiendrait la chaîne « youtube.com » ailleurs que dans son hôte (ex. dans
// un paramètre de requête d'un autre domaine) n'est jamais acceptée.

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export type ResourceEmbed = { type: "youtube" | "vimeo"; embedUrl: string };

export function extractEmbedUrl(url: string | null | undefined): ResourceEmbed | null {
  if (!url) return null;
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }

  if (YOUTUBE_HOSTS.has(host)) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,20})/);
    if (m) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${m[1]}` };
  }
  if (VIMEO_HOSTS.has(host)) {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
    if (m) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${m[1]}` };
  }
  return null;
}
