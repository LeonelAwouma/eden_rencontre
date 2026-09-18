/**
 * Traduit un échec de `getUserMedia` en clé de message i18n.
 *
 * Un `catch` indifférencié renvoyait « autorisez l'accès » dans tous les cas —
 * y compris quand la caméra est absente, déjà occupée par une autre
 * application, ou quand la page est servie en HTTP : hors contexte sécurisé
 * `navigator.mediaDevices` est `undefined` et l'appel lève un TypeError, ce qui
 * envoyait l'utilisateur chercher une autorisation qui n'existe pas.
 */
export function cameraErrorKey(err: unknown): string {
  if (typeof window !== "undefined" && (!navigator.mediaDevices || !window.isSecureContext)) {
    return "camera.insecure";
  }

  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "camera.denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "camera.notFound";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "camera.busy";
    default:
      return "camera.error";
  }
}
