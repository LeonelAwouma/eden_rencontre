/**
 * Codes pays ISO 3166-1 alpha-2 officiellement attribués (249), plus XK (Kosovo, code utilisateur
 * reconnu par la plupart des référentiels, dont Natural Earth). Sert à classer un `member_locations.country_code` :
 * code de cette liste = pays ; sinon (ZZ, XX, faute de saisie…) = « pays indéterminé », jamais un pays arbitraire.
 */
const CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO " +
  "JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR " +
  "MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO " +
  "RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV " +
  "TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK";

export const ISO_COUNTRY_CODES: ReadonlySet<string> = new Set(CODES.split(" "));

export function isIsoCountry(code: string | null | undefined): code is string {
  return typeof code === "string" && ISO_COUNTRY_CODES.has(code);
}

let displayNames: Intl.DisplayNames | null | undefined;

/** Nom français du pays (Intl), sinon le nom fourni, sinon le code. */
export function countryNameFr(code: string, fallback?: string | null): string {
  if (displayNames === undefined) {
    try { displayNames = new Intl.DisplayNames(["fr"], { type: "region" }); } catch { displayNames = null; }
  }
  const n = code === "XK" ? "Kosovo" : displayNames?.of(code);
  return n && n !== code ? n : fallback || code;
}
