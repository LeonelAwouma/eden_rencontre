"use client";

// Notifications push — côté navigateur / téléphone.
// Activation : service worker /sw.js + abonnement push enregistré via /api/push/subscribe.

import { supabase } from "@/lib/supabase";

export type PushState =
  | "unsupported"     // navigateur sans notifications push
  | "ios-install"     // iPhone / iPad : ajouter d'abord le site à l'écran d'accueil
  | "unconfigured"    // clé publique absente (serveur pas encore configuré)
  | "denied"          // refusé dans les réglages du navigateur
  | "off"             // possible, pas encore activé
  | "on";             // activé sur cet appareil

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (!PUBLIC_KEY) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/**
 * Active les notifications sur cet appareil. À appeler depuis un clic (le
 * navigateur n'affiche la demande d'autorisation qu'en réponse à un geste).
 */
export async function enablePush(locale: string): Promise<{ ok: boolean; state: PushState; error?: string }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, state: permission === "denied" ? "denied" : "off" };

  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) as BufferSource,
    });
  }
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ subscription: sub.toJSON(), locale: locale === "en" ? "en" : "fr", test: true }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, state: "off", error: data.error };
  }
  return { ok: true, state: "on" };
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe();
}

/**
 * À chaque ouverture : si l'appareil est abonné, on renvoie l'abonnement au
 * serveur (le navigateur peut le renouveler, et la langue peut avoir changé).
 */
export async function refreshPushSubscription(locale: string): Promise<void> {
  try {
    if (!("serviceWorker" in navigator) || !PUBLIC_KEY || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ subscription: sub.toJSON(), locale: locale === "en" ? "en" : "fr" }),
    });
  } catch { /* hors ligne : on réessaiera à la prochaine ouverture */ }
}

// ── Appareils et confidentialité ────────────────────────────

export interface PushDevice {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Nom et texte du message visibles sur l'écran verrouillé de cet appareil. */
  showPreview: boolean;
  /** L'appareil sur lequel la page est ouverte. */
  current: boolean;
}

async function currentEndpoint(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration("/");
    return (await reg?.pushManager.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

/** Appareils abonnés du membre connecté (l'adresse d'abonnement n'est jamais renvoyée par le serveur). */
export async function listPushDevices(): Promise<PushDevice[]> {
  const headers = await authHeaders();
  const endpoint = await currentEndpoint();
  if (endpoint) headers["x-push-endpoint"] = endpoint;
  const res = await fetch("/api/push/subscribe", { headers, cache: "no-store" });
  if (!res.ok) throw new Error("devices");
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.devices) ? data.devices : [];
}

/** Retire un appareil (y compris un autre téléphone du membre, perdu ou remplacé). */
export async function removePushDevice(id: string): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ id }) });
  return res.ok;
}

/** Aperçu du message sur l'écran verrouillé de CET appareil. */
export async function setPushPreview(showPreview: boolean): Promise<{ ok: boolean; error?: string }> {
  const endpoint = await currentEndpoint();
  if (!endpoint) return { ok: false };
  const res = await fetch("/api/push/subscribe", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ endpoint, showPreview }) });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error };
}

// ── Dialogue avec le service worker ─────────────────────────

/**
 * - « query-active-conv » : le service worker demande si cette fenêtre affiche une conversation
 *   (pour ne pas alerter un membre qui lit déjà le message). Réponse sur le port fourni.
 * - « open-url » : notification touchée alors que le tableau de bord est déjà ouvert.
 * Retourne la fonction de nettoyage.
 */
export function listenToServiceWorker(handlers: {
  activeConversation: () => string | null;
  onOpenUrl: (url: string) => void;
}): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const onMessage = (e: MessageEvent) => {
    const msg = e.data as { type?: string; url?: string } | null;
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "query-active-conv") {
      e.ports?.[0]?.postMessage({
        conversationId: handlers.activeConversation(),
        visible: document.visibilityState === "visible" && document.hasFocus(),
      });
    } else if (msg.type === "open-url" && typeof msg.url === "string" && msg.url.startsWith("/") && !msg.url.startsWith("//")) {
      handlers.onOpenUrl(msg.url);
    }
  };
  navigator.serviceWorker.addEventListener("message", onMessage);
  navigator.serviceWorker.startMessages?.();
  return () => navigator.serviceWorker.removeEventListener("message", onMessage);
}

/** Efface la pastille de l'icône (PWA installée) quand le membre ouvre ses messages. */
export function clearAppBadge(): void {
  try {
    (navigator as unknown as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
  } catch { /* non pris en charge */ }
}
