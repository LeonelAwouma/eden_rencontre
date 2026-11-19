/*
 * Garden of Alliance — service worker des notifications push.
 * Il ne met rien en cache et n'intercepte aucune requête : il affiche les
 * notifications reçues (même site fermé, téléphone verrouillé) et ouvre la
 * bonne page au toucher.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Safari (macOS, iPhone, iPad) retire l'abonnement si un push n'affiche aucune notification.
const ua = (self.navigator && self.navigator.userAgent) || "";
const IS_SAFARI = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|Edg\/|Android/.test(ua);

/**
 * Le membre lit-il déjà cette conversation, dans une fenêtre visible ?
 * Chaque fenêtre visible du site répond via un MessageChannel (src/lib/push.ts, listenToServiceWorker).
 * Sans réponse sous 300 ms, ou au moindre doute : non → la notification s'affiche.
 */
async function isConversationOpen(conversationId) {
  if (!conversationId) return false;
  try {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visible = windows.filter((c) => c.visibilityState === "visible");
    if (!visible.length) return false;
    const answers = await Promise.all(visible.map((client) => new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(false), 300);
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        resolve(!!(e.data && e.data.visible && e.data.conversationId === conversationId));
      };
      try {
        client.postMessage({ type: "query-active-conv" }, [channel.port2]);
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    })));
    return answers.some(Boolean);
  } catch {
    return false;
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Garden of Alliance";
  event.waitUntil(
    (async () => {
      const open = data.kind === "message" && (await isConversationOpen(data.conversationId));
      // Conversation déjà à l'écran : Chrome, Edge, Firefox n'exigent pas d'alerte quand une page du site est
      // visible ; Safari l'exige, on l'affiche donc sans son ni vibration.
      if (open && !IS_SAFARI) return;

      if (data.kind === "message" && self.navigator && "setAppBadge" in self.navigator) {
        try { await self.navigator.setAppBadge(); } catch { /* pastille non prise en charge */ }
      }
      await self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icon.png",
        badge: "/icon.png",
        tag: data.tag || undefined,
        renotify: !!data.tag && !open,
        silent: open,
        data: { url: data.url || "/dashboard" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const ours = windows.filter((c) => new URL(c.url).origin === self.location.origin);
      // Une fenêtre déjà sur le tableau de bord : elle ouvre la conversation sans se recharger.
      const dashboard = ours.find((c) => new URL(c.url).pathname === "/dashboard");
      if (dashboard) {
        dashboard.postMessage({ type: "open-url", url: target.pathname + target.search });
        if ("focus" in dashboard) await dashboard.focus().catch(() => {});
        return;
      }
      // Une autre page du site : on la réutilise (navigate n'est permis que sur une fenêtre contrôlée).
      for (const client of ours) {
        if ("navigate" in client && "focus" in client) {
          try {
            const moved = await client.navigate(target.href);
            await (moved || client).focus();
            return;
          } catch { /* fenêtre non contrôlée : on ouvre une nouvelle fenêtre */ }
        }
      }
      await self.clients.openWindow(target.href);
    })()
  );
});

// Le navigateur renouvelle l'abonnement en arrière-plan : on transmet le nouveau au serveur,
// qui remplace l'ancien (prouvé par son endpoint). Sans ancien abonnement connu, la page le
// renverra à la prochaine ouverture (refreshPushSubscription).
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription;
      if (!old) return;
      let sub = event.newSubscription;
      if (!sub) {
        const key = old.options && old.options.applicationServerKey;
        if (!key) return;
        sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      }
      await fetch("/api/push/resubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldEndpoint: old.endpoint, subscription: sub.toJSON() }),
      });
    })().catch(() => {})
  );
});
