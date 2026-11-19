// Appareils abonnés aux notifications push — utilitaires partagés (serveur et tests).

/** Libellé lisible à partir du user-agent enregistré (« iPhone · Safari », « Android · Chrome »…). */
export function deviceLabel(ua: string | null | undefined): string {
  if (!ua) return "Appareil";
  const os =
    /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac"
    : /CrOS/.test(ua) ? "Chromebook"
    : /Linux/.test(ua) ? "Linux"
    : "Appareil";
  const browser =
    /EdgA?\//.test(ua) ? "Edge"
    : /SamsungBrowser\//.test(ua) ? "Samsung Internet"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\/|FxiOS\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "";
  return browser ? `${os} · ${browser}` : os;
}

/** Validation commune d'un abonnement reçu du navigateur (PushSubscriptionJSON). */
export function parseSubscription(sub: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  const s = sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = typeof s?.endpoint === "string" ? s.endpoint : "";
  const p256dh = s?.keys?.p256dh;
  const auth = s?.keys?.auth;
  if (!endpoint.startsWith("https://") || endpoint.length > 1000) return null;
  if (typeof p256dh !== "string" || typeof auth !== "string" || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}
