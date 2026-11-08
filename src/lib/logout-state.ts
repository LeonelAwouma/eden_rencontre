/**
 * État de déconnexion partagé par les modules navigateur (mémoire de l'onglet courant, jamais persistant).
 * Une fois la déconnexion commencée, plus aucune synchronisation de cookie n'est lancée.
 */
let loggingOut = false;

export const markLoggingOut = (): void => { loggingOut = true; };
export const isLoggingOut = (): boolean => loggingOut;
/** Réservé aux tests et à la reconnexion dans le même onglet. */
export const resetLoggingOut = (): void => { loggingOut = false; };
