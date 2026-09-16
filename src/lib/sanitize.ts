import DOMPurify from "dompurify";

/**
 * Assainit du HTML avant un rendu via dangerouslySetInnerHTML.
 *
 * Le contenu d'article est du HTML stocké : sans filtrage, un <script> ou un
 * gestionnaire onerror injecté serait exécuté chez chaque visiteur (XSS stocké).
 *
 * Rendu côté client uniquement (les pages concernées chargent le contenu en
 * useEffect) : hors navigateur, on renvoie une chaîne vide plutôt que du HTML
 * non filtré.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}
