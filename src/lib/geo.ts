/**
 * Pays, indicatifs téléphoniques et villes des formulaires d'inscription
 * (/register et /onboarding/complete-registration).
 *
 * `name` est la valeur ENREGISTRÉE dans profiles.country : les noms déjà
 * utilisés (« RD Congo », « Congo-Brazzaville », « USA », « Royaume-Uni »…)
 * ne doivent pas changer, sinon les profils existants ne correspondraient
 * plus. `nameEn` ne sert qu'à l'affichage en anglais et à la recherche.
 * Les villes restent un choix guidé : le membre peut toujours saisir la sienne.
 */

export type GeoRegion = "Afrique" | "Diaspora";

export interface GeoCountry {
  /** Valeur enregistrée (français). */
  name: string;
  nameEn: string;
  /** Code ISO 3166-1 alpha-2 (drapeau). */
  iso: string;
  /** Indicatif téléphonique international, ex. « +237 ». */
  dial: string;
  region: GeoRegion;
  cities: string[];
}

const C = (name: string, nameEn: string, iso: string, dial: string, region: GeoRegion, cities: string[]): GeoCountry =>
  ({ name, nameEn, iso, dial, region, cities });

export const COUNTRIES: GeoCountry[] = [
  // ── Afrique centrale ──
  C("Cameroun", "Cameroon", "CM", "+237", "Afrique", [
    "Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua", "Bafoussam", "Ngaoundéré", "Bertoua", "Ebolowa", "Kribi",
    "Limbé", "Buea", "Kumba", "Nkongsamba", "Edéa", "Dschang", "Foumban", "Kousséri", "Sangmélima", "Mbalmayo",
    "Bafang", "Mbouda", "Bafia", "Batouri", "Meiganga", "Tiko", "Loum", "Guider", "Yagoua", "Mokolo",
  ]),
  C("Gabon", "Gabon", "GA", "+241", "Afrique", [
    "Libreville", "Port-Gentil", "Franceville", "Oyem", "Moanda", "Mouila", "Lambaréné", "Tchibanga", "Koulamoutou", "Makokou", "Bitam", "Owendo", "Akanda",
  ]),
  C("Congo-Brazzaville", "Republic of the Congo", "CG", "+242", "Afrique", [
    "Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi", "Owando", "Ouesso", "Impfondo", "Madingou", "Sibiti", "Gamboma",
  ]),
  C("RD Congo", "DR Congo", "CD", "+243", "Afrique", [
    "Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Goma", "Kisangani", "Bukavu", "Kananga", "Kolwezi", "Likasi", "Matadi",
    "Tshikapa", "Mbandaka", "Kikwit", "Uvira", "Butembo", "Beni", "Bunia", "Kindu", "Boma", "Kalemie",
  ]),
  C("République centrafricaine", "Central African Republic", "CF", "+236", "Afrique", [
    "Bangui", "Bimbo", "Berbérati", "Carnot", "Bambari", "Bouar", "Bossangoa", "Bria",
  ]),
  C("Tchad", "Chad", "TD", "+235", "Afrique", [
    "N'Djaména", "Moundou", "Abéché", "Sarh", "Kélo", "Koumra", "Pala", "Am Timan", "Bongor", "Mongo",
  ]),
  C("Guinée équatoriale", "Equatorial Guinea", "GQ", "+240", "Afrique", ["Malabo", "Bata", "Ebebiyín", "Mongomo", "Aconibe"]),
  C("Sao Tomé-et-Principe", "São Tomé and Príncipe", "ST", "+239", "Afrique", ["São Tomé", "Santo António", "Neves", "Trindade"]),
  C("Angola", "Angola", "AO", "+244", "Afrique", ["Luanda", "Huambo", "Lobito", "Benguela", "Lubango", "Kuito", "Malanje", "Cabinda"]),
  C("Burundi", "Burundi", "BI", "+257", "Afrique", ["Bujumbura", "Gitega", "Ngozi", "Rumonge", "Muyinga", "Kayanza"]),
  C("Rwanda", "Rwanda", "RW", "+250", "Afrique", ["Kigali", "Butare", "Gisenyi", "Ruhengeri", "Muhanga", "Byumba", "Rwamagana"]),

  // ── Afrique de l'Ouest ──
  C("Côte d'Ivoire", "Ivory Coast (Côte d'Ivoire)", "CI", "+225", "Afrique", [
    "Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo", "Daloa", "Man", "Gagnoa", "Divo", "Abengourou",
    "Anyama", "Bingerville", "Grand-Bassam", "Soubré", "Séguéla", "Odienné", "Bondoukou", "Dabou", "Agboville", "Sassandra",
  ]),
  C("Sénégal", "Senegal", "SN", "+221", "Afrique", [
    "Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Mbour", "Kaolack", "Kolda", "Touba", "Louga", "Rufisque",
    "Pikine", "Guédiawaye", "Diourbel", "Tambacounda", "Fatick", "Matam", "Kédougou", "Sédhiou", "Richard-Toll",
  ]),
  C("Mali", "Mali", "ML", "+223", "Afrique", ["Bamako", "Sikasso", "Mopti", "Koutiala", "Kayes", "Ségou", "Gao", "Tombouctou", "Kati", "San", "Kidal"]),
  C("Burkina Faso", "Burkina Faso", "BF", "+226", "Afrique", [
    "Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya", "Banfora", "Kaya", "Tenkodogo", "Fada N'Gourma", "Dédougou", "Dori",
  ]),
  C("Bénin", "Benin", "BJ", "+229", "Afrique", [
    "Cotonou", "Porto-Novo", "Parakou", "Djougou", "Abomey-Calavi", "Bohicon", "Abomey", "Natitingou", "Lokossa", "Ouidah", "Kandi",
  ]),
  C("Togo", "Togo", "TG", "+228", "Afrique", ["Lomé", "Sokodé", "Kara", "Atakpamé", "Kpalimé", "Tsévié", "Aného", "Dapaong", "Bassar", "Mango"]),
  C("Guinée", "Guinea", "GN", "+224", "Afrique", ["Conakry", "Nzérékoré", "Kankan", "Kindia", "Labé", "Boké", "Mamou", "Siguiri", "Kissidougou", "Faranah"]),
  C("Niger", "Niger", "NE", "+227", "Afrique", ["Niamey", "Zinder", "Maradi", "Agadez", "Tahoua", "Dosso", "Tillabéri", "Diffa", "Arlit"]),
  C("Mauritanie", "Mauritania", "MR", "+222", "Afrique", ["Nouakchott", "Nouadhibou", "Kiffa", "Kaédi", "Rosso", "Zouérate", "Atar"]),
  C("Guinée-Bissau", "Guinea-Bissau", "GW", "+245", "Afrique", ["Bissau", "Bafatá", "Gabú", "Bissorã", "Cacheu"]),
  C("Cap-Vert", "Cape Verde", "CV", "+238", "Afrique", ["Praia", "Mindelo", "Santa Maria", "Assomada", "Espargos"]),
  C("Gambie", "The Gambia", "GM", "+220", "Afrique", ["Banjul", "Serekunda", "Brikama", "Bakau", "Farafenni"]),
  C("Ghana", "Ghana", "GH", "+233", "Afrique", ["Accra", "Kumasi", "Tamale", "Takoradi", "Cape Coast", "Tema", "Sunyani", "Koforidua", "Ho", "Obuasi"]),
  C("Nigeria", "Nigeria", "NG", "+234", "Afrique", [
    "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu", "Onitsha", "Aba", "Jos", "Calabar", "Owerri", "Warri", "Uyo",
  ]),
  C("Liberia", "Liberia", "LR", "+231", "Afrique", ["Monrovia", "Gbarnga", "Buchanan", "Kakata", "Harper"]),
  C("Sierra Leone", "Sierra Leone", "SL", "+232", "Afrique", ["Freetown", "Bo", "Kenema", "Makeni", "Koidu"]),

  // ── Afrique de l'Est et australe ──
  C("Kenya", "Kenya", "KE", "+254", "Afrique", ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Nyeri"]),
  C("Ouganda", "Uganda", "UG", "+256", "Afrique", ["Kampala", "Entebbe", "Gulu", "Mbarara", "Jinja", "Mbale", "Lira"]),
  C("Tanzanie", "Tanzania", "TZ", "+255", "Afrique", ["Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Zanzibar", "Mbeya", "Morogoro", "Tanga"]),
  C("Éthiopie", "Ethiopia", "ET", "+251", "Afrique", ["Addis-Abeba", "Dire Dawa", "Mekele", "Gondar", "Bahir Dar", "Hawassa", "Adama", "Jimma"]),
  C("Érythrée", "Eritrea", "ER", "+291", "Afrique", ["Asmara", "Keren", "Massawa", "Assab"]),
  C("Djibouti", "Djibouti", "DJ", "+253", "Afrique", ["Djibouti", "Ali Sabieh", "Tadjourah", "Obock", "Dikhil"]),
  C("Somalie", "Somalia", "SO", "+252", "Afrique", ["Mogadiscio", "Hargeisa", "Bosaso", "Kismaayo", "Baidoa"]),
  C("Soudan", "Sudan", "SD", "+249", "Afrique", ["Khartoum", "Omdurman", "Port-Soudan", "Kassala", "El Obeid", "Wad Madani"]),
  C("Soudan du Sud", "South Sudan", "SS", "+211", "Afrique", ["Djouba", "Malakal", "Wau", "Yei", "Bor"]),
  C("Madagascar", "Madagascar", "MG", "+261", "Afrique", ["Antananarivo", "Toamasina", "Antsirabe", "Fianarantsoa", "Mahajanga", "Toliara", "Antsiranana"]),
  C("Maurice", "Mauritius", "MU", "+230", "Afrique", ["Port-Louis", "Curepipe", "Vacoas-Phoenix", "Quatre Bornes", "Rose-Hill", "Grand Baie"]),
  C("Seychelles", "Seychelles", "SC", "+248", "Afrique", ["Victoria", "Anse Boileau", "Beau Vallon"]),
  C("Comores", "Comoros", "KM", "+269", "Afrique", ["Moroni", "Mutsamudu", "Fomboni", "Domoni"]),
  C("Mozambique", "Mozambique", "MZ", "+258", "Afrique", ["Maputo", "Matola", "Beira", "Nampula", "Quelimane", "Tete", "Pemba"]),
  C("Malawi", "Malawi", "MW", "+265", "Afrique", ["Lilongwe", "Blantyre", "Mzuzu", "Zomba"]),
  C("Zambie", "Zambia", "ZM", "+260", "Afrique", ["Lusaka", "Ndola", "Kitwe", "Livingstone", "Kabwe", "Chingola"]),
  C("Zimbabwe", "Zimbabwe", "ZW", "+263", "Afrique", ["Harare", "Bulawayo", "Mutare", "Gweru", "Masvingo"]),
  C("Afrique du Sud", "South Africa", "ZA", "+27", "Afrique", ["Johannesburg", "Le Cap", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London", "Soweto"]),
  C("Namibie", "Namibia", "NA", "+264", "Afrique", ["Windhoek", "Walvis Bay", "Swakopmund", "Oshakati", "Rundu"]),
  C("Botswana", "Botswana", "BW", "+267", "Afrique", ["Gaborone", "Francistown", "Maun", "Molepolole", "Serowe"]),
  C("Lesotho", "Lesotho", "LS", "+266", "Afrique", ["Maseru", "Teyateyaneng", "Mafeteng", "Leribe"]),
  C("Eswatini", "Eswatini", "SZ", "+268", "Afrique", ["Mbabane", "Manzini", "Lobamba", "Siteki"]),

  // ── Afrique du Nord ──
  C("Maroc", "Morocco", "MA", "+212", "Afrique", ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", "Oujda", "Kénitra", "Tétouan"]),
  C("Algérie", "Algeria", "DZ", "+213", "Afrique", ["Alger", "Oran", "Constantine", "Annaba", "Blida", "Batna", "Sétif", "Tlemcen", "Béjaïa"]),
  C("Tunisie", "Tunisia", "TN", "+216", "Afrique", ["Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès", "Monastir", "Nabeul"]),
  C("Égypte", "Egypt", "EG", "+20", "Afrique", ["Le Caire", "Alexandrie", "Gizeh", "Port-Saïd", "Suez", "Louxor", "Assouan", "Mansourah"]),
  C("Libye", "Libya", "LY", "+218", "Afrique", ["Tripoli", "Benghazi", "Misrata", "Sabha", "Zawiya"]),

  // ── Diaspora : Europe ──
  C("France", "France", "FR", "+33", "Diaspora", [
    "Paris", "Lyon", "Marseille", "Lille", "Bordeaux", "Nantes", "Strasbourg", "Montpellier", "Toulouse", "Nice",
    "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble", "Dijon", "Angers", "Nîmes", "Clermont-Ferrand",
    "Le Mans", "Tours", "Amiens", "Limoges", "Metz", "Rouen", "Orléans", "Mulhouse", "Caen", "Nancy",
    "Saint-Denis", "Argenteuil", "Montreuil", "Créteil", "Évry", "Cergy", "Versailles", "Nanterre",
  ]),
  C("Belgique", "Belgium", "BE", "+32", "Diaspora", ["Bruxelles", "Anvers", "Liège", "Charleroi", "Gand", "Namur", "Mons", "Louvain", "Bruges", "Louvain-la-Neuve"]),
  C("Suisse", "Switzerland", "CH", "+41", "Diaspora", ["Genève", "Lausanne", "Zurich", "Bâle", "Berne", "Fribourg", "Neuchâtel", "Lucerne", "Sion"]),
  C("Luxembourg", "Luxembourg", "LU", "+352", "Diaspora", ["Luxembourg", "Esch-sur-Alzette", "Differdange", "Dudelange"]),
  C("Royaume-Uni", "United Kingdom", "GB", "+44", "Diaspora", ["Londres", "Birmingham", "Manchester", "Glasgow", "Leeds", "Liverpool", "Bristol", "Leicester", "Édimbourg", "Cardiff"]),
  C("Irlande", "Ireland", "IE", "+353", "Diaspora", ["Dublin", "Cork", "Limerick", "Galway", "Waterford"]),
  C("Allemagne", "Germany", "DE", "+49", "Diaspora", ["Berlin", "Hambourg", "Munich", "Cologne", "Francfort", "Stuttgart", "Düsseldorf", "Dortmund", "Leipzig", "Brême"]),
  C("Pays-Bas", "Netherlands", "NL", "+31", "Diaspora", ["Amsterdam", "Rotterdam", "La Haye", "Utrecht", "Eindhoven", "Groningue"]),
  C("Italie", "Italy", "IT", "+39", "Diaspora", ["Rome", "Milan", "Naples", "Turin", "Bologne", "Florence", "Gênes", "Palerme"]),
  C("Espagne", "Spain", "ES", "+34", "Diaspora", ["Madrid", "Barcelone", "Valence", "Séville", "Saragosse", "Malaga", "Bilbao"]),
  C("Portugal", "Portugal", "PT", "+351", "Diaspora", ["Lisbonne", "Porto", "Braga", "Coimbra", "Faro", "Amadora"]),
  C("Autriche", "Austria", "AT", "+43", "Diaspora", ["Vienne", "Graz", "Linz", "Salzbourg", "Innsbruck"]),
  C("Suède", "Sweden", "SE", "+46", "Diaspora", ["Stockholm", "Göteborg", "Malmö", "Uppsala"]),
  C("Norvège", "Norway", "NO", "+47", "Diaspora", ["Oslo", "Bergen", "Trondheim", "Stavanger"]),
  C("Danemark", "Denmark", "DK", "+45", "Diaspora", ["Copenhague", "Aarhus", "Odense", "Aalborg"]),
  C("Finlande", "Finland", "FI", "+358", "Diaspora", ["Helsinki", "Espoo", "Tampere", "Turku"]),
  C("Pologne", "Poland", "PL", "+48", "Diaspora", ["Varsovie", "Cracovie", "Wrocław", "Gdańsk", "Poznań"]),
  C("Russie", "Russia", "RU", "+7", "Diaspora", ["Moscou", "Saint-Pétersbourg", "Kazan", "Novossibirsk"]),
  C("Ukraine", "Ukraine", "UA", "+380", "Diaspora", ["Kiev", "Kharkiv", "Odessa", "Lviv"]),
  C("Turquie", "Turkey", "TR", "+90", "Diaspora", ["Istanbul", "Ankara", "Izmir", "Antalya", "Bursa"]),

  // ── Diaspora : Amériques et Outre-mer ──
  C("Canada", "Canada", "CA", "+1", "Diaspora", ["Montréal", "Toronto", "Ottawa", "Québec", "Calgary", "Vancouver", "Edmonton", "Winnipeg", "Gatineau", "Sherbrooke", "Halifax", "Laval", "Moncton"]),
  C("USA", "United States", "US", "+1", "Diaspora", [
    "New York", "Washington", "Atlanta", "Chicago", "Houston", "Miami", "Los Angeles", "Dallas", "Philadelphie", "Boston",
    "Baltimore", "Minneapolis", "Seattle", "Charlotte", "Denver", "San Francisco", "Phoenix", "Orlando", "Columbus", "Raleigh",
  ]),
  C("Brésil", "Brazil", "BR", "+55", "Diaspora", ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Belo Horizonte", "Fortaleza", "Recife"]),
  C("Haïti", "Haiti", "HT", "+509", "Diaspora", ["Port-au-Prince", "Cap-Haïtien", "Gonaïves", "Les Cayes", "Jacmel", "Pétion-Ville"]),
  C("Guadeloupe", "Guadeloupe", "GP", "+590", "Diaspora", ["Pointe-à-Pitre", "Basse-Terre", "Les Abymes", "Baie-Mahault", "Le Gosier"]),
  C("Martinique", "Martinique", "MQ", "+596", "Diaspora", ["Fort-de-France", "Le Lamentin", "Le Robert", "Schœlcher", "Sainte-Marie"]),
  C("Guyane", "French Guiana", "GF", "+594", "Diaspora", ["Cayenne", "Saint-Laurent-du-Maroni", "Kourou", "Matoury", "Rémire-Montjoly"]),
  C("La Réunion", "Réunion", "RE", "+262", "Diaspora", ["Saint-Denis", "Saint-Paul", "Saint-Pierre", "Le Tampon", "Saint-André"]),
  C("Mayotte", "Mayotte", "YT", "+262", "Diaspora", ["Mamoudzou", "Koungou", "Dzaoudzi", "Sada"]),

  // ── Diaspora : Moyen-Orient, Asie, Océanie ──
  C("Émirats arabes unis", "United Arab Emirates", "AE", "+971", "Diaspora", ["Dubaï", "Abou Dhabi", "Charjah", "Ajman"]),
  C("Qatar", "Qatar", "QA", "+974", "Diaspora", ["Doha", "Al Rayyan", "Al Wakrah"]),
  C("Arabie saoudite", "Saudi Arabia", "SA", "+966", "Diaspora", ["Riyad", "Djeddah", "Dammam", "La Mecque", "Médine"]),
  C("Koweït", "Kuwait", "KW", "+965", "Diaspora", ["Koweït", "Hawalli", "Salmiya"]),
  C("Liban", "Lebanon", "LB", "+961", "Diaspora", ["Beyrouth", "Tripoli", "Saïda", "Jounieh"]),
  C("Israël", "Israel", "IL", "+972", "Diaspora", ["Jérusalem", "Tel Aviv", "Haïfa", "Eilat"]),
  C("Chine", "China", "CN", "+86", "Diaspora", ["Pékin", "Shanghai", "Canton", "Shenzhen", "Wuhan", "Yiwu"]),
  C("Inde", "India", "IN", "+91", "Diaspora", ["New Delhi", "Bombay", "Bangalore", "Chennai", "Hyderabad", "Calcutta"]),
  C("Japon", "Japan", "JP", "+81", "Diaspora", ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Kyoto"]),
  C("Corée du Sud", "South Korea", "KR", "+82", "Diaspora", ["Séoul", "Busan", "Incheon", "Daegu"]),
  C("Malaisie", "Malaysia", "MY", "+60", "Diaspora", ["Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh"]),
  C("Australie", "Australia", "AU", "+61", "Diaspora", ["Sydney", "Melbourne", "Brisbane", "Perth", "Adélaïde", "Canberra"]),
  C("Nouvelle-Zélande", "New Zealand", "NZ", "+64", "Diaspora", ["Auckland", "Wellington", "Christchurch", "Hamilton"]),
];

const BY_NAME = new Map(COUNTRIES.map((c) => [c.name, c]));

export const findCountry = (name: string | null | undefined) => (name ? BY_NAME.get(name) ?? null : null);

export const countriesOf = (region: string) => COUNTRIES.filter((c) => c.region === region);

/** Drapeau (emoji) à partir du code ISO. */
export function flagOf(iso: string): string {
  return iso.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

/** Nom affiché selon la langue de l'interface (la valeur enregistrée reste `name`). */
export const countryLabel = (c: GeoCountry, locale: string) => (locale === "en" ? c.nameEn : c.name);

/** Recherche sans tenir compte des accents ni de la casse. */
export function normalizeSearch(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeSearch(query);
  return !q || normalizeSearch(text).includes(q);
}

export function filterCountries(region: string, query: string): GeoCountry[] {
  return countriesOf(region)
    .filter((c) => matchesSearch(c.name, query) || matchesSearch(c.nameEn, query) || matchesSearch(c.dial, query))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function filterCities(countryName: string, query: string): string[] {
  return (findCountry(countryName)?.cities ?? []).filter((city) => matchesSearch(city, query));
}

/* ─────────────────────────────── Téléphone ─────────────────────────────── */

/** Indicatifs proposés (un par indicatif, nom de pays le plus parlant en premier). */
export const DIAL_CODES = COUNTRIES
  .map((c) => ({ dial: c.dial, iso: c.iso, name: c.name, nameEn: c.nameEn }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

/** Pays de l'indicatif par défaut : celui choisi plus tôt dans l'inscription (Cameroun sinon). */
export const phoneIsoFor = (countryName: string | null | undefined) => findCountry(countryName)?.iso ?? "CM";

/** Indicatif d'un pays (code ISO). */
export const dialOfIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso)?.dial ?? "+237";

/** Chiffres seuls du numéro local (on retire espaces, tirets, parenthèses et un 0 initial de trop). */
export function cleanLocalNumber(input: string): string {
  return input.replace(/[^\d]/g, "");
}

/** Numéro complet au format international E.164 (ex. « +237690123456 »), ou null s'il est invalide. */
export function toE164(dial: string, local: string): string | null {
  let digits = cleanLocalNumber(local);
  // Beaucoup de pays notent un 0 devant le numéro national (France : 06…) : il disparaît après l'indicatif.
  if (digits.startsWith("0") && dial !== "+225") digits = digits.replace(/^0+/, "");
  const full = `${dial}${digits}`;
  return /^\+\d{8,15}$/.test(full) && digits.length >= 6 ? full : null;
}

export const isValidE164 = (phone: unknown): phone is string => typeof phone === "string" && /^\+\d{8,15}$/.test(phone);
