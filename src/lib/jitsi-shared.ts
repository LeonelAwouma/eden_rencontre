// Constante partagée serveur/navigateur pour les visioconférences Jitsi.
// (lib/jitsi.ts signe les jetons avec `node:crypto` : il ne doit jamais être
//  importé par un composant client.)

/** Préfixe de `meets.space_name` qui identifie une salle Jitsi ; les anciennes réunions Google Meet ne l'ont pas. */
export const JITSI_SPACE_PREFIX = "jitsi:";
