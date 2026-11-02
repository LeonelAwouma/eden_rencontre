/** Partagé entre le parcours classique (register/page.tsx) et Google (onboarding/complete-registration/page.tsx). */
export type RegistrationMode = "classic" | "google";

/**
 * Données collectées pendant les 3 étapes. birthDate reste en ISO (AAAA-MM-JJ)
 * de bout en bout — seul BirthDateInput l'affiche au format JJ/MM/AAAA.
 * discoverySource et marriageVision ont été retirés : ils se renseignent
 * désormais depuis /dashboard/profile, après l'inscription.
 */
export interface RegistrationFormData {
  pseudo: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  civilStatus: string;
  region: string;
  country: string;
  city: string;
  phoneIso: string;
  phoneLocal: string;
  charterAuthorizeVerification: boolean;
  charterCommitRespectful: boolean;
  charterAcceptFull: boolean;
}

export const INITIAL_REGISTRATION_FORM_DATA: RegistrationFormData = {
  pseudo: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  gender: "",
  birthDate: "",
  civilStatus: "",
  region: "",
  country: "",
  city: "",
  phoneIso: "CM",
  phoneLocal: "",
  charterAuthorizeVerification: false,
  charterCommitRespectful: false,
  charterAcceptFull: false,
};
