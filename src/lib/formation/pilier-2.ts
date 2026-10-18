// Pilier 2 de « Bâtir sur le roc » — Connaissance de soi, tempéraments & guérison intérieure.
// Contenu transcrit des leçons PDF rédigées par l'équipe Garden of Alliance.
// Affiches, vignettes et PDF : public/formation/batir-sur-le-roc/.
import type { Lesson, Pillar, Poster } from "./types";

const BASE = "/formation/batir-sur-le-roc";
const card = (n: string) => `${BASE}/images/${n}-carte.webp`;
const portrait = (n: string, alt: string): Poster => ({ src: `${BASE}/images/${n}.webp`, width: 1055, height: 1491, alt });

/** Affiche du pilier : reprise en tête des leçons 2.2 et 2.4, qui n'ont pas encore d'affiche propre. */
const PILLAR_2_POSTER: Poster = {
  src: `${BASE}/images/pilier-2.webp`,
  width: 1122,
  height: 1402,
  alt: "Affiche « Connaissance de soi — Tempéraments & guérison intérieure » : une femme se regarde dans un miroir entouré de ses forces, besoins, émotions, valeurs et blessures guéries ; à gauche les quatre tempéraments, à droite le chemin de la guérison intérieure, et le verset de Romains 12.2.",
};

const POSTERS = {
  "2-1": { src: `${BASE}/images/lecon-2-1.webp`, width: 1536, height: 1024, alt: "Affiche « Me connaître aujourd'hui pour mieux aimer demain » : une femme face à son miroir, entourée des quatre tempéraments, des quatre styles d'attachement et des étapes pour grandir dans la grâce." },
  "2-3": portrait("lecon-2-3", "Affiche de la leçon 2.3 « Briser le cycle pour bâtir autrement » : une femme brise ses chaînes et les fils rouges des loyautés invisibles, du contrôle et de la peur, et avance vers un portail ouvert indiquant vérité, limites saines, paix, liberté et maturité."),
  "2-5": portrait("lecon-2-5", "Affiche de la leçon 2.5 « Vivre pleinement aujourd'hui, aimer sainement demain » : une femme sereine à son bureau, entourée des trois piliers de l'estime de soi en Christ, du continuum affectif et des clés d'un célibat épanoui."),
  "2-6": portrait("lecon-2-6", "Affiche de la leçon 2.6 « Pardonner pour guérir, se réconcilier pour avancer » : une femme libérée de ses chaînes, entourée des trois dimensions du pardon, de ce que le pardon n'est pas et des quatre clés pour garder un cœur libre."),
  "2-7": portrait("lecon-2-7", "Affiche de la leçon 2.7 « En Christ, toute chaîne peut être brisée » : une femme brise ses chaînes en levant la main vers la lumière, entourée des quatre portes à fermer et du protocole biblique de liberté."),
} satisfies Record<string, Poster>;

/* ───────────────────────────── Leçon 2.1 ───────────────────────────── */

const lecon21: Lesson = {
  number: "2.1",
  slug: "2-1",
  title: "Se connaître pour mieux aimer",
  image: { src: POSTERS["2-1"].src, card: card("lecon-2-1"), alt: POSTERS["2-1"].alt },
  poster: POSTERS["2-1"],
  pdf: `${BASE}/pdf/lecon-2-1-se-connaitre-pour-mieux-aimer.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "Le miroir que l'on évite",
    blocks: [
      { type: "p", text: "Nous passons beaucoup de temps à observer les autres, à analyser leurs comportements, à tenter de les comprendre ou de les changer. Mais il est une chose que nous faisons rarement avec la même rigueur : nous regarder nous-mêmes dans un miroir honnête." },
      { type: "p", text: "Pourtant, si une seule vérité devait orienter l'ensemble de ce pilier 2, c'est bien celle-ci : **tu ne peux pas offrir ce que tu ne connais pas.** Si tu ne sais pas comment tu fonctionnes — tes forces, tes besoins profonds, tes réactions automatiques — tu entreras dans toute relation avec des angles morts dangereux." },
      { type: "p", text: "Cette leçon n'est ni un test de personnalité à cocher rapidement, ni un inventaire froid de tes caractéristiques. C'est une invitation à te découvrir avec bienveillance, afin de mieux te donner à l'autre." },
      { type: "authorQuote", text: "Se connaître soi-même n'est pas une quête narcissique — c'est l'un des actes d'amour les plus profonds que tu puisses accomplir pour les autres. Car on ne peut vraiment aimer que depuis un lieu de conscience intérieure.", author: "Dr. Larry Crabb, psychologue chrétien, auteur de *L'âme profonde*" },
    ],
  },
  parts: [
    {
      heading: "Les quatre tempéraments — Comment es-tu « câblé(e) » ?",
      blocks: [
        { type: "p", text: "Le concept des quatre tempéraments, hérité de la pensée grecque et profondément revisité par la psychologie chrétienne moderne, demeure l'un des outils les plus accessibles pour se comprendre soi-même. Il ne s'agit pas d'une case où l'on t'enferme, mais d'une carte pour lire tes tendances naturelles." },
        { type: "p", text: "Chaque être humain est un mélange unique de ces quatre tempéraments, avec l'un ou deux qui dominent généralement :" },
        {
          type: "callout", tone: "neutral", title: "Le Sanguin — L'enthousiaste",
          blocks: [{ type: "points", items: [
            { lead: "En un mot :", text: "vie, chaleur, spontanéité." },
            { lead: "Ses forces :", text: "communicatif, joyeux, sociable, expressif. Il illumine une pièce en entrant." },
            { lead: "Ses défis :", text: "peut manquer de profondeur émotionnelle, fuir la routine, éviter les sujets difficiles par légèreté." },
            { lead: "En amour :", text: "recherche la complicité, la fête et les moments de connexion intense. Il a besoin d'un conjoint qui valorise sa joie de vivre sans la brider." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "Le Colérique — Le leader",
          blocks: [{ type: "points", items: [
            { lead: "En un mot :", text: "vision, action, détermination." },
            { lead: "Ses forces :", text: "décidé, organisé, efficace, naturellement doté d'autorité. Il accomplit ce que d'autres abandonnent." },
            { lead: "Ses défis :", text: "peut être dominateur, impatient avec la lenteur des autres, peu à l'aise dans la vulnérabilité." },
            { lead: "En amour :", text: "il a besoin de respect et de clarté. Son plus grand chantier conjugal est d'apprendre à servir avec autant d'énergie qu'il dirige." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "Le Mélancolique — Le profond",
          blocks: [{ type: "points", items: [
            { lead: "En un mot :", text: "profondeur, sensibilité, excellence." },
            { lead: "Ses forces :", text: "analytique, créatif, loyal et capable d'une intimité émotionnelle très profonde. Il aime vraiment et complètement." },
            { lead: "Ses défis :", text: "tendance à l'idéalisation, au perfectionnisme, à la mélancolie et à la critique intérieure sévère." },
            { lead: "En amour :", text: "il a besoin de sécurité émotionnelle et d'un conjoint patient qui ne prend pas ses phases de retrait pour du rejet." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "Le Flegmatique — Le pacificateur",
          blocks: [{ type: "points", items: [
            { lead: "En un mot :", text: "paix, stabilité, fidélité." },
            { lead: "Ses forces :", text: "calme, diplomate, fiable, excellent écouteur. Il est la roche sur laquelle les autres s'appuient." },
            { lead: "Ses défis :", text: "peut éviter les conflits au point de ne jamais exprimer ses propres besoins, voire accumuler des frustrations silencieuses." },
            { lead: "En amour :", text: "il a besoin d'un espace sécurisé pour s'exprimer. Son principal chantier est d'apprendre à affirmer ses désirs avec douceur mais clarté." },
          ] }],
        },
        { type: "authorQuote", text: "Comprendre votre tempérament naturel, c'est comme avoir enfin la notice de fonctionnement de votre propre cœur. Cela vous permet d'arrêter de vous battre contre ce que vous êtes, et de commencer à le sanctifier.", author: "Dr. Tim LaHaye, pasteur et auteur de *Les tempéraments contrôlés par l'Esprit*" },
      ],
    },
    {
      heading: "Les styles d'attachement — Comment aimes-tu, vraiment ?",
      blocks: [
        { type: "p", text: "La théorie de l'attachement, développée par le psychiatre John Bowlby et largement appliquée par la psychologie chrétienne contemporaine, nous apprend une vérité bouleversante : **la façon dont nous avons été aimés (ou pas) dans notre enfance programme littéralement la façon dont nous aimons en tant qu'adulte.**" },
        { type: "p", text: "Il existe quatre styles d'attachement principaux. Reconnais-toi honnêtement dans l'un d'eux :" },
        {
          type: "table",
          head: ["Style", "Comment il se manifeste en relation", "La question intérieure qui le gouverne"],
          rows: [
            ["Sécure", "Capable de donner et recevoir de l'amour librement. À l'aise avec l'intimité comme avec l'autonomie. Ne panique pas lors des désaccords.", "« Je suis digne d'amour et je fais confiance à l'autre. »"],
            ["Anxieux", "Cherche constamment la réassurance. Lit les moindres signaux de l'autre. A peur d'être abandonné et surinvestit pour « mériter » l'amour.", "« M'aimera-t-il/elle encore demain si je ne fais pas tout parfaitement ? »"],
            ["Évitant", "Valorise l'indépendance à l'extrême. Fuit l'intimité émotionnelle. Se ferme dès que la relation devient trop intense ou exigeante.", "« Si je me laisse vraiment connaître, je serai blessé(e). »"],
            ["Désorganisé", "Simultanément attire et repousse l'intimité. Oscille entre le besoin ardent d'amour et la terreur d'être blessé. Souvent lié à des traumas profonds.", "« J'ai besoin de toi, mais tu me fais peur. »"],
          ],
        },
        { type: "authorQuote", text: "La bonne nouvelle pour ceux qui ont un attachement insécure, c'est que le style d'attachement n'est pas une condamnation — c'est un point de départ. Avec la grâce de Dieu, une thérapie adaptée et des relations sécurisantes, un attachement anxieux ou évitant peut se transformer en attachement sécure.", author: "Dr. Tim Clinton, psychologue chrétien, président de l'*American Association of Christian Counselors*" },
      ],
    },
    {
      heading: "Personnalité et grâce — Ce que Dieu fait de ce que tu es",
      blocks: [
        { type: "p", text: "Voici une précision théologique essentielle pour ne pas tomber dans le piège du déterminisme psychologique : connaître ton tempérament et ton style d'attachement ne te condamne pas à y rester enfermé(e). La psychologie chrétienne n'est pas fataliste." },
        { type: "p", text: "Elle affirme deux vérités simultanées :" },
        { type: "points", items: [
          { lead: "Tu es câblé(e) d'une certaine façon —", text: "et cette architecture a été façonnée par ta nature, ton histoire et ta famille. La nier serait de l'aveuglement." },
          { lead: "La grâce de Dieu peut remodeler ce câblage —", text: "non pas en effaçant qui tu es, mais en sanctifiant ce que tu es, en transformant tes faiblesses en sagesse et tes blessures en empathie." },
        ] },
        { type: "authorQuote", text: "Dieu ne vous a pas sauvé pour que vous deveniez quelqu'un d'autre. Il vous a sauvé pour que vous deveniez pleinement vous-même — la version de vous que le péché, la blessure et la peur avaient étouffée.", author: "Dr. Henry Cloud, psychologue chrétien, auteur de *Integrity* et *Les limites dans le mariage*" },
      ],
    },
    {
      heading: "Application pratique — Sur la plateforme et dans tes échanges",
      blocks: [
        { type: "p", text: "La connaissance de soi n'est pas une théorie abstraite. Elle a des conséquences immédiates et pratiques sur la façon dont tu navigues sur Garden of Alliance :" },
        { type: "points", items: [
          { lead: "Si tu es anxieux :", text: "lorsqu'une personne tarde à te répondre, remarque ta première réaction. Est-ce que tu catastrophises immédiatement ? Ce n'est pas la réalité — c'est ton style d'attachement qui parle. Reviens à un état de paix avant de relancer un message." },
          { lead: "Si tu es évitant :", text: "lorsqu'une conversation devient intéressante et profonde, observe si tu ressens soudainement l'envie de t'éloigner ou de refroidir l'échange. C'est ton mécanisme de protection. Choisis délibérément de rester présent." },
          { lead: "Pour tous les tempéraments :", text: "sois honnête dans ton profil. Présente non seulement tes forces, mais également ce sur quoi tu travailles. L'authenticité filtre les mauvaises correspondances et attire les bonnes." },
        ] },
        { type: "authorQuote", text: "Les couples les plus solides ne sont pas ceux qui se sont trouvés parfaitement compatibles dès le départ. Ce sont ceux dont les deux partenaires se connaissaient suffisamment bien pour savoir ce qu'ils apportaient dans la relation — et ce qu'ils devaient encore travailler.", author: "Dr. Gary Chapman, pasteur et auteur de *Les 5 langages de l'amour*" },
        {
          type: "callout", tone: "info", title: "À faire dès aujourd'hui",
          blocks: [
            { type: "p", text: "Prends une feuille ou ouvre un journal. Écris en toute honnêteté :" },
            { type: "steps", items: [
              "Mon tempérament dominant est probablement… (et voilà comment il me complique la vie en relation…)",
              "Mon style d'attachement ressemble davantage à… (et voilà ce que cela déclenchait dans mes relations passées…)",
              "La force de ma personnalité que je veux offrir à mon conjoint est…",
              "Le chantier intérieur sur lequel je dois travailler avant de me marier est…",
            ] },
            { type: "p", text: "Ce journal sera ton compagnon tout au long du pilier 2. Ne cherche pas à te mettre à l'aise — cherche à être vrai(e)." },
          ],
        },
      ],
    },
  ],
  quizIntro: "Réponds à ces questions pour ancrer la connaissance de soi.",
  quiz: [
    {
      question: "Pourquoi la connaissance de soi est-elle indispensable avant de chercher un conjoint ?",
      options: [
        "Pour paraître plus intéressant dans son profil en ligne.",
        "Parce qu'on ne peut offrir que ce que l'on connaît et possède réellement ; les angles morts sur soi-même deviennent des angles morts dans la relation.",
        "Pour éviter tout conflit futur avec le conjoint.",
      ],
      answer: 1,
      explanation: "On ne peut pas donner ce qu'on n'a pas. Un cœur qui ne se connaît pas entre en relation avec des réactions automatiques qu'il ne comprend pas lui-même.",
    },
    {
      question: "Que nous enseigne la théorie de l'attachement sur nos comportements amoureux ?",
      options: [
        "Que notre signe astrologique détermine nos relations.",
        "Que la façon dont nous avons été aimés pendant l'enfance programme nos réponses émotionnelles dans les relations adultes.",
        "Que seuls les chrétiens ont un attachement sécure.",
      ],
      answer: 1,
      explanation: "Le style d'attachement est une empreinte relationnelle profonde — mais elle peut être transformée par la grâce, la conscience de soi et des relations sécurisantes.",
    },
    {
      question: "Quel est le style d'attachement le plus courant chez quelqu'un qui fuit l'intimité et valorise l'indépendance à l'extrême ?",
      options: ["Le style sécure.", "Le style anxieux.", "Le style évitant."],
      answer: 2,
      explanation: "L'évitant n'est pas forcément quelqu'un qui ne veut pas d'amour — c'est souvent quelqu'un qui a appris que se laisser connaître est dangereux.",
    },
    {
      question: "Selon la psychologie chrétienne, le tempérament et le style d'attachement sont-ils une condamnation définitive ?",
      options: [
        "Oui, on ne change pas fondamentalement sa nature.",
        "Non — la grâce de Dieu peut sanctifier et remodeler ces traits, non en effaçant la personne mais en la transformant de l'intérieur.",
        "Cela dépend de l'intensité de la prière.",
      ],
      answer: 1,
      explanation: "C'est le cœur de l'Évangile appliqué à la psychologie : la transformation est possible. Pas par la volonté seule, mais par la grâce qui renouvelle l'intelligence (Romains 12.2).",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Reprends le tableau des styles d'attachement. Sans te juger, identifie dans tes deux ou trois dernières relations (amoureuses ou même amicales profondes) quel style se manifestait dans tes réactions. Écris deux exemples concrets de moments où ce style a pris le dessus. Puis demande à Dieu, en prière, de te montrer l'origine de cette empreinte et ce qu'il veut en faire.",
  },
};

/* ───────────────────────────── Leçon 2.2 ───────────────────────────── */

const lecon22: Lesson = {
  number: "2.2",
  slug: "2-2",
  title: "Identifier et guérir ses blessures",
  image: { src: PILLAR_2_POSTER.src, card: card("lecon-2-2"), alt: "Le chemin de la guérison intérieure : des chaînes brisées, un cœur réparé et une femme qui se regarde avec paix dans un miroir." },
  poster: PILLAR_2_POSTER,
  pdf: `${BASE}/pdf/lecon-2-2-identifier-et-guerir-ses-blessures.pdf`,
  readingMinutes: 12,
  intro: {
    heading: "Ce que tu portes sans le savoir",
    blocks: [
      { type: "p", text: "Il existe une vérité que beaucoup de célibataires chrétiens découvrent trop tard — souvent après leur mariage, dans la chaleur d'un premier conflit sérieux : **nos blessures du passé ne restent jamais dans le passé.** Elles voyagent avec nous. Elles colorent ce que nous voyons dans l'autre, déforment ce que nous entendons dans ses mots et amplifient la douleur de chaque friction relationnelle." },
      { type: "p", text: "Un mot mal placé du conjoint peut réveiller une humiliation vieille de vingt ans. Un moment de silence peut déclencher une panique d'abandon qui n'appartient pas à la scène présente. Une critique banale peut effondrer une estime de soi construite sur du sable. Ce n'est pas de la fragilité — c'est de l'humanité non guérie." },
      { type: "authorQuote", text: "Les blessures de l'âme non traitées ne disparaissent pas avec le temps. Elles se déguisent. Elles prennent la forme de la colère, de la méfiance, de l'hyper-contrôle ou de l'abandon de soi. Identifier la blessure originelle, c'est déjà commencer à la désarmer.", author: "Dr. Dan Allender, psychologue chrétien, auteur de *La blessure guérie*" },
    ],
  },
  objective: "T'aider à identifier avec précision tes blessures et tes rejets du passé, à comprendre comment ils agissent dans tes relations, et à emprunter le chemin concret de la guérison — non pas seul(e), mais accompagné(e).",
  parts: [
    {
      heading: "Les huit blessures fondamentales",
      blocks: [
        { type: "p", text: "La psychologie chrétienne identifie plusieurs types de blessures qui façonnent nos comportements relationnels. En voici les huit les plus fréquentes dans le contexte des rencontres et du mariage :" },
        { type: "titledSteps", items: [
          { title: "La blessure de rejet", text: "Être ou se sentir non désiré(e), exclu(e), abandonné(e). Elle génère une peur chronique d'être laissé(e) pour compte et une tendance à s'effacer ou à sur-performer pour « mériter » une place." },
          { title: "La blessure d'abandon", text: "Liée souvent à une absence parentale (physique ou émotionnelle). Elle crée un attachement anxieux et une terreur silencieuse que « tout le monde finit par partir »." },
          { title: "La blessure d'humiliation", text: "Avoir été ridiculisé(e), couvert(e) de honte ou rabaissé(e) publiquement. Elle engendre soit une soumission excessive, soit une défensivité agressive pour ne plus jamais se retrouver vulnérable." },
          { title: "La blessure de trahison", text: "Avoir été trompé(e), menti(e), manipulé(e) par quelqu'un en qui on avait confiance. Elle détruit la capacité à faire confiance et génère un contrôle obsessionnel de l'autre." },
          { title: "La blessure d'injustice", text: "Avoir été traité(e) de façon inéquitable ou rigide. Elle engendre le perfectionnisme, la difficulté à recevoir de la grâce et une insensibilité à ses propres torts." },
          { title: "La blessure de dévalorisation", text: "Ne jamais avoir été suffisamment reconnu(e), admiré(e) ou valorisé(e). Elle génère un besoin chronique de validation externe et une instabilité de l'estime de soi." },
          { title: "La blessure de rejet amoureux", text: "Trahisons, ruptures douloureuses, *ghosting*, infidélité. Elle dépose une lentille déformante sur tout nouveau partenaire potentiel, qui est inconsciemment traité comme coupable des crimes des ex." },
          { title: "La blessure de violation ou d'effraction traumatique", text: "Avoir subi un abus sexuel, physique ou psychique profond qui détruit le droit à l'intégrité corporelle et le sentiment de sécurité fondamentale. Elle génère une hypervigilance chronique, des mécanismes de dissociation et une peur viscérale de l'intimité, rendant extrêmement difficile la capacité à se sentir en sécurité dans son propre corps ou avec un partenaire, même bienveillant." },
        ] },
        {
          type: "callout", tone: "warning", title: "Éclairage clinique & théologique : la gravité spécifique de l'effraction traumatique (viol ou abus dans l'enfance)",
          blocks: [
            { type: "p", text: "Le viol ou l'abus dans l'enfance ne se limite pas à une seule de ces catégories : il les traverse presque toutes simultanément tout en constituant une blessure beaucoup plus profonde. En raison de son extrême gravité, la psychologie du trauma ne le classe pas comme une simple blessure relationnelle, car il implique une effraction corporelle qui détruit la notion même de sécurité fondamentale." },
            { type: "p", text: "**L'effraction traumatique s'entremêle particulièrement avec trois blessures majeures :**" },
            { type: "points", items: [
              { lead: "La trahison :", text: "l'agresseur étant souvent une personne de l'entourage en qui l'enfant avait confiance ou qui devait le protéger, cela brise fondamentalement la capacité à se fier aux autres." },
              { lead: "L'humiliation :", text: "l'abus dépose sur la victime une honte toxique extrêmement lourde et un sentiment de souillure qui n'a rien à voir avec ses propres actes." },
              { lead: "L'injustice :", text: "il s'agit d'un vol pur et simple de l'innocence, créant un rapport au monde où l'environnement est perçu comme dangereux et chaotique." },
            ] },
          ],
        },
        {
          type: "callout", tone: "warning", title: "Précision méthodologique essentielle",
          blocks: [
            { type: "p", text: "Alors que les blessures relationnelles ordinaires peuvent être accompagnées efficacement par un coach de vie ou un mentor, **l'effraction traumatique (abus sexuels, violences graves) requiert impérativement un suivi préalable ou simultané par un thérapeute clinicien spécialisé en psychotraumatologie** (EMDR, thérapie spécialisée). Le coach interviendra ensuite pour soutenir la réédification relationnelle et le projet de couple." },
          ],
        },
        { type: "authorQuote", text: "Ce n'est pas la blessure en elle-même qui définit ton avenir relationnel. C'est la décision que tu prends — ou que tu refuses de prendre — de la regarder en face et de lui permettre d'être transformée par la grâce.", author: "Dr. John Townsend, psychologue chrétien, co-auteur de *Les limites dans le mariage*" },
      ],
    },
    {
      heading: "Comment la blessure agit dans tes relations",
      blocks: [
        { type: "p", text: "Une blessure non guérie fonctionne comme une alarme hypersensible. Dans des situations calmes, on ne l'entend pas. Mais dès qu'un déclencheur (ou *trigger*) la réveille, elle sonne à plein volume — bien au-delà de ce que la situation réelle justifie." },
        { type: "p", text: "Exemples concrets de déclencheurs relationnels sur une plateforme de rencontre :" },
        { type: "points", items: [
          { lead: "Un profil qui ne répond plus après plusieurs échanges intéressants", text: "→ réactive la **blessure d'abandon**." },
          { lead: "Un partenaire qui remet en question une de tes opinions", text: "→ réactive la **blessure d'humiliation**." },
          { lead: "Découvrir une incohérence dans le discours de l'autre", text: "→ réactive la **blessure de trahison**." },
          { lead: "Une relation prometteuse qui s'arrête brusquement", text: "→ réactive la **blessure de rejet amoureux**." },
        ] },
        { type: "p", text: "Le problème n'est pas que ces réactions existent — c'est qu'elles pilotent notre comportement *à notre place*, sans que nous en ayons conscience." },
        {
          type: "worksheet",
          title: "Identification de mes blessures et rejets",
          intro: "Prends 30 minutes dans un lieu calme. Réponds le plus honnêtement possible, sans te juger. Il n'y a pas de bonne ou mauvaise réponse — seulement ta vérité.",
          sections: [
            { title: "Section 1 — Mon histoire relationnelle fondatrice", items: [
              "Comment décrirais-tu la relation entre tes parents ? (Stable / Conflictuelle / Froide / Absente / Aimante mais blessante)",
              "Quelle émotion dominait l'atmosphère de ta maison d'enfance ?",
              "As-tu jamais eu le sentiment de ne pas avoir ta place, de ne pas être voulu(e) ou de devoir mériter l'amour de tes parents ? Décris.",
            ] },
            { title: "Section 2 — Mes blessures relationnelles identifiées", intro: "Coche les blessures que tu reconnais en toi, puis note pour chacune un souvenir ou une situation précise où elle s'est manifestée :", items: [
              "**Rejet** — Souvenir :",
              "**Abandon** — Souvenir :",
              "**Humiliation** — Souvenir :",
              "**Trahison** — Souvenir :",
              "**Injustice** — Souvenir :",
              "**Dévalorisation** — Souvenir :",
              "**Rejet amoureux** — Souvenir :",
              "**Violation / effraction traumatique** — Souvenir :",
            ] },
            { title: "Section 3 — Mes déclencheurs relationnels", items: [
              "Dans mes relations passées, quelle situation m'a le plus souvent mis(e) hors de moi ou m'a fait fermer émotionnellement ?",
              "Quelle phrase ou quel comportement de l'autre me blesse systématiquement, même quand ce n'est probablement pas voulu ?",
              "Dans une dispute, ma réaction automatique est de (entoure) : fuir · attaquer · me soumettre · me fermer · surexpliquer · pleurer · blesser en retour.",
            ] },
            { title: "Section 4 — L'impact sur ma recherche de conjoint", items: [
              "Est-ce que je remarque des comportements ou des profils qui m'attirent systématiquement et qui se révèlent toujours problématiques ? Lesquels ?",
              "Qu'est-ce que je cherche inconsciemment à « réparer » ou à « obtenir » dans une relation amoureuse que je n'ai pas eu dans l'enfance ?",
              "Si ma blessure principale n'existait pas, comment serais-je différent(e) en relation ?",
            ] },
          ],
        },
      ],
    },
    {
      heading: "Guide pratique pour le chemin de la guérison",
      blocks: [
        { type: "p", text: "Identifier sa blessure est une victoire. Mais l'identification seule ne guérit pas — tout comme nommer une fracture ne la répare pas. Le chemin de la guérison est un processus actif, qui se parcourt par étapes." },
        { type: "titledSteps", items: [
          { title: "Reconnais et nomme la blessure devant Dieu", text: "La première étape est spirituelle. Apporte ta blessure dans la prière, non pas pour « être guéri(e) immédiatement », mais pour cesser de la porter seul(e). Le Psaume 34.19 dit : *« L'Éternel est près de ceux qui ont le cœur brisé. »* Il ne te demande pas d'avoir réparé ta blessure avant de venir à lui — il te demande de venir avec elle." },
          { title: "Trace le chemin de la blessure (les origines)", text: "Avec la fiche ci-dessus en main, retrace honnêtement la source de chaque blessure identifiée. Qui était impliqué ? Quel âge avais-tu ? Qu'est-ce que tu as conclu sur toi-même et sur les autres à ce moment-là ? Cette conclusion (« je ne mérite pas l'amour », « les hommes/femmes finissent toujours par partir ») est souvent le vrai ennemi — pas l'événement lui-même." },
          { title: "Écris une lettre que tu n'enverras pas", text: "Écris une lettre adressée à la personne qui t'a blessé(e) — parent, ex, ami, etc. Ne filtre rien. Dis tout ce que tu n'as jamais pu dire. Ce n'est pas pour envoyer cette lettre, mais pour extérioriser ce que tu portes intérieurement. Brûler ou déchirer cette lettre après l'avoir écrite peut être un acte symbolique puissant de libération." },
          { title: "Choisis le pardon comme acte de libération", text: "Le pardon n'est pas une absolution de ce qui a été fait. Ce n'est pas non plus un sentiment. C'est une décision volontaire de te libérer du poids de la dette que tu portes contre quelqu'un. Henry Cloud écrit : *« Pardonner, c'est renoncer à l'espoir d'un passé différent. »* C'est un acte de souveraineté intérieure, pas de faiblesse." },
          { title: "Remplace la croyance blessée par une vérité d'identité", text: "Pour chaque conclusion toxique que tu as tirée de ta blessure (« je ne suis pas assez bien », « personne ne reste »), identifie la vérité de l'Écriture qui la contredit. *« Je suis fait(e) à l'image de Dieu »* (Genèse 1.27). *« Dieu ne t'abandonnera jamais »* (Hébreux 13.5). Répète ces vérités jusqu'à ce qu'elles descendent de la tête dans le cœur — c'est le renouvellement de l'intelligence de Romains 12.2 en action." },
          { title: "Pratique la nouvelle réponse délibérément", text: "La guérison intérieure doit se traduire en nouveaux comportements. Chaque fois qu'un déclencheur se manifeste, fais une pause et choisis délibérément une réponse différente de ton automatisme habituel. Cela demande de la pratique répétée — comme une rééducation après une blessure physique." },
        ] },
        {
          type: "callout", tone: "neutral", title: "Le rôle indispensable du coach ou du mentor de vie",
          blocks: [
            { type: "p", text: "Le chemin de la guérison intérieure peut être entrepris seul(e). Mais il ne devrait pas l'être. Il existe une limite fondamentale à l'auto-thérapie : on ne peut pas, en même temps, être le patient et le chirurgien. Les angles morts sur soi-même le sont précisément parce qu'on ne les voit pas." },
            { type: "p", text: "Un coach chrétien de vie ou un mentor de foi expérimenté joue un rôle que personne d'autre ne peut tenir :" },
            { type: "points", items: [
              { lead: "Il te voit de l'extérieur.", text: "Il repère les schémas que tu ne peux pas voir toi-même parce que tu es à l'intérieur." },
              { lead: "Il nomme sans juger.", text: "Il crée un espace de sécurité où tu peux exprimer tes blessures sans honte et recevoir une perspective bienveillante mais juste." },
              { lead: "Il te responsabilise.", text: "La croissance sans reddition de comptes est lente. Un coach te pose les bonnes questions, te rappelle tes engagements et célèbre tes progrès avec toi." },
              { lead: "Il prie avec toi.", text: "La dimension spirituelle de la guérison est irremplaçable, et un bon coach chrétien sait quand la prière est plus puissante que la méthode." },
              { lead: "Il connaît ses limites.", text: "Un bon coach sait aussi quand t'orienter vers un thérapeute chrétien ou un *counselor* si la blessure dépasse le cadre du coaching." },
            ] },
            { type: "p", text: "Sur Garden of Alliance, nous t'encourageons fortement à te connecter avec un coach ou mentor de la communauté avant ou pendant ta démarche de rencontre. Ce n'est pas un signe de faiblesse — c'est la marque d'une intelligence émotionnelle et spirituelle mature." },
          ],
        },
        { type: "authorQuote", text: "Personne ne se guérit vraiment seul. Nous avons été créés pour la communauté — et la guérison se produit là où quelqu'un d'autre est assez courageux pour entrer dans notre douleur avec nous.", author: "Dr. Larry Crabb, psychologue chrétien, auteur de *Se connecter*" },
        {
          type: "callout", tone: "info", title: "Ta prochaine étape concrète",
          blocks: [
            { type: "p", text: "Ne laisse pas cette leçon rester dans ta tête. Dès aujourd'hui :" },
            { type: "steps", items: [
              "Complète la fiche pratique d'identification ci-dessus (prends le temps qu'il faut).",
              "Identifie ta blessure principale et la conclusion toxique qu'elle t'a fait tirer sur toi-même.",
              "Trouve une vérité biblique qui contredit directement cette conclusion et écris-la sur un post-it visible.",
              "Considère sérieusement l'idée de contacter un coach ou mentor de confiance pour t'accompagner.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Réponds à ces questions pour valider ta compréhension du chemin de guérison.",
  quiz: [
    {
      question: "Pourquoi les blessures du passé sont-elles si dangereuses dans une relation amoureuse ?",
      options: [
        "Parce qu'elles empêchent de sortir avec quelqu'un de différent de son ex.",
        "Parce qu'elles agissent comme une alarme hypersensible qui déforme la perception du présent et pilote nos réactions à notre place.",
        "Parce qu'elles rendent la personne trop émotive pour se marier.",
      ],
      answer: 1,
      explanation: "La blessure non guérie ne reste jamais dans le passé — elle voyage et se projette sur les situations et les personnes présentes.",
    },
    {
      question: "Qu'est-ce que le pardon représente réellement dans le chemin de guérison ?",
      options: [
        "Une façon de dire que ce qui s'est passé était acceptable.",
        "Un sentiment qu'on attend patiemment d'éprouver un jour naturellement.",
        "Une décision volontaire de se libérer du poids de la dette, indépendamment des émotions du moment.",
      ],
      answer: 2,
      explanation: "Le pardon est un acte de souveraineté, non un sentiment. Il nous libère avant de libérer l'autre — souvent même sans que l'autre le sache.",
    },
    {
      question: "Pourquoi le coach ou mentor joue-t-il un rôle irremplaçable dans la guérison intérieure ?",
      options: [
        "Parce qu'il connaît la Bible mieux que nous.",
        "Parce qu'on ne peut pas simultanément être le patient et le chirurgien — nos angles morts nous sont invisibles par définition.",
        "Parce qu'il nous dit quoi faire dans nos choix amoureux.",
      ],
      answer: 1,
      explanation: "Le regard extérieur bienveillant d'un coach permet de voir ce que l'on ne peut pas voir de l'intérieur, et d'avancer plus vite et plus loin.",
    },
    {
      question: "Parmi les huit blessures identifiées dans la leçon, laquelle génère typiquement un besoin chronique de validation externe ?",
      options: ["La blessure de trahison.", "La blessure d'injustice.", "La blessure de dévalorisation."],
      answer: 2,
      explanation: "Celui ou celle qui n'a jamais été suffisamment reconnu(e) cherche à combler ce manque dans ses relations adultes, souvent en s'effaçant ou en sur-performant pour être aimé(e).",
    },
  ],
  reflection: {
    title: "Défi personnel",
    prompt: "En complétant la fiche d'identification, quelle a été la révélation la plus difficile à accueillir sur toi-même ? Qu'est-ce que cette révélation te dit sur le conjoint que tu as inconsciemment cherché jusqu'ici ? Et sur le conjoint dont tu as véritablement besoin ?",
  },
};

/* ───────────────────────────── Leçon 2.3 ───────────────────────────── */

const lecon23: Lesson = {
  number: "2.3",
  slug: "2-3",
  title: "La rupture avec les schémas relationnels toxiques et familiaux",
  image: { src: POSTERS["2-3"].src, card: card("lecon-2-3"), alt: POSTERS["2-3"].alt },
  poster: POSTERS["2-3"],
  pdf: `${BASE}/pdf/lecon-2-3-la-rupture-avec-les-schemas-toxiques.pdf`,
  readingMinutes: 10,
  intro: {
    heading: "L'héritage invisible et le piège du « déjà-vu » relationnel",
    blocks: [
      { type: "p", text: "As-tu déjà eu le sentiment troublant de réécrire la même histoire d'amour, avec des visages différents ? De retomber systématiquement sur des personnes indisponibles, émotionnellement distantes, contrôlantes ou dépendantes ? Ou encore de constater avec effroi que tu reproduis dans tes relations les exacts travers ou conflits que tu détestais chez tes propres parents ?" },
      { type: "p", text: "Ce phénomène n'est ni de la malchance, ni une fatalité spirituelle subie : c'est l'action inconsciente des **schémas relationnels toxiques** et des **fidélités familiales invisibles**. Nous entrons souvent dans l'âge adulte en portant des « lunettes relationnelles » façonnées par le modèle de nos parents et par les rôles qui nous ont été attribués dans notre enfance." },
      { type: "p", text: "La Parole de Dieu reconnaît cette transmission intergénérationnelle tout en nous appelant à la liberté. Dans 1 Pierre 1.18, il est écrit que nous avons été rachetés de la *« vaine manière de vivre que nous avions héritée de nos pères »*. Le mariage et les relations de couple sous l'Alliance de la grâce ne sont pas destinés à prolonger les dysfonctionnements du passé, mais à fonder une nouvelle culture de royaume." },
      { type: "authorQuote", text: "Tant que vous ne rendez pas l'inconscient conscient, il dirigera votre vie relationnelle et vous l'appellerez le destin ou la volonté de Dieu.", author: "Dr. Tim Clinton, psychologue chrétien et président de l'AACC" },
    ],
  },
  objective: "Te donner les outils psychologiques et spirituels pour identifier tes fidélités familiales invisibles, démasquer tes pièges relationnels répétitifs, briser le cycle des schémas toxiques, et établir une indépendance affective et spirituelle saine avant de t'engager dans le mariage.",
  parts: [
    {
      heading: "Les fidélités invisibles et les schémas familiaux hérités",
      blocks: [
        { type: "p", text: "Les thérapies systémiques et familiales démontrent que chaque famille fonctionne comme un système doté de règles non écrites, d'interdits et de loyautés sous-jacentes. En tant qu'enfants, pour être aimés, acceptés ou survivre dans l'écosystème familial, nous développons des **loyautés invisibles**. Une loyauté invisible est un engagement inconscient à répéter un comportement, souffrir d'un même manque ou adopter une même posture pour ne pas « trahir » son clan familial." },
        { type: "p", text: "**Les 4 rôles d'enfance qui poursuivent le célibataire :**" },
        { type: "points", items: [
          { lead: "Le Sauveur / le Parentifié :", text: "enfant qui a dû consoler un parent triste, réguler les émotions des adultes ou porter les responsabilités de la maison. **Dans le célibat :** attiré(e) uniquement par des personnes blessées, à « réparer » ou à secourir." },
          { lead: "Le Bouc émissaire :", text: "enfant qui portait la faute des dysfonctionnements de la maison. **Dans le célibat :** s'attend toujours à être rejeté(e), s'auto-sabote dès qu'une relation va bien car le bonheur lui semble anormal." },
          { lead: "L'Enfant invisible / l'Effacé(e) :", text: "enfant qui a appris à ne rien demander et à ne pas déranger pour ne pas alourdir la charge familiale. **Dans le célibat :** incapable d'exprimer ses besoins, s'écrase face au partenaire, accepte les miettes d'attention." },
          { lead: "Le Héros / le Surperformeur :", text: "enfant dont la valeur dépendait uniquement des succès et de l'honneur rapporté à la famille. **Dans le célibat :** aborde la rencontre comme une compétition, cherche un partenaire « trophée » ou fuit la vulnérabilité par peur d'être percé(e) à jour." },
        ] },
        { type: "authorQuote", text: "On ne quitte pas vraiment sa famille d'origine en déménageant physiquement. On la quitte quand on cesse d'exécuter inconsciemment ses mandats invisibles et qu'on définit sa propre identité en Christ.", author: "Dr. Henry Cloud, psychologue et auteur de *Changer votre vie par les limites*" },
      ],
    },
    {
      heading: "Les 5 pièges relationnels répétitifs (les schémas toxiques)",
      blocks: [
        { type: "p", text: "Lorsque ces rôles et blessures d'enfance ne sont pas traités, ils se cristallisent en schémas relationnels répétitifs dans la vie amoureuse :" },
        { type: "titledSteps", items: [
          { title: "Le piège du choix de l'indisponible", text: "S'attacher systématiquement à des personnes mariées, émotionnellement distantes, incertaines ou vivant à l'autre bout du monde. Cela permet inconsciemment d'éviter la vraie intimité tout en rejouant le rejet d'origine." },
          { title: "Le piège du syndrome du sauveur (codépendance)", text: "Confondre l'amour avec la pitié ou le secours. Croire que sous notre amour, le partenaire toxique, infidèle ou instable va magiquement changer." },
          { title: "Le piège de la soumission anxieuse", text: "Abandonner ses valeurs, ses limites et son identité pour garder l'autre. Peur panique de dire « non » de peur d'être quitté(e)." },
          { title: "Le piège de l'évitement hyper-indépendant", text: "Trouver un défaut éliminatoire à chaque prétendant(e) dès que la relation devient sérieuse, pour fuir avant d'être vulnérable." },
          { title: "Le piège de la répétition du modèle parental toxique", text: "Épouser une personne qui possède exactement les traits destructeurs du père ou de la mère (colère, contrôle, mutisme, manipulation…) dans l'espoir inconscient de « gagner » enfin l'amour qu'on n'a pas eu enfant." },
        ] },
        { type: "authorQuote", text: "Choisir un conjoint pour réparer son enfance est la garantie de transformer son mariage en champ de bataille. Le mariage n'est pas un centre de réhabilitation pour votre passé.", author: "Dr. Dan Allender, auteur chrétien et spécialiste du trauma relationnel" },
        {
          type: "worksheet",
          title: "Diagnostic des loyautés et schémas relationnels",
          intro: "Réponds en toute sincérité pour mettre en lumière les schémas invisibles qui gouvernent tes choix affectifs.",
          sections: [
            { title: "Section 1 — Analyse du modèle conjugal parental", items: [
              "Quels étaient les modes de gestion des conflits entre tes parents ? (Cris, silences punitifs, évitement, domination, dialogue respectueux…)",
              "Quelle phrase résumerait la vision du mariage transmise par ta famille ? (« On ne peut faire confiance à personne », « Le mariage est un piège », « L'homme/la femme finit toujours par trahir »…)",
              "Quel rôle as-tu joué dans ton enfance ? Coche le plus dominant : le Sauveur / Parentifié (médiateur des parents, soutien émotionnel) · le Bouc émissaire (porteur des problèmes de la famille) · l'Effacé(e) / Invisible (discret, sans demande) · le Surperformeur / Héros (validé par les réussites).",
            ] },
            { title: "Section 2 — Identification de ton schéma relationnel répétitif", intro: "Coche les affirmations qui décrivent ton historique relationnel :", items: [
              "Je suis attiré(e) principalement par des personnes que je dois aider, encourager ou spirituellement « porter ».",
              "Dès qu'une personne s'intéresse vraiment à moi et se montre disponible, elle perd son attrait à mes yeux.",
              "J'accepte régulièrement des comportements qui manquent de respect pour ne pas gâcher une chance d'être en couple.",
              "Mes amis me disent souvent : « Tu choisis toujours le même type de personne ! »",
              "J'ai peur d'être étouffé(e) ou d'être contrôlé(e) si je m'engage pleinement.",
            ] },
            { title: "Section 3 — Repérage des liens de loyauté invisible", items: [
              "Y a-t-il un tabou, une souffrance ou un échec conjugal récurrent dans ta famille (divorces systématiques, célibat subi, infidélités) que tu crains inconsciemment d'éviter ou au contraire de répéter ?",
              "As-tu l'impression que réussir ta vie de couple ou dépasser le niveau de bonheur conjugal de tes parents serait une forme de culpabilité ou de trahison envers eux ?",
            ] },
          ],
        },
      ],
    },
    {
      heading: "Guide pratique de rupture avec les schémas toxiques",
      blocks: [
        { type: "p", text: "Sortir d'un schéma répétitif exige un acte délibéré de rupture spirituelle, émotionnelle et comportementale. Dieu nous donne l'autorité d'arrêter le cours des héritages négatifs." },
        { type: "titledSteps", items: [
          { title: "Prendre conscience et verbaliser le schéma", text: "On ne peut pas combattre un ennemi qu'on refuse de nommer. Écris clairement ton schéma récurrent sur papier : *« Jusqu'ici, j'ai eu la tendance à choisir des partenaires indisponibles par peur d'être vraiment vu(e) et rejeté(e). »* Le simple fait de le verbaliser enlève au schéma son pouvoir hypnotique." },
          { title: "Appliquer Genèse 2.24 : « quitter » spirituellement et émotionnellement", text: "*« C'est pourquoi l'homme quittera son père et sa mère… »* Quitter ne veut pas dire couper les ponts avec haine, mais accomplir la différenciation de soi. Déclare dans la prière que tu renonces aux attentes, aux malédictions verbales, aux loyautés invisibles et aux modèles conjugaux dysfonctionnels de ta lignée." },
          { title: "Redéfinir la grille de sélection (la liste d'attraction renouvelée)", text: "Si ton « radar amoureux » a été faussé par ton passé, ce qui t'attire naturellement (l'étincelle toxique) est souvent un danger. Réécris les critères de ton futur conjoint non pas sur la base de la passion impulsive, mais sur la sécurité émotionnelle, la maturité spirituelle, le respect et la paix intérieure." },
          { title: "Poser des limites fermes dès les premiers échanges", text: "Les schémas toxiques s'infiltrent par l'absence de limites. Apprends à dire non aux premiers signaux d'alarme (*red flags*) : irrespect, incohérences, drague agressive, indisponibilité émotionnelle. Ne négocie pas tes valeurs pour garder une présence." },
          { title: "Prier pour la rupture des liens d'âme toxiques du passé", text: "Si tu as eu des relations intimes ou des engagements émotionnels profonds avec des personnes toxiques ou manipulatrices, il convient de couper formellement ces liens d'âme dans la prière au nom de Jésus, en réclamant la purification de tes émotions et de ta mémoire." },
        ] },
        {
          type: "callout", tone: "neutral", title: "L'accompagnement par un coach ou mentor dans la rupture des schémas",
          blocks: [
            { type: "p", text: "**Pourquoi la rupture des schémas familiaux et toxiques nécessite-t-elle souvent un mentorat ou un coaching ?**" },
            { type: "p", text: "Parce que les schémas répétitifs créent une « zone de confort toxique ». Même si un comportement nous fait souffrir, il nous est familier. Choisir un partenaire sain peut au début sembler « ennuyeux » à quelqu'un d'habitué aux montagnes russes émotionnelles." },
            { type: "p", text: "Le coach ou mentor Garden of Alliance intervient pour :" },
            { type: "points", items: [
              { lead: "Servir de décodeur relationnel :", text: "il t'aide à analyser objectivement les profils et les échanges sans laisser tes anciens réflexes prendre le dessus." },
              { lead: "Valider les signaux d'alerte (red flags) et de sécurité (green flags) :", text: "il t'aide à distinguer l'amour véritable de la séduction manipulatrice." },
              { lead: "T'accompagner dans la traversée du malaise de la nouveauté :", text: "te soutenir lorsque tu apprends à poser des limites pour la première fois." },
              { lead: "Te tenir redevable de tes engagements :", text: "empêcher que tu ne retombes dans les bras d'un ex toxique lors des moments de solitude." },
            ] },
          ],
        },
        { type: "authorQuote", text: "La liberté relationnelle ne consiste pas à n'avoir aucun passé, mais à ne plus laisser le passé dicter la personne que vous autorisez à entrer dans votre futur.", author: "Dr. John Townsend, psychologue chrétien" },
        {
          type: "callout", tone: "info", title: "Ta feuille de route pour cette leçon",
          blocks: [
            { type: "steps", items: [
              "Complète attentivement la fiche pratique ci-dessus.",
              "Identifie ton schéma relationnel récurrent le plus évident.",
              "Rédige une prière de renoncement et de délivrance par rapport aux loyautés familiales négatives.",
              "Partage ce diagnostic avec ton coach ou mentor pour verrouiller tes nouveaux critères de choix.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Réponds à ces questions pour valider ta compréhension des schémas relationnels.",
  quiz: [
    {
      question: "Qu'est-ce qu'une « loyauté invisible » dans le contexte familial ?",
      options: [
        "Un contrat notarié hérité des grands-parents.",
        "Un engagement inconscient à répéter un dysfonctionnement ou un manque familial pour ne pas avoir l'impression de trahir son clan.",
        "Une obligation biblique d'obéir à ses parents toute sa vie sans réserve.",
      ],
      answer: 1,
      explanation: "La loyauté invisible nous pousse à reproduire des échecs ou des postures toxiques par solidarité inconsciente avec notre famille d'origine.",
    },
    {
      question: "Quel est le danger principal du rôle de « l'enfant Sauveur / Parentifié » dans le célibat ?",
      options: [
        "Il devient trop égoïste dans ses choix.",
        "Il est attiré uniquement par des personnes à réparer ou à secourir, confondant l'amour avec la pitié.",
        "Il refuse de prier pour son futur conjoint.",
      ],
      answer: 1,
      explanation: "Celui qui a dû porter ses parents cherchera inconsciemment un partenaire dépendant ou blessé, créant une relation déséquilibrée et épuisante.",
    },
    {
      question: "Pourquoi une personne habituée aux relations toxiques trouve-t-elle parfois une personne saine « ennuyeuse » au début ?",
      options: [
        "Parce que les personnes saines manquent de spiritualité.",
        "Parce que le cerveau a associé l'amour à l'anxiété et aux montagnes russes émotionnelles ; la paix de la sécurité est perçue à tort comme un manque de passion.",
        "Parce que les personnes saines ne savent pas communiquer.",
      ],
      answer: 1,
      explanation: "La familiarité du drame crée un faux sentiment d'intensité. Déprogrammer ce réflexe est essentiel pour apprécier un amour paisible et constructif.",
    },
    {
      question: "Que signifie véritablement « quitter son père et sa mère » selon Genèse 2.24 pour un adulte célibataire ?",
      options: [
        "Couper tout contact et rejeter ses parents.",
        "Déménager dans une autre ville.",
        "Accomplir sa différenciation émotionnelle et spirituelle en renonçant aux modèles et loyautés dysfonctionnels pour fonder sa propre culture en Christ.",
      ],
      answer: 2,
      explanation: "Quitter est un processus d'autonomie et de maturité globale qui libère le célibataire pour construire un foyer aligné sur le Royaume.",
    },
  ],
  reflection: {
    title: "Défi personnel",
    prompt: "En analysant tes relations passées, quel est le *red flag* (signal d'alarme) que tu as le plus souvent ignoré chez les personnes qui t'attiraient ? Quelle décision concrète prends-tu aujourd'hui pour ne plus jamais fermer les yeux sur ce signal ?",
  },
};

/* ───────────────────────────── Leçon 2.4 ───────────────────────────── */

const lecon24: Lesson = {
  number: "2.4",
  slug: "2-4",
  title: "Clarifier ses attentes, ses valeurs non négociables et ses besoins affectifs",
  image: { src: PILLAR_2_POSTER.src, card: card("lecon-2-4"), alt: "Une femme se regarde dans un miroir où s'inscrivent ses forces, ses besoins, ses émotions, ses valeurs et ses rêves." },
  poster: PILLAR_2_POSTER,
  pdf: `${BASE}/pdf/lecon-2-4-clarifier-ses-attentes-valeurs-et-besoins.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "Le danger des illusions et de la confusion des critères",
    blocks: [
      { type: "p", text: "L'une des causes majeures de déception ou d'échec dans les fréquentations chrétiennes réside dans le manque de clarté sur trois piliers fondamentaux : **les besoins affectifs, les valeurs non négociables et les attentes relationnelles.** De nombreux célibataires abordent les rencontres avec un mélange confus de critères superficiels (taille, style, statut social) et d'attentes irréalistes (que l'autre devine leurs pensées ou répare leurs blessures), tout en étant incapables d'identifier leurs véritables besoins affectifs profonds." },
      { type: "verse", text: "C'est par la sagesse qu'une maison s'élève, et par l'intelligence qu'elle s'affermit ; c'est par la science que les chambres se remplissent de tous les biens précieux et agréables.", ref: "Proverbes 24.3-4" },
      { type: "p", text: "Bâtir un foyer ne commence pas par une étincelle romantique aveugle, mais par une connaissance lucide de ce qui constitue la structure spirituelle et émotionnelle de ton projet de vie." },
      { type: "authorQuote", text: "Si vous ne savez pas exactement ce dont vous avez besoin pour être épanoui et en sécurité dans une relation, vous accepterez n'importe quoi par peur d'être seul, ou vous rejetterez d'excellents partenaires sur des détails insignifiants.", author: "Dr. Gary Chapman, auteur des *5 langages de l'amour*" },
    ],
  },
  objective: "Te guider pas à pas dans la clarification de tes besoins affectifs essentiels, l'établissement rigoureux de tes valeurs non négociables, et la déconstruction des attentes fantasmées afin d'aborder la recherche de conjoint avec un discernement aiguisé.",
  parts: [
    {
      heading: "Identifier et hiérarchiser ses besoins affectifs profonds",
      blocks: [
        { type: "p", text: "Un besoin affectif n'est pas un caprice ou une exigence égoïste ; c'est un réservoir émotionnel indispensable à l'épanouissement humain. Le Dr. Willard Harley (auteur de *His Needs, Her Needs*) a démontré que la plupart des conflits conjugaux naissent de besoins affectifs majeurs ignorés ou négligés." },
        { type: "p", text: "**Les 5 grands besoins affectifs récurrents :**" },
        { type: "titledSteps", items: [
          { title: "Le besoin d'affection et de tendresse", text: "Se sentir entouré(e), valorisé(e) et rassuré(e) par des gestes, des mots doux et une présence attentive." },
          { title: "Le besoin de communication et de partage émotionnel", text: "Avoir un partenaire avec qui échanger profondément sur ses pensées, ses émotions, ses projets et sa foi sans crainte d'être jugé(e)." },
          { title: "Le besoin d'honnêteté et de transparence totale", text: "Se sentir en sécurité absolue grâce à une vérité constante, sans cachotteries ni zones d'ombre." },
          { title: "Le besoin de soutien et d'encouragement de la destinée", text: "Avoir un conjoint qui croit en tes dons, soutient ta vision et t'élève au lieu de te ralentir ou de rivaliser avec toi." },
          { title: "Le besoin de partage des responsabilités et de sécurité", text: "Pouvoir compter sur la fiabilité du conjoint dans l'organisation de la vie quotidienne, la gestion du foyer et l'éducation future." },
        ] },
        { type: "authorQuote", text: "Connaître ses besoins affectifs majeurs, c'est savoir quel carburant votre cœur demande pour fonctionner. Prétendre qu'on n'a besoin de rien est une fausse humilité qui mène au ressentiment.", author: "Dr. Les Parrott, psychologue et co-auteur de *Saving Your Marriage Before It Starts*" },
      ],
    },
    {
      heading: "Établir ses valeurs non négociables",
      blocks: [
        { type: "p", text: "Une valeur non négociable est un principe de vie spirituel, moral ou existentiel sur lequel aucun compromis n'est possible sans détruire la conscience ou l'alignement avec Dieu (2 Corinthiens 6.14)." },
        { type: "p", text: "**Différence entre valeurs non négociables et préférences secondaires :**" },
        {
          type: "callout", tone: "neutral", title: "Valeurs non négociables — les fondations de la maison",
          blocks: [{ type: "points", items: [
            { lead: "L'alignement spirituel vivant :", text: "une foi personnelle active en Christ, une marche de disciple et non une simple étiquette religieuse." },
            { lead: "L'intégrité morale et le caractère :", text: "l'honnêteté, le respect des limites, la fidélité et la capacité à reconnaître ses torts." },
            { lead: "La vision de la famille et du mariage :", text: "l'accord sur le mariage comme alliance sacrée indissoluble, le désir d'enfants et les principes éducatifs fondamentaux." },
            { lead: "L'absence de dépendances activement subies :", text: "pas d'addiction non traitée (pornographie, substances, jeu, violence) masquée par des promesses." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "Préférences secondaires — la décoration de la maison (flexibilité)",
          blocks: [{ type: "points", items: [
            { lead: "Les critères physiques stricts", text: "(taille, style vestimentaire, couleur des yeux)." },
            { lead: "Les hobbys ou loisirs spécifiques", text: "(aimer le même sport, la même musique)." },
            { lead: "Le niveau de revenus initial ou le statut social de départ", text: "(qui peuvent évoluer)." },
          ] }],
        },
        { type: "authorQuote", text: "La tragédie de beaucoup de célibataires est qu'ils sont inflexibles sur leurs préférences secondaires (le physique, le style) et scandaleusement tolérants sur les valeurs non négociables (le caractère, la foi).", author: "Dr. Henry Cloud, auteur de *Boundaries in Dating*" },
      ],
    },
    {
      heading: "Démasquer et déconstruire les attentes irréalistes",
      blocks: [
        { type: "p", text: "Il est vital de faire le tri entre un besoin légitime et un fantasme irréaliste. Les attentes toxiques les plus fréquentes chez les célibataires chrétiens :" },
        { type: "points", items: [
          { lead: "Le mythe de l'âme sœur parfaite :", text: "croire qu'il existe une personne taillée sur mesure avec qui il n'y aura jamais aucun désaccord, aucun effort ni aucun conflit." },
          { lead: "Le syndrome du conjoint sauveur / guérisseur :", text: "attendre du conjoint qu'il comble la solitude intérieure, répare la blessure d'abandon du passé ou remplace le rôle d'un parent déficient." },
          { lead: "La télépathie relationnelle :", text: "attendre que l'autre « devine » automatiquement nos besoins sans que nous ayons à les verbaliser clairement." },
        ] },
        {
          type: "worksheet",
          title: "La matrice de clarification relationnelle",
          intro: "Complète cette matrice à trois colonnes pour structurer rigoureusement ton discernement.",
          sections: [
            { title: "Colonne 1 — Mes 3 besoins affectifs majeurs", intro: "Quels sont les 3 besoins sans lesquels tu te sens vide ou insécurisé(e) dans une relation ?", items: ["Premier besoin :", "Deuxième besoin :", "Troisième besoin :"] },
            { title: "Colonne 2 — Mes 5 valeurs non négociables", intro: "Quels sont les 5 principes absolus sur lesquels aucun compromis n'est possible ?", items: ["Première valeur :", "Deuxième valeur :", "Troisième valeur :", "Quatrième valeur :", "Cinquième valeur :"] },
            { title: "Colonne 3 — Mes domaines de flexibilité (préférences)", items: ["Sur quels critères (physiques, culturels, secondaires) acceptes-tu d'être souple et ouvert(e) à la surprise de Dieu ?"] },
          ],
        },
      ],
    },
    {
      heading: "Comment exprimer ses attentes avec clarté sans imposer de carcan",
      blocks: [
        { type: "p", text: "Savoir ce que l'on veut est une chose ; savoir l'exprimer dans les fréquentations en est une autre." },
        { type: "titledSteps", items: [
          { title: "Communiquer par l'observation et la curiosité", text: "Au lieu de présenter une liste d'exigences comme dans un entretien d'embauche, pose des questions ouvertes sur la foi, la famille, le pardon et les projets de vie lors de tes échanges." },
          { title: "Évaluer les actes plutôt que les déclarations d'intention", text: "Une personne peut réciter la liste exacte de tes attentes théoriques. Observe sa constance dans le temps, son comportement sous le stress et sa façon de traiter les personnes plus faibles." },
        ] },
        {
          type: "callout", tone: "neutral", title: "Le rôle du coach / mentor dans la clarification des critères",
          blocks: [
            { type: "p", text: "**Pourquoi débriefer sa grille de critères avec un mentor Garden of Alliance ?**" },
            { type: "points", items: [
              { lead: "Vérifier la réalisabilité de tes attentes :", text: "t'aider à repérer si ta liste de critères ne masque pas une peur inconsciente de l'engagement." },
              { lead: "Arbitrer entre non-négociable et préférence :", text: "t'aider à ne pas éliminer un partenaire d'une grande valeur spirituelle pour un détail secondaire." },
              { lead: "T'aider à formuler tes besoins sans agressivité :", text: "t'entraîner à verbaliser tes attentes dès les premiers mois de fréquentation." },
            ] },
          ],
        },
        { type: "authorQuote", text: "Clarifier ses attentes n'est pas fermer la porte à la grâce, c'est préparer la maison pour qu'elle puisse accueillir un amour durable et sain.", author: "Dr. Tim Clinton, psychologue chrétien" },
        {
          type: "callout", tone: "info", title: "Ta feuille de route pour cette leçon",
          blocks: [
            { type: "steps", items: [
              "Complète la matrice de clarification relationnelle dans la fiche pratique.",
              "Révise tes critères actuels et fais passer de la catégorie « exigence absolue » à « préférence souple » tout ce qui n'est pas d'ordre spirituel ou moral.",
              "Partage cette matrice avec ton mentor Garden of Alliance pour validation.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Réponds à ces questions pour valider ta compréhension de tes critères.",
  quiz: [
    {
      question: "Quelle est la différence majeure entre une valeur non négociable et une préférence secondaire ?",
      options: [
        "La valeur non négociable touche au caractère, à la foi et à l'alignement moral indissoluble ; la préférence est un détail (physique, loisir) sur lequel on peut être souple.",
        "Les préférences secondaires sont plus importantes que la foi.",
        "Il n'y a aucune différence.",
      ],
      answer: 0,
      explanation: "Être rigide sur les valeurs non négociables et souple sur les préférences est la marque de la sagesse relationnelle.",
    },
    {
      question: "Pourquoi est-il dangereux de confondre un besoin affectif majeur avec un caprice ?",
      options: [
        "Parce que cela nous empêche d'acheter ce qu'on veut.",
        "Parce qu'ignorer ses besoins affectifs profonds amène à accepter des relations insécurisantes ou à nourrir du ressentiment dans le couple.",
        "Parce que la Bible interdit d'avoir des besoins.",
      ],
      answer: 1,
      explanation: "Identifier ses besoins affectifs majeurs permet d'exprimer ce dont notre cœur a besoin pour s'épanouir sereinement.",
    },
    {
      question: "Quel piège représente le « mythe du conjoint sauveur » ?",
      options: [
        "Vouloir épouser un médecin.",
        "Attendre du conjoint qu'il guérisse nos blessures du passé et comble notre vide d'identité à la place de Dieu.",
        "Prier pour son futur conjoint.",
      ],
      answer: 1,
      explanation: "Seul Christ guérit et fonde notre identité ; demander cela à un être humain crée une pression destructrice.",
    },
    {
      question: "Comment le coach ou mentor Garden of Alliance intervient-il dans la clarification des critères ?",
      options: [
        "En choisissant lui-même notre conjoint.",
        "En nous aidant à vérifier l'équilibre de notre grille de critères et à distinguer l'essentiel du secondaire.",
        "En supprimant notre profil s'il n'est pas d'accord.",
      ],
      answer: 1,
      explanation: "Le mentor offre le recul nécessaire pour ne pas passer à côté de pépites relationnelles par excès de perfectionnisme.",
    },
  ],
  reflection: {
    title: "Défi personnel",
    prompt: "En relisant ta liste de critères d'avant cette leçon, quel est le critère superficiel que tu décides d'abandonner aujourd'hui pour faire de la place à la sagesse de Dieu ?",
  },
};

/* ───────────────────────────── Leçon 2.5 ───────────────────────────── */

const lecon25: Lesson = {
  number: "2.5",
  slug: "2-5",
  title: "L'estime de soi, l'autonomie affective et le célibat épanoui",
  image: { src: POSTERS["2-5"].src, card: card("lecon-2-5"), alt: POSTERS["2-5"].alt },
  poster: POSTERS["2-5"],
  pdf: `${BASE}/pdf/lecon-2-5-estime-de-soi-et-celibat-epanoui.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "Sortir de la mentalité de la « salle d'attente »",
    blocks: [
      { type: "p", text: "L'un des mensonges les plus répandus dans la culture chrétienne consiste à considérer le célibat comme une simple « salle d'attente » ou une parenthèse incomplète en attendant que la « vraie vie » commence avec le mariage. Beaucoup de célibataires vivent ainsi leur quotidien avec un sentiment de manque, d'urgence ou d'infériorité, suspendant leurs projets, leur bonheur et leur épanouissement personnel à l'arrivée d'un conjoint." },
      { type: "p", text: "La Parole de Dieu offre une perspective radicalement différente. Dans 1 Corinthiens 7.32-35, l'apôtre Paul présente le célibat non comme une punition, mais comme une saison de liberté extraordinaire, de consécration sans distraction et de plénitude. De même, le Psaume 139.14 rappelle que ta valeur personnelle est entière, célébrée et scellée en Dieu dès aujourd'hui :" },
      { type: "verse", text: "Je te loue de ce que je suis une créature si merveilleuse.", ref: "Psaume 139.14" },
      { type: "authorQuote", text: "Si vous n'êtes pas heureux et complet en tant que célibataire, vous ne le serez pas non plus en tant que marié. Le mariage n'est pas la source de la joie, c'est le lieu où deux personnes joyeuses partagent leur plénitude.", author: "Dr. Myles Munroe, auteur de *The Purpose and Power of Singleness*" },
    ],
  },
  objective: "Te libérer de la dépendance affective, fortifier ton estime de toi en Christ, et développer une véritable autonomie affective afin de vivre un célibat épanoui, confiant et attractif avant de t'engager dans le mariage.",
  parts: [
    {
      heading: "Fortifier l'estime de soi et déconstruire le sentiment d'incomplétude",
      blocks: [
        { type: "p", text: "L'estime de soi est le regard intérieur que tu portes sur ta propre valeur. Lorsqu'elle est faible, le célibat est vécu comme un verdict d'échec ou de rejet social." },
        { type: "p", text: "**Les 3 piliers d'une estime de soi ancrée en Christ :**" },
        { type: "titledSteps", items: [
          { title: "L'identité d'héritier(e) plutôt que de victime", text: "Réclamer ta valeur absolue fondée sur le prix payé à la croix (1 Pierre 1.18-19), et non sur ton statut sentimental, ton âge ou la présence de prétendants." },
          { title: "La déconstruction de la pression sociale et ecclésiale", text: "Refuser la honte déplacée ou le sentiment d'anormalité souvent entretenus par le regard des autres ou par des enseignements mal formulés." },
          { title: "La célébration de ses réussites et de ses dons", text: "Reconnaître tes compétences, ta beauté intérieure et le chemin parcouru sans attendre l'approbation d'un conjoint potentiel." },
        ] },
        { type: "authorQuote", text: "Vous ne trouverez jamais dans les yeux d'un conjoint l'estime de vous-même que vous n'avez pas trouvée dans les yeux de Dieu.", author: "Dr. Neil Anderson, auteur de *Freedom in Christ*" },
      ],
    },
    {
      heading: "Développer l'autonomie affective plutôt que la dépendance",
      blocks: [
        { type: "p", text: "L'autonomie affective est la capacité d'assumer et d'autoréguler sa propre vie émotionnelle sans dépendre de manière compulsive d'une présence extérieure pour se sentir bien." },
        { type: "p", text: "**Le continuum de l'état affectif :**" },
        { type: "titledSteps", items: [
          { title: "La dépendance affective (toxicité)", text: "*« Sans toi ou sans une relation, je ne suis rien. Je suis anxieux/anxieuse, incomplet(e) et incapable d'être seul(e). »* La personne cherche un conjoint « sauveur »." },
          { title: "L'indépendance défensive (isolement)", text: "*« Je n'ai besoin de personne, je me suffis à moi-même et je ne laisserai personne s'approcher. »* C'est une protection fondée sur la peur d'être blessé(e)." },
          { title: "L'autonomie affective saine (maturité)", text: "*« Je suis paisible, épanoui(e) et complet/complète en Christ (Colossiens 2.10). Je suis capable d'être seul(e) sans détresse, et prêt(e) à m'interconnecter avec un partenaire mûr. »*" },
        ] },
        { type: "authorQuote", text: "Seule une personne affectivement autonome peut entrer dans une interdépendance saine. Sinon, ce n'est pas de l'amour, c'est de l'accrochage de survie.", author: "Dr. Henry Cloud, auteur de *Boundaries in Dating*" },
      ],
    },
    {
      heading: "Clés pratiques pour un célibat épanoui et fécond",
      blocks: [
        { type: "p", text: "Un célibat épanoui est un célibat habité, actif et intentionnel. Voici comment transformer cette saison en accélérateur de destinée :" },
        { type: "points", items: [
          { lead: "Investir dans sa vision de vie personnelle :", text: "développer ses projets professionnels, ministériels, artistiques ou entrepreneuriaux sans attendre le mariage pour foncer." },
          { lead: "Cultiver un réseau amical et spirituel riche :", text: "bâtir des amitiés profondes, authentiques et fraternelles qui nourrissent le besoin d'appartenance et de partage." },
          { lead: "Soigner son bien-être holistique (corps, âme, esprit) :", text: "prendre soin de sa santé physique, de son apparence, de sa culture générale et de son équilibre financier." },
          { lead: "Pratiquer la générosité et le service :", text: "élargir son cœur par l'engagement communautaire et l'impact dans la vie des autres." },
        ] },
        {
          type: "worksheet",
          title: "Diagnostic de l'autonomie affective & bilan de plénitude",
          intro: "Évalue sincèrement ton niveau d'autonomie et d'épanouissement dans ta saison actuelle.",
          sections: [
            { title: "Section 1 — Évaluation de la capacité à être seul(e)", items: [
              "Lorsque tu passes un week-end seul(e) sans projet précis, quelle émotion prédomine ? (Paix / Ennui / Anxiété / Solitude douloureuse / Gratitude)",
              "Te surprends-tu à reporter des projets importants (voyages, achat immobilier, formation…) à « plus tard, quand je serai marié(e) » ? Lesquels ?",
            ] },
            { title: "Section 2 — Test de la posture d'offrant(e) ou de mendiant(e)", intro: "Coche les affirmations qui s'appliquent à ta posture actuelle :", items: [
              "Je suis en paix avec mon célibat aujourd'hui, même si je désire sincèrement le mariage.",
              "Je n'ai pas besoin d'un conjoint pour savoir qui je suis et ce que je vaux.",
              "J'aborde la rencontre avec l'envie de partager ma joie de vivre et mes projets, non pour combler un vide.",
              "J'ai des amitiés solides et épanouissantes sur lesquelles je peux compter au quotidien.",
            ] },
            { title: "Section 3 — Mon plan d'action d'épanouissement immédiat", intro: "Cite 2 activités ou objectifs personnels que tu décides de lancer dès ce mois-ci pour honorer ton célibat épanoui :", items: ["Première activité ou objectif :", "Deuxième activité ou objectif :"] },
          ],
        },
      ],
    },
    {
      heading: "La posture d'attraction du célibataire épanoui dans la rencontre",
      blocks: [
        { type: "p", text: "Rien n'est plus attrayant et magnétique qu'une personne qui s'aime d'un amour sain, qui est en paix avec son présent et qui dégage la sérénité du Seigneur." },
        { type: "titledSteps", items: [
          { title: "Passer du statut de « mendiant d'amour » à « offrant de bénédiction »", text: "Le mendiant cherche un conjoint pour se rassurer ; l'offrant apporte une vie riche, une identité stable et une paix contagieuse. C'est l'offrant que les partenaires mûrs recherchent." },
          { title: "Ne plus tolérer le manque de respect par peur de la solitude", text: "L'autonomie affective te donne le pouvoir le plus précieux dans les fréquentations : la capacité de quitter sereinement une relation toxique ou irrespectueuse parce que tu sais que ta vie est déjà belle avec Dieu." },
        ] },
        {
          type: "callout", tone: "neutral", title: "Le rôle du coach / mentor dans le développement de l'autonomie",
          blocks: [
            { type: "p", text: "**Comment un mentor Garden of Alliance t'accompagne-t-il dans cette étape ?**" },
            { type: "points", items: [
              { lead: "Désamorcer le sentiment de vide :", text: "t'aider à identifier les zones de dépendance affective et à les remplacer par l'ancrage en Christ." },
              { lead: "T'encourager à réaliser tes rêves au présent :", text: "ne pas te laisser suspendre ta vie, mais te stimuler dans tes projets personnels et professionnels." },
              { lead: "Valider ta posture d'offrant(e) :", text: "t'aider à rayonner d'une assurance sereine lors de tes échanges sur la plateforme." },
            ] },
          ],
        },
        { type: "authorQuote", text: "Le célibat épanoui n'est pas le déni du désir de mariage, c'est le refus d'être mis en pause en attendant que le mariage arrive.", author: "Dr. Gary Chapman, auteur et conseiller conjugal" },
        {
          type: "callout", tone: "info", title: "Ta feuille de route pour cette leçon",
          blocks: [
            { type: "steps", items: [
              "Remplis le diagnostic de l'autonomie affective dans la fiche pratique.",
              "Lance dès cette semaine l'une des actions de ton plan d'épanouissement immédiat.",
              "Répète chaque matin : *« Je suis complet/complète en Christ, mon présent est béni et mon avenir est entre ses mains. »*",
              "Débriefe tes progrès avec ton mentor Garden of Alliance.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Réponds à ces questions pour valider ta compréhension du célibat épanoui.",
  quiz: [
    {
      question: "Selon 1 Corinthiens 7.32-35, quelle est la vraie nature de la saison du célibat ?",
      options: [
        "Une salle d'attente douloureuse dont il faut sortir au plus vite.",
        "Une saison de liberté, de consécration sans distraction et de plénitude en Dieu.",
        "Une punition pour des fautes passées.",
      ],
      answer: 1,
      explanation: "Le célibat est une saison noble et féconde que Dieu donne pour construire sa vie et servir avec liberté.",
    },
    {
      question: "Qu'est-ce que l'autonomie affective saine, par opposition à la dépendance affective ?",
      options: [
        "La capacité de vivre sans amis.",
        "La capacité d'assumer sa vie émotionnelle et d'être en paix seul(e) en Christ, sans dépendre de manière compulsive d'une présence amoureuse.",
        "Le fait de rejeter tous les prétendants.",
      ],
      answer: 1,
      explanation: "L'autonomie affective permet d'aimer par choix et par plénitude, et non par peur du vide ou besoin de survie.",
    },
    {
      question: "Pourquoi la posture d'offrant(e) est-elle la plus attractive lors des fréquentations ?",
      options: [
        "Parce qu'elle montre qu'on a beaucoup d'argent.",
        "Parce qu'une personne paisible et complète en Christ dégage une sérénité et une sécurité émotionnelle très attirantes pour un partenaire mûr.",
        "Parce qu'elle n'a besoin de rien ni de personne.",
      ],
      answer: 1,
      explanation: "L'offrant n'étouffe pas l'autre ; il apporte une présence riche et inspirante.",
    },
    {
      question: "Que permet l'autonomie affective face à une relation irrespectueuse ou toxique ?",
      options: [
        "D'accepter le manque de respect pour ne pas se retrouver seul(e).",
        "De pouvoir quitter la relation sereinement et sans panique, sachant que sa valeur et sa joie restent intactes en Dieu.",
        "De bouder pendant des mois.",
      ],
      answer: 1,
      explanation: "L'autonomie affective donne la force de poser des limites fermes et d'éloigner les mauvais profils.",
    },
  ],
  reflection: {
    title: "Défi personnel",
    prompt: "Quel est le projet ou le rêve que tu avais mis « en pause » en attendant le mariage, et que tu décides d'activer dès aujourd'hui avec l'aide de Dieu ?",
  },
};

/* ───────────────────────────── Leçon 2.6 ───────────────────────────── */

const lecon26: Lesson = {
  number: "2.6",
  slug: "2-6",
  title: "La gestion du pardon et la réconciliation avec son histoire",
  image: { src: POSTERS["2-6"].src, card: card("lecon-2-6"), alt: POSTERS["2-6"].alt },
  poster: POSTERS["2-6"],
  pdf: `${BASE}/pdf/lecon-2-6-le-pardon-et-la-reconciliation.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "Le pardon, clé de voûte de la liberté relationnelle",
    blocks: [
      { type: "p", text: "Aucune personne ne peut entrer dans une relation amoureuse épanouie et saine tout en restant enchaînée aux amertumes, aux ressentiments et aux regrets de son passé. Porter une offense non pardonnée, c'est comme boire du poison en espérant que l'autre personne en meure. Dans le contexte des fréquentations et du mariage, l'amertume agit comme une toxine invisible qui contamine nos interprétations, assombrit notre joie et nous pousse à faire payer à notre partenaire actuel les fautes commises par d'autres autrefois." },
      { type: "p", text: "La Parole de Dieu fait du pardon le fondement même de la vie chrétienne et de la maturité. L'apôtre Paul exhorte :" },
      { type: "verse", text: "Que toute amertume, toute animosité, toute colère, toute clameur, toute calomnie, et toute espèce de méchanceté, disparaissent du milieu de vous. Soyez bons les uns envers les autres, compatissants, vous pardonnant réciproquement, comme Dieu vous a pardonné en Christ.", ref: "Éphésiens 4.31-32" },
      { type: "p", text: "De même, Colossiens 3.13 nous rappelle que le pardon n'est pas un luxe facultatif, mais une discipline de liberté." },
      { type: "authorQuote", text: "Pardonner, c'est libérer un prisonnier et découvrir que ce prisonnier, c'était vous-même. Tant que vous refusez de pardonner, vous restez enchaîné à la personne qui vous a blessé.", author: "Dr. Lewis Smedes, théologien, éthicien et auteur de *Forgive and Forget*" },
    ],
  },
  objective: "Te donner les clés théologiques, psychologiques et pratiques pour pardonner à ceux qui t'ont blessé(e), te réconcilier avec ta propre histoire (tes choix passés, tes échecs et ton temps perçu comme « perdu »), et fermer définitivement la porte de l'amertume afin d'entrer libre et léger(e) dans le pilier 3.",
  parts: [
    {
      heading: "Ce que le pardon est et ce qu'il n'est pas",
      blocks: [
        { type: "p", text: "Le plus grand obstacle au pardon réside dans la confusion sur sa définition réelle. Clarifions les malentendus majeurs." },
        { type: "p", text: "**Ce que le pardon n'est pas :**" },
        { type: "points", items: [
          { lead: "Ce n'est pas oublier ou minimiser l'offense :", text: "pardonner ne veut pas dire faire comme si de rien n'était ou prétendre que l'injustice n'était pas grave." },
          { lead: "Ce n'est pas excuser l'injustifiable :", text: "pardonner ne rend pas l'acte acceptable ni légitime." },
          { lead: "Ce n'est pas une réconciliation automatique :", text: "le pardon dépend de toi seul(e) (acte unilatéral) ; la réconciliation exige la repentance sincère et le changement de comportement de l'autre (acte bilatéral). Tu peux pardonner à quelqu'un sans jamais le laisser revenir dans ta vie s'il demeure dangereux ou toxique." },
          { lead: "Ce n'est pas un sentiment vague :", text: "le pardon est une décision de la volonté, non une émotion spontanée. On choisit de pardonner avant d'en ressentir la paix." },
        ] },
        { type: "p", text: "**Ce que le pardon est :**" },
        { type: "p", text: "Le pardon est un acte souverain par lequel tu décides de renoncer à la dette émotionnelle et au droit de vengeance contre celui ou celle qui t'a offensé(e), en remettant le jugement final entre les mains de Dieu (Romains 12.19)." },
        { type: "authorQuote", text: "Pardonner, c'est renoncer à l'espoir d'un passé différent. C'est accepter ce qui a été, cesser d'attendre des excuses qui ne viendront peut-être jamais, et décider de construire son avenir aujourd'hui.", author: "Dr. Henry Cloud, psychologue et auteur de *Changer votre vie par les limites*" },
      ],
    },
    {
      heading: "Les 3 dimensions du pardon et de la réconciliation avec son histoire",
      blocks: [
        { type: "p", text: "Pour être totalement guéri(e), le processus de pardon doit s'appliquer dans trois directions complémentaires :" },
        { type: "titledSteps", items: [
          { title: "Le pardon envers la famille d'origine et les figures d'autorité", text: "Pardonner à tes parents pour leurs limites, leurs absences, leurs paroles blessantes ou leur incapacité à t'offrir l'amour dont tu avais besoin. Les libérer de la dette parentale est la condition pour ne plus chercher un « parent parfait » chez ton conjoint." },
          { title: "Le pardon envers les ex-partenaires et les déceptions amoureuses", text: "Pardonner les trahisons, l'infidélité, l'abandon, la manipulation ou le *ghosting* subis dans tes relations passées. Briser le lien d'amertume empêche de traiter ton futur conjoint comme coupable des fautes commises par d'autres." },
          { title: "Le pardon envers soi-même et la réconciliation avec son propre parcours", text: "C'est souvent le pardon le plus difficile. Pardonner à soi-même pour les mauvaises décisions passées, les relations toxiques prolongées par naïveté, les erreurs morales, ou l'impression d'avoir « gaspillé ses meilleures années ». Dieu ne regrette pas ton histoire : Joël 2.25 promet qu'il restaure les années qu'ont dévorées les sauterelles." },
        ] },
        { type: "authorQuote", text: "Vous ne pouvez pas embrasser l'avenir que Dieu a pour vous si vos mains sont encore occupées à serrer les poignards de l'amertume contre votre passé.", author: "Dr. Dan Allender, spécialiste de la guérison du trauma" },
        {
          type: "worksheet",
          title: "Le protocole du pardon & la lettre de libération",
          intro: "Prends un temps à l'écart pour remplir ce protocole de délivrance émotionnelle.",
          sections: [
            { title: "Section 1 — Inventaire des offenses non réglées", items: [
              "Nomme la personne envers qui tu ressens encore de l'amertume, du ressentiment ou de la colère (parent, ex, ami, soi-même) :",
              "Quelle a été la dette spécifique créée par l'offense ? (« Il m'a volé mon innocence », « Elle m'a trahi(e) », « Je m'en veux d'avoir perdu 5 ans »…)",
            ] },
            { title: "Section 2 — La déclaration de remise de dette (acte de volonté)", intro: "Complète et récite cette prière de renoncement :", items: [
              "« Au nom de Jésus-Christ et par un acte délibéré de ma volonté, je choisis aujourd'hui de pardonner à [nom de la personne]. Je renonce à mon droit de me venger, je renonce à attendre réparation de sa part, et je dépose sa dette au pied de la croix. Je réclame la purification de mes émotions et la liberté totale de mon cœur. »",
              "J'ai prononcé cette prière de décision à voix haute devant Dieu.",
            ] },
            { title: "Section 3 — Réconciliation avec mon propre parcours", items: [
              "Écris une phrase d'auto-compassion et de pardon envers toi-même pour tes erreurs passées :",
            ] },
          ],
        },
      ],
    },
    {
      heading: "Les 4 étapes pour maintenir un cœur pur après le pardon",
      blocks: [
        { type: "p", text: "Le pardon est une décision initiale qui doit être soutenue par une discipline de protection du cœur :" },
        { type: "titledSteps", items: [
          { title: "Refuser de « revisiter la dette » quand la mémoire revient", text: "Quand le souvenir de la blessure refait surface, rappelle à ta pensée : *« J'ai déjà pardonné cette dette à la croix. Je ne rouvre pas ce dossier. »* Ne confonds pas la mémoire du souvenir avec la présence du ressentiment." },
          { title: "Prier pour la bénédiction de l'offenseur (Matthieu 5.44)", text: "C'est le test ultime de la guérison. Demander à Dieu de bénir la personne qui t'a blessé(e) dissout les derniers résidus d'amertume et libère une paix surnaturelle dans ton âme." },
          { title: "Établir des limites saines sans garder de haine", text: "Pardonner à un ex-partenaire ne veut pas dire reprendre contact avec lui ou l'inviter dans ton quotidien. Tu peux pardonner de tout ton cœur tout en maintenant une frontière étanche pour protéger ta paix." },
          { title: "Célébrer la restauration de ton histoire (Joël 2.25)", text: "Regarde ton passé non comme un tas de ruines, mais comme le terreau où Dieu a forgé ta maturité, ta compassion et ton discernement pour ton futur mariage." },
        ] },
        {
          type: "callout", tone: "neutral", title: "Le rôle du coach / mentor dans l'aboutissement du pardon",
          blocks: [
            { type: "p", text: "**Pourquoi débriefer cette étape de clôture du pilier 2 avec ton mentor Garden of Alliance ?**" },
            { type: "points", items: [
              { lead: "Servir de témoin bienveillant :", text: "t'offrir un cadre de confidentialité absolue pour verbaliser les blessures les plus enfouies sans crainte du jugement." },
              { lead: "Désamorcer les faux sentiments de culpabilité :", text: "t'aider à faire la distinction entre un vrai pardon accompli et le processus naturel de cicatrisation émotionnelle." },
              { lead: "Valider ta préparation finale pour le pilier 3 :", text: "s'assurer avec toi que ton cœur est totalement libre, allégé et prêt à accueillir l'amour sans l'ombre du passé." },
            ] },
          ],
        },
        { type: "authorQuote", text: "Le pardon est la clé qui déverrouille la porte de la prison relationnelle. Une fois cette clé tournée, vous n'êtes plus un célibataire blessé qui cherche à guérir, mais un célibataire guéri prêt à bâtir.", author: "Dr. John Townsend, psychologue et auteur" },
        {
          type: "callout", tone: "info", title: "Clôture du pilier 2 — Ton plan de libération finale",
          blocks: [
            { type: "steps", items: [
              "Complète le protocole du pardon et la lettre de libération ci-dessus.",
              "Fais un acte symbolique de décharge (brûler ou déchirer la feuille des offenses passées).",
              "Consacre un temps de prière d'action de grâce pour célébrer la fin du pilier 2.",
              "Débriefe avec ton mentor Garden of Alliance avant d'ouvrir la première leçon du pilier 3 !",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Réponds à ces questions pour valider ta compréhension du pardon.",
  quiz: [
    {
      question: "Quelle est la différence majeure entre le pardon et la réconciliation ?",
      options: [
        "Le pardon est bilatéral et la réconciliation est unilatérale.",
        "Le pardon est une décision unilatérale de renoncer à la dette ; la réconciliation exige la repentance et le changement de comportement de l'autre.",
        "Il n'y a aucune différence : pardonner oblige à redevenir ami comme avant.",
      ],
      answer: 1,
      explanation: "Tu peux pardonner à 100 % à une personne sans jamais te réconcilier avec elle si elle demeure toxique ou irrespectueuse.",
    },
    {
      question: "Pourquoi l'amertume non pardonnée est-elle si dangereuse dans une nouvelle relation amoureuse ?",
      options: [
        "Parce qu'elle empêche de voyager.",
        "Parce qu'elle agit comme une toxine qui nous fait projeter sur le partenaire actuel les fautes et la trahison des personnes du passé.",
        "Parce qu'elle rend la personne trop bavarde.",
      ],
      answer: 1,
      explanation: "L'amertume pollue le regard et pousse à faire payer au conjoint innocent les crimes des ex ou des parents.",
    },
    {
      question: "Que signifie se réconcilier avec sa propre histoire selon Joël 2.25 ?",
      options: [
        "Regretter chaque jour ses mauvaises décisions.",
        "Se pardonner à soi-même et croire que Dieu est capable de restaurer les années dévorées en transformant nos épreuves en maturité.",
        "Oublier complètement son nom et sa famille.",
      ],
      answer: 1,
      explanation: "Dieu ne gâche rien : il réutilise la guérison de notre histoire pour faire de nous des bénédictions pour notre futur foyer.",
    },
    {
      question: "Comment savoir qu'on a véritablement pardonné à quelqu'un ?",
      options: [
        "Quand on a une amnésie totale de l'événement.",
        "Quand le souvenir de l'événement ne déclenche plus de désir de vengeance ni de haine, et qu'on peut souhaiter son bien devant Dieu.",
        "Quand l'autre personne vient s'excuser à genoux.",
      ],
      answer: 1,
      explanation: "La mémoire peut subsister, mais le venin émotionnel de la dette a été définitivement neutralisé.",
    },
  ],
  reflection: {
    title: "Défi personnel de clôture du pilier 2",
    prompt: "Prononce cette prière d'action de grâce : *« Seigneur, merci pour la guérison de mon cœur, pour la libération de mon passé et pour la beauté de ma valeur en Christ. Je suis prêt(e) à entrer libre et joyeux/joyeuse dans le pilier 3 ! Amen. »*",
  },
};

/* ───────────────────────────── Leçon 2.7 ───────────────────────────── */

const lecon27: Lesson = {
  number: "2.7",
  slug: "2-7",
  title: "Brisement de liens spirituels : sorcellerie, malédictions et alliances générationnelles",
  image: { src: POSTERS["2-7"].src, card: card("lecon-2-7"), alt: POSTERS["2-7"].alt },
  poster: POSTERS["2-7"],
  pdf: `${BASE}/pdf/lecon-2-7-brisement-de-liens-spirituels.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "La réalité du combat spirituel dans la vie relationnelle",
    blocks: [
      { type: "p", text: "Alors que la psychologie et la maturité émotionnelle apportent des réponses indispensables à la restauration de l'âme, la Bible révèle qu'il existe également une dimension spirituelle invisible qui peut impacter la vie affective, la liberté et l'aboutissement du mariage. Certains célibataires chrétiens, malgré une hygiène de vie irréprochable, une réelle maturité et un désir ardent de fonder un foyer, constatent l'existence de blocages systématiques, anormaux ou répétitifs qui s'apparentent à des oppositions spirituelles." },
      { type: "p", text: "La Parole de Dieu établit sans ambiguïté la victoire totale accomplie par Jésus-Christ à la croix :" },
      { type: "verse", text: "Christ nous a rachetés de la malédiction de la loi, étant devenu malédiction pour nous.", ref: "Galates 3.13" },
      { type: "p", text: "De même, Colossiens 2.14-15 affirme qu'il a effacé l'acte dont les ordonnances nous condamnaient et a dépouillé les dominations et les autorités. Le prophète Balaam lui-même a dû reconnaître :" },
      { type: "verse", text: "L'enchantement ne peut rien contre Jacob, ni la divination contre Israël.", ref: "Nombres 23.23" },
      { type: "authorQuote", text: "La croix de Jésus-Christ a brisé le pouvoir de toute malédiction. Mais ce que Christ a accompli en droit légal à la croix doit être approprié, proclamé et appliqué par la foi dans la vie du croyant.", author: "Derek Prince, enseignant biblique et auteur de *Bénédiction ou malédiction : vous pouvez choisir*" },
    ],
  },
  objective: "Te donner le discernement biblique pour identifier d'éventuelles portes spirituelles ouvertes (pratiques occultes ancestrales, paroles de malédiction, alliances générationnelles, sorcellerie), et t'armer de l'autorité du nom de Jésus et du sang de l'Alliance pour proclamer ta libération définitive et entrer sereinement dans le projet du mariage.",
  parts: [
    {
      heading: "Comprendre l'origine des liens spirituels et des alliances négatives",
      blocks: [
        { type: "p", text: "Dans le monde spirituel, une alliance est un accord scellé qui crée des droits ou des réclamations légitimes jusqu'à ce qu'il soit formellement brisé par le sang d'une alliance supérieure — le sang de Jésus." },
        { type: "p", text: "**Les 4 portes d'entrée principales des réclamations spirituelles :**" },
        { type: "titledSteps", items: [
          { title: "Les pratiques occultes et idolâtriques familiales (générationnelles)", text: "La consultation de marabouts, devins, féticheurs, médiums, la participation à des rites de sorcellerie ou des pactes de sang accomplis par les ancêtres. La Bible met en garde contre l'iniquité des pères qui peut étendre son ombre sur plusieurs générations s'il n'y a pas de repentance (Exode 20.5)." },
          { title: "Les malédictions verbales proclamées", text: "Paroles de rejet, de haine ou d'envoûtement prononcées par des parents, des figures d'autorité, des personnes jalouses ou des ex-partenaires (« Tu ne te marieras jamais », « Aucun homme/femme ne te gardera »…)." },
          { title: "Les liens d'âme impurs et les alliances sexuelles passées", text: "L'acte sexuel crée une union spirituelle et corporelle (1 Corinthiens 6.16). Des relations avec des personnes impliquées dans le satanisme, l'occultisme ou la perversion peuvent transférer des chaînes ou des oppressions spirituelles." },
          { title: "Les attaques directes de la sorcellerie et des « esprits maris/femmes de nuit »", text: "Dans certaines cultures ou familles, des esprits incubes/succubes (mariages spirituels occultes) cherchent à maintenir le célibataire dans une captivité affective, provoquant l'aversion soudaine des prétendants ou des cauchemars répétés." },
        ] },
        { type: "authorQuote", text: "Satan n'a aucun pouvoir légal sur un enfant de Dieu marchant dans la vérité. Mais s'il existe une alliance non dénoncée ou un objet occulte non détruit, l'ennemi utilisera ce droit légal jusqu'à ce que le croyant se dresse avec l'autorité de la Parole.", author: "Dr. Neil Anderson, auteur de *Le Libérateur*" },
      ],
    },
    {
      heading: "Les indicateurs de réclamations spirituelles anormales",
      blocks: [
        { type: "p", text: "Il convient de ne pas tomber dans la paranoïa (attribuer chaque défaut de caractère au diable), mais d'avoir un discernement spirituel aiguisé. Voici les signes d'un blocage à caractère spirituel :" },
        { type: "points", items: [
          { lead: "La répétition exacte d'un même drame relationnel à la même étape :", text: "des fiançailles qui rompent systématiquement à quelques semaines du mariage sans cause logique explicable." },
          { lead: "La réaction d'aversion ou de dégoût soudain et irrationnel :", text: "un prétendant très amoureux qui devient subitement distant, effrayé ou agressif du jour au lendemain sans dispute préalable." },
          { lead: "Les attaques nocturnes récurrentes :", text: "rêves constants d'actes sexuels avec des entités inconnues (mariages de nuit), rêves de serpents, d'eaux sombres ou de cérémonies coutumières bizarres suivis d'épuisement au réveil." },
          { lead: "La présence de blocages simultanés généralisés :", text: "oppression spirituelle lourde accompagnée d'insomnies inexpliquées, de maladies sans diagnostic médical clair ou de ruine financière subite dès qu'un projet de couple démarre." },
        ] },
        {
          type: "worksheet",
          title: "Inventaire et discernement des liens spirituels",
          intro: "Réponds dans la prière et dans la sérénité pour identifier les portes à fermer au nom de Jésus.",
          sections: [
            { title: "Section 1 — Historique familial & portes occultes des ancêtres", items: [
              "Y a-t-il eu dans ta lignée familiale des pratiquants de sorcellerie, de maraboutage, de consultation de fétiches, de voyance, ou une appartenance à des confréries secrètes ?",
              "As-tu toi-même, par le passé (avant ou après ta conversion), consulté des voyants, astrologues, numérologues, ou conservé des objets bizarres ou des amulettes ?",
            ] },
            { title: "Section 2 — Paroles de malédiction & liens d'âme", items: [
              "Te rappelles-tu des paroles d'envoûtement, de rejet ou de malédiction prononcées contre ta vie sentimentale par des proches ou des ex-partenaires ?",
              "As-tu le sentiment d'être encore lié(e) spirituellement à un ex-partenaire avec qui tu as partagé une sexualité ou des vœux secrets ?",
            ] },
          ],
        },
      ],
    },
    {
      heading: "Le protocole biblique de brisement et de délivrance",
      blocks: [
        { type: "p", text: "La libération spirituelle ne nécessite ni cérémonie complexe ni peur. Elle repose sur la puissance du nom de Jésus, du sang versé et de la Parole proclamée avec foi." },
        { type: "titledSteps", items: [
          { title: "Repentance identificatrice et personnelle (Daniel 9)", text: "Confesser devant Dieu les péchés d'idolâtrie, de sorcellerie ou d'immoralité de ta lignée familiale ainsi que tes propres erreurs passées. Demander l'application du sang de Jésus pour effacer toute culpabilité." },
          { title: "Renoncement formel et annulation des alliances", text: "Proclamer à voix haute avec autorité : *« Au nom de Jésus-Christ, je renonce à tout pacte, toute alliance coutumière, occulte ou inconsciente scellée par mes ancêtres ou par moi-même. Je brise leur pouvoir sur ma vie affective ! »*" },
          { title: "Couper les liens d'âme et chasser les esprits d'oppression", text: "Ordonner au nom de Jésus à tout esprit de célibat forcé, de séparation, de poisse relationnelle ou d'« esprit mari/femme de nuit » de quitter ta vie définitivement (Matthieu 18.18)." },
          { title: "Débarras physique des objets occultes & sanctification", text: "Jeter ou brûler tout objet, bijou, amulette, livre occulte ou cadeau lié à une relation occulte ou toxique passée (Actes 19.19). Consacrer ton corps, ton âme et ta future union au Seigneur." },
        ] },
        {
          type: "callout", tone: "neutral", title: "Le rôle du mentor spirituel / pasteur dans le brisement de liens",
          blocks: [
            { type: "p", text: "**Pourquoi se faire accompagner dans cette démarche de prière et de délivrance ?**" },
            { type: "points", items: [
              { lead: "Apporter la prière d'accord (Matthieu 18.19) :", text: "deux voix qui s'unissent dans l'autorité du nom de Jésus imposent le silence à l'ennemi." },
              { lead: "Offrir un discernement éclairé et équilibré :", text: "empêcher d'une part de minimiser le spirituel, et d'autre part d'attribuer au diable ce qui relève de la maturité émotionnelle." },
              { lead: "Veiller à la marche dans la liberté durable :", text: "t'accompagner dans la sanctification et la prière de protection quotidienne après la libération." },
            ] },
          ],
        },
        { type: "authorQuote", text: "Quand le Fils vous affranchit, vous êtes réellement libres. Aucune sorcellerie, aucune alliance ancestrale ne peut résister au sang de l'Agneau lorsque le croyant se dresse dans son identité en Christ.", author: "Dr. Rebecca Brown, auteure et médecin missionnaire" },
        {
          type: "callout", tone: "info", title: "Ta feuille de route pour cette leçon",
          blocks: [
            { type: "steps", items: [
              "Complète la fiche d'inventaire et de discernement spirituel.",
              "Rédige une prière personnelle de renoncement et de brisement d'alliances.",
              "Fais un tri dans tes affaires pour éliminer tout objet ayant un lien avec l'occultisme ou des relations passées impures.",
              "Organise une séance de prière de libération avec ton mentor Garden of Alliance ou ton berger spirituel.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Réponds à ces questions pour valider ta compréhension de la liberté en Christ.",
  quiz: [
    {
      question: "Selon Galates 3.13 et Nombres 23.23, quelle est la position du croyant face à la malédiction et à la sorcellerie ?",
      options: [
        "Le croyant doit constamment vivre dans la peur des sorciers de sa famille.",
        "Christ nous a rachetés de toute malédiction à la croix ; l'enchantement et la divination n'ont aucun pouvoir légal sur celui qui marche dans la vérité.",
        "La sorcellerie est plus puissante que la prière.",
      ],
      answer: 1,
      explanation: "L'autorité suprême appartient à Christ. Le croyant doit proclamer sa délivrance par la foi et la vérité.",
    },
    {
      question: "Qu'est-ce qu'une alliance spirituelle générationnelle ?",
      options: [
        "Une coutume amicale entre deux familles.",
        "Un accord ou un pacte scellé par les ancêtres avec des entités spirituelles, créant des réclamations sur la lignée s'il n'est pas brisé en Christ.",
        "Un héritage financier.",
      ],
      answer: 1,
      explanation: "Les alliances négatives de la lignée doivent être formellement répudiées et brisées par le sang de la Nouvelle Alliance.",
    },
    {
      question: "Pourquoi l'acte sexuel hors mariage peut-il créer un lien d'âme spirituel problématique ?",
      options: [
        "Parce qu'il empêche de dormir.",
        "Parce que la sexualité crée une union corporelle et spirituelle profonde (1 Corinthiens 6.16) pouvant transférer des oppressions ou des chaînes de l'autre personne.",
        "Parce que c'est une règle culturelle.",
      ],
      answer: 1,
      explanation: "Les liens d'âme sexuels du passé doivent être tranchés et coupés dans la prière au nom de Jésus.",
    },
    {
      question: "Quelle est la première étape du protocole biblique de libération spirituelle ?",
      options: [
        "Jeter de l'eau bénite partout.",
        "La repentance personnelle et identificatrice (confesser les fautes de la lignée et les siennes) et réclamer le sang de Jésus.",
        "Crier le plus fort possible.",
      ],
      answer: 1,
      explanation: "La repentance ferme les portes légales et enlève à l'ennemi toute base d'accusation.",
    },
  ],
  reflection: {
    title: "Défi personnel",
    prompt: "Prononce cette prière d'autorité : *« Au nom de Jésus-Christ, je proclame que ma vie affective est rachetée par le sang de l'Agneau. Toute malédiction, toute alliance de sorcellerie et tout lien d'âme toxique sont brisés aujourd'hui. Je marche dans la liberté des enfants de Dieu ! Amen. »*",
  },
};

/* ───────────────────────────── Pilier ───────────────────────────── */

export const pillar2: Pillar = {
  number: 2,
  slug: "connaissance-de-soi",
  title: "Connaissance de soi, tempéraments & guérison intérieure",
  summary: "Se connaître en vérité — tempérament, style d'attachement, blessures et schémas hérités — pour clarifier ses besoins et ses valeurs, pardonner, briser les liens du passé et entrer libre dans l'alliance.",
  poster: PILLAR_2_POSTER,
  card: `${BASE}/images/pilier-2-carte.webp`,
  lessons: [lecon21, lecon22, lecon23, lecon24, lecon25, lecon26, lecon27],
};
