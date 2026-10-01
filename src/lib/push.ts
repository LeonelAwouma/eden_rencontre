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
