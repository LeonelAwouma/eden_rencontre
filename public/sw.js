/*
 * Garden of Alliance — service worker des notifications push.
 * Il ne met rien en cache et n'intercepte aucune requête : il affiche les
 * notifications reçues (même site fermé) et ouvre la bonne page au toucher.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Garden of Alliance";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Un onglet du site déjà ouvert : on le réutilise.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});

// Abonnement renouvelé par le navigateur : on prévient le site à la prochaine visite
// (l'application revérifie l'abonnement à chaque ouverture du tableau de bord).
self.addEventListener("pushsubscriptionchange", () => {});
