// Pilier 3 de « Bâtir sur le roc » — Bilan de maturité & préparation multidimensionnelle.
// Contenu transcrit des leçons PDF rédigées par l'équipe Garden of Alliance.
// Affiches, vignettes et PDF : public/formation/batir-sur-le-roc/.
import type { Lesson, Pillar, Poster } from "./types";

const BASE = "/formation/batir-sur-le-roc";
const card = (n: string) => `${BASE}/images/${n}-carte.webp`;
const portrait = (n: string, alt: string): Poster => ({ src: `${BASE}/images/${n}.webp`, width: 1055, height: 1491, alt });

const PILLAR_3_POSTER: Poster = {
  src: `${BASE}/images/pilier-3.webp`,
  width: 1122,
  height: 1402,
  alt: "Affiche « Bilan de maturité & préparation multidimensionnelle » : un couple remplit ensemble une grille de maturité, entouré des sept dimensions — maturité émotionnelle, spirituelle, financière, sociale et professionnelle, préparation physique, souplesse affective et vision du foyer.",
};

const POSTERS = {
  "3-1": portrait("lecon-3-1", "Affiche de la leçon 3.1 « La maturité spirituelle : autonomie de foi et leadership spirituel » : un homme tient sa Bible près d'une femme en prière, entre le mythe de la spiritualité par procuration et le leadership spirituel selon Christ, avec le diagnostic miroir de l'enfant spirituel et du disciple mûr."),
  "3-2": portrait("lecon-3-2", "Affiche de la leçon 3.2 « La maturité émotionnelle : maîtrise de soi, gestion du stress et de la colère » : face à l'impulsif charnel, un couple apaisé illustre le vrai maître de soi, le diagnostic miroir et la règle d'or du time-out de 20 minutes."),
  "3-3": portrait("lecon-3-3", "Affiche de la leçon 3.3 « La maturité financière » : un couple fait ses comptes ensemble face à l'illusion du « Dieu pourvoira » sans gestion, avec les quatre piliers de la santé financière, le diagnostic miroir et la règle budgétaire 70 / 20 / 10."),
  "3-4": portrait("lecon-3-4", "Affiche de la leçon 3.4 « La maturité sociale et professionnelle : équilibre carrière, ministère et vie de famille » : face au piège de l'agenda saturé, un couple organise son temps autour des priorités du Royaume, avec les trois pièges fréquents et la matrice de priorités."),
  "3-5": portrait("lecon-3-5", "Affiche de la leçon 3.5 « La préparation physique et l'hygiène de vie dans le couple » : face au sanctuaire négligé, un couple prend soin du corps comme d'un sanctuaire à honorer, avec le diagnostic miroir et le bilan d'hygiène de vie."),
  "3-6": portrait("lecon-3-6", "Affiche de la leçon 3.6 « Les 5 langages de l'amour et la gestion des réservoirs affectifs » : autour d'un cœur-réservoir, cinq scènes de couple illustrent les paroles d'encouragement, les moments de qualité, les cadeaux, les services rendus et le toucher physique."),
  "3-7": portrait("lecon-3-7", "Affiche de la leçon 3.7 « Auto-évaluation globale : suis-je prêt(e) à assumer la responsabilité du mariage ? » : un couple pensif devant la grille d'aptitude à l'alliance et ses six dimensions, entre le profil à risque et le profil mûr, avec le score d'aptitude sur 30."),
} satisfies Record<string, Poster>;

const lessonImage = (slug: keyof typeof POSTERS) => ({ src: POSTERS[slug].src, card: card(`lecon-${slug}`), alt: POSTERS[slug].alt });

/* ───────────────────────────── Leçon 3.1 ───────────────────────────── */

const lecon31: Lesson = {
  number: "3.1",
  slug: "3-1",
  title: "La maturité spirituelle : autonomie de foi et leadership spirituel",
  image: lessonImage("3-1"),
  poster: POSTERS["3-1"],
  pdf: `${BASE}/pdf/lecon-3-1-la-maturite-spirituelle.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "La béquille religieuse et l'autel en ruine",
    blocks: [
      { type: "p", text: "Imagine un homme qui s'apprête à courir un marathon, mais qui n'a jamais appris à marcher sans béquilles. Dès que la pente s'élève et que le soutien extérieur s'éloigne, il s'effondre. C'est exactement le spectacle tragique que donnent beaucoup de célibataires chrétiens lorsqu'ils entrent dans le mariage avec ce que l'on doit appeler une **foi d'emprunt**." },
      { type: "p", text: "Dans nos assemblées, il est facile de confondre l'enthousiasme d'un groupe de jeunes ou la ferveur d'un culte du dimanche avec une maturité spirituelle réelle. Mais le mariage n'est pas un culte dominical de deux heures : c'est un face-à-face quotidien où la poussière du quotidien, la fatigue et les épreuves mettent à nu la consistance de notre vie spirituelle personnelle. Dans l'intimité du foyer, tu ne pourras pas nourrir ta maison avec la foi de tes parents, l'onction de ton pasteur ou les prières de tes amis." },
    ],
  },
  objective: "Découvrir pourquoi une spiritualité dépendante condamne le couple à la fragilité, et apprendre à bâtir une autonomie de foi inébranlable et un leadership spirituel selon le modèle du Christ.",
  parts: [
    {
      heading: "Le mythe de la spiritualité par procuration",
      blocks: [
        { type: "p", text: "L'apôtre Paul pose une règle de maturité sans concession dans sa première lettre aux Corinthiens :" },
        { type: "verse", text: "Lorsque j'étais enfant, je parlais comme un enfant, je pensais comme un enfant, je raisonnais comme un enfant ; lorsque je suis devenu homme, j'ai fait disparaître ce qui était de l'enfant.", ref: "1 Corinthiens 13.11" },
        { type: "p", text: "L'enfant spirituel se caractérise par la dépendance. Il a besoin qu'on le pousse pour prier, qu'on lui rappelle de lire la Bible, qu'on lui dise quoi penser face à une épreuve et qu'on le soutienne à chaque pas. Mais entrer dans l'alliance conjugale exige d'abandonner les béquilles de l'enfance spirituelle." },
        { type: "p", text: "Un mariage béni réclame deux croyants capables de s'abreuver directement à la Source. Si un mari ou une épouse attend continuellement que l'autre soit le « moteur spirituel » du foyer pour sortir de la torpeur, le couple crée un déséquilibre épuisant. L'autonomie de foi n'est pas l'isolement ; c'est la capacité d'entretenir un autel personnel ardent dans le secret de sa chambre (Matthieu 6.6) avant de venir unir sa flamme à celle de son conjoint." },
      ],
    },
    {
      heading: "La vraie nature du leadership spirituel selon Christ",
      blocks: [
        { type: "p", text: "Peu de sujets ont causé autant de ravages et de malentendus dans les foyers chrétiens que la notion de « chef » et de leadership spirituel. L'Écriture pose pourtant un modèle révolutionnaire :" },
        { type: "verse", text: "Car le mari est le chef de la femme, comme Christ est le chef de l'Église qui est son corps, et dont il est le Sauveur.", ref: "Éphésiens 5.23" },
        { type: "p", text: "La culture charnelle et la tradition religieuse ont trop souvent transformé ce verset en un permis de domination, de tyrannie ou de décision unilatérale. C'est une perversion totale du texte. Dans l'Évangile, quel type de chef est le Christ ?" },
        { type: "points", items: [
          { lead: "Il est le Chef qui s'agenouille", text: "pour laver les pieds de ses disciples (Jean 13)." },
          { lead: "Il est le Chef qui offre sa propre vie", text: "en sacrifice pour sanctifier son Église (Éphésiens 5.25)." },
          { lead: "Il est le Chef qui protège, écoute, nourrit", text: "et prend soin de son corps." },
        ] },
        { type: "p", text: "Le véritable leadership spirituel de l'homme n'est pas un diplôme d'autorité, mais un **mandat de responsabilité d'amour, de service et d'intercession**. Un homme mûr ne cherche pas à imposer sa volonté ; il prend l'initiative de la prière, il est le premier à demander pardon lors d'un conflit, et il couvre son épouse sous un manteau d'intercession." },
        { type: "p", text: "De son côté, la femme mûre n'est pas une spectatrice passive. Elle incarne le leadership d'influence et de sagesse décrit dans Proverbes 14.1 : *« La femme sage bâtit sa maison. »* Elle est la co-guerrière spirituelle (*Ezer Kenegdo*), dotée d'un discernement aiguisé et d'une puissance d'intercession qui protège les murailles du foyer." },
        { type: "authorQuote", text: "Un homme mûr ne craint pas une femme spirituellement forte ; il recherche une coéquipière capable d'intercéder à ses côtés dans les combats de la vie.", author: "Dr. Tony Evans, auteur de *Kingdom Man*" },
      ],
    },
    {
      heading: "Le diagnostic miroir de l'autonomie spirituelle",
      blocks: [
        { type: "p", text: "Pour mesurer avec précision ton niveau d'autonomie et de maturité spirituelle avant de t'engager dans le mariage, observe le tableau ci-dessous :" },
        {
          type: "table", variant: "compare",
          head: ["L'enfant spirituel (foi d'emprunt)", "Le disciple mûr (foi autonome)"],
          rows: [
            ["Sa prière dépend de l'ambiance du culte du dimanche ou de la ferveur des autres.", "Entretient un autel personnel secret et quotidien de prière (Matthieu 6.6)."],
            ["N'ouvre jamais la Bible seul(e) chez lui ; dépend uniquement des sermons d'occasion.", "Médite et étudie la Parole de Dieu par lui-même pour nourrir son âme."],
            ["Utilise les versets bibliques comme des armes pour dominer, culpabiliser ou imposer sa volonté.", "Exerce un leadership de service, d'écoute, d'humilité et de pardon mutuel."],
            ["S'effondre spirituellement au moindre doute ou à la première épreuve.", "Demeure ferme dans la foi et sait intercéder avec autorité pour son avenir et son foyer."],
          ],
        },
        {
          type: "worksheet",
          title: "Fiche d'audit d'autonomie & de leadership spirituel",
          intro: "Évalue sincèrement chaque affirmation de 1 (très faible) à 5 (excellent).",
          sections: [
            { title: "Section 1 — Échelle d'autonomie de foi", intro: "Note chaque affirmation de 1 à 5 :", items: [
              "J'ai une discipline de prière et de lecture biblique personnelle quotidienne sans avoir besoin d'être poussé(e).",
              "Je sais chercher et discerner la volonté de Dieu dans la prière avant de prendre une décision importante.",
              "Je suis capable d'intercéder avec autorité spirituelle face à une épreuve ou une attaque de l'ennemi.",
              "Je suis à l'aise pour conduire un temps de prière et de partage biblique à voix haute avec mon futur conjoint.",
            ] },
            { title: "Section 2 — Engagement individuel de redressement (sous 14 jours)", intro: "Si ta note globale est inférieure à 15/20 :", items: [
              "Formule ton plan d'action d'autel personnel (ex. : 20 min de prière matinale quotidienne sans téléphone) :",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Lorsque tu échanges avec un(e) prétendant(e) sur Garden of Alliance, ne te contente pas de demander : *« Dans quelle église vas-tu ? »* ou *« As-tu un ministère ? »* Cherche à découvrir la vie de l'autel secret ! Demande : *« Comment le Seigneur te parle-t-il dans ta lecture quotidienne ? »*, *« Comment gères-tu tes moments de désert spirituel ? »* Cherche un partenaire dont la foi n'est pas une simple décoration dominicale, mais un moteur de vie autonome et contagieux." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision.",
  quiz: [
    {
      question: "Selon 1 Corinthiens 13.11, que signifie la maturité spirituelle pour un célibataire ?",
      options: [
        "Avoir fait de longues études de théologie.",
        "Faire disparaître ce qui appartient à l'enfance (dépendance, paresse) pour exercer une foi personnelle responsable et mûre.",
        "Devenir parfait sans aucune tentation.",
      ],
      answer: 1,
      explanation: "La maturité spirituelle est le passage d'une foi d'emprunt dépendante à une posture de responsabilité et de fermeté en Christ.",
    },
    {
      question: "Comment s'exerce le leadership spirituel de l'homme selon Éphésiens 5.23 ?",
      options: [
        "Par la domination autoritaire et les décisions unilatérales.",
        "À l'exemple de Christ : par le service, l'amour sacrificiel, l'initiative de la prière et la protection de la famille.",
        "En laissant son épouse tout porter seule.",
      ],
      answer: 1,
      explanation: "Le vrai leadership biblique est une responsabilité d'amour et de couverture spirituelle, non de tyrannie.",
    },
    {
      question: "Quel est le rôle spirituel de la femme mûre (*Ezer Kenegdo*) dans le foyer selon Proverbes 14.1 ?",
      options: [
        "Être une spectatrice passive sans avis.",
        "Apporter un leadership d'influence, de sagesse, de discernement et d'intercession pour bâtir et protéger sa maison.",
        "Ne jamais prier pour son mari.",
      ],
      answer: 1,
      explanation: "La femme mûre est une partenaire stratégique puissante par la prière et la sagesse.",
    },
    {
      question: "Pourquoi l'autel personnel est-il la condition préalable à l'autel familial ?",
      options: [
        "Parce qu'on ne peut pas transmettre ni diriger ce qu'on ne pratique pas soi-même dans l'intimité avec Dieu.",
        "Parce que c'est une règle administrative.",
        "Parce que cela remplace le mariage.",
      ],
      answer: 0,
      explanation: "L'autel familial n'est que le débordement de la communion personnelle que chaque conjoint entretient avec le Seigneur.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Prends un temps d'arrêt devant Dieu. Si tu devais évaluer en toute honnêteté l'état de ton autel personnel aujourd'hui, quelle est sa température ? As-tu la certitude intérieure d'être prêt(e) à inspirer et soutenir spirituellement ton futur foyer, plutôt que d'attendre que ton conjoint fasse tout le travail à ta place ?",
  },
};

/* ───────────────────────────── Leçon 3.2 ───────────────────────────── */

const lecon32: Lesson = {
  number: "3.2",
  slug: "3-2",
  title: "La maturité émotionnelle : maîtrise de soi, gestion du stress et de la colère",
  image: lessonImage("3-2"),
  poster: POSTERS["3-2"],
  pdf: `${BASE}/pdf/lecon-3-2-la-maturite-emotionnelle.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "L'enfant furieux dans le corps d'un adulte",
    blocks: [
      { type: "p", text: "Imaginons un homme de 35 ans, vêtu d'un costume impeccable, occupant un poste à hautes responsabilités ou prêchant en chaire le dimanche. Mais dès qu'un retard survient, qu'une contrariété surgit ou qu'une remarque le heurte, il tape sur la table, crie, brise un objet ou boude en silence pendant trois jours. En dépit de son apparence adulte, sur le plan émotionnel, c'est un enfant de 6 ans qui a pris le volant." },
      { type: "p", text: "L'une des plus grandes tragédies conjugales est d'associer la maturité uniquement à l'âge chronologique ou au succès professionnel. Le mariage est un incubateur d'intimité où la fatigue, le stress et les frictions font inévitablement remonter la pression. Si tu n'as pas appris à gouverner ton esprit et tes émotions en tant que célibataire, le mariage n'apaisera pas cette instabilité — il l'amplifiera." },
    ],
  },
  objective: "Démasquer les mécanismes destructeurs de la colère et de l'impulsivité, et apprendre à cultiver la maîtrise de soi pour devenir un havre de paix et de sécurité émotionnelle pour ton futur foyer.",
  parts: [
    {
      heading: "La bombe à retardement du manque de maîtrise de soi",
      blocks: [
        { type: "p", text: "La Parole de Dieu ne fait pas de la maîtrise de soi un simple trait de caractère secondaire, mais la marque suprême de la véritable force spirituelle :" },
        { type: "verse", text: "Celui qui est lent à la colère vaut mieux qu'un héros, et celui qui est maître de lui-même, que celui qui prend des villes.", ref: "Proverbes 16.32" },
        { type: "verse", text: "Sachez-le, mes frères bien-aimés. Ainsi, que tout homme soit prompt à écouter, lent à parler, lent à se mettre en colère ; car la colère de l'homme n'accomplit pas la justice de Dieu.", ref: "Jacques 1.19-20" },
        { type: "p", text: "Salomon établit un constat foudroyant : conquérir des villes, diriger des entreprises ou remporter de grandes victoires extérieures ne prouve rien si l'on est incapable de dompter sa propre fureur. La personne impulsive est comme une ville sans murailles (Proverbes 25.28) : elle est à la merci du moindre déclencheur extérieur." },
        { type: "p", text: "Dans le couple, le manque de maîtrise de soi se manifeste par des propos venimeux, des jugements hâtifs, le boudage punitif et, pire que tout, **la menace atomique de la rupture ou du divorce** brandie à chaque dispute. Une personne qui crie ou menace dès qu'elle est contrariée ne communique pas : elle démolit la sécurité fondamentale de l'alliance. Proverbes 14.1 prévient : *« La femme sage bâtit sa maison, mais la folle la renverse de ses propres mains. »* Il en va exactement de même pour l'homme." },
      ],
    },
    {
      heading: "La physiologie du stress et le piège du bouc émissaire",
      blocks: [
        { type: "p", text: "Pourquoi des chrétiens sincères perdent-ils parfois tout contrôle ? La psychologie clinique et la neurologie expliquent que sous l'effet du stress et de la fatigue, le cerveau émotionnel (l'amygdale) court-circuite le cerveau rationnel (le cortex préfrontal). La personne passe en mode « attaque ou fuite »." },
        { type: "p", text: "Lorsque le célibataire n'a pas appris à gérer son stress professionnel ou sa fatigue de manière responsable, il commet l'erreur tragique de faire de son partenaire son **bouc émissaire émotionnel**. Il rentre à la maison et déverse sa frustration sur l'autre sous forme d'irritabilité, de reproches ou de procès d'intention. C'est l'injustice relationnelle par excellence." },
        { type: "p", text: "La personne mûre apprend à reconnaître ses signaux d'alerte corporels (cœur qui accélère, mâchoires serrées) et applique la règle d'or du **time-out de 20 minutes** : savoir dire calmement *« Je sens la pression monter. Je prends 20 minutes pour marcher, respirer et prier, et nous reprendrons cette conversation dans la paix. »* Ces 20 minutes permettent à l'adrénaline de chuter pour laisser à nouveau parler la sagesse du Royaume." },
        { type: "authorQuote", text: "La maturité émotionnelle dans le couple ne se mesure pas à l'absence de désaccords, mais à la vitesse et à la responsabilité avec lesquelles vous faites redescendre la pression sans blesser l'autre.", author: "Dr. Les Parrott, psychologue et auteur" },
      ],
    },
    {
      heading: "Le diagnostic miroir de la maturité émotionnelle",
      blocks: [
        { type: "p", text: "Observe attentivement les deux postures ci-dessous pour situer ton niveau de maîtrise de soi actuel :" },
        {
          type: "table", variant: "compare",
          head: ["L'impulsif charnel (bombe émotionnelle)", "Le mûr sécurisant (maître de soi)"],
          rows: [
            ["Crie, insulte, tape sur les meubles ou brise des objets sous le coup de la colère.", "Fait une pause respiratoire, calme son corps et s'exprime avec retenue et respect."],
            ["Fait des procès d'intention et accuse sans preuve (« C'est forcément ta faute ! »).", "Écoute d'abord, pose des questions et vérifie les faits avant de juger (Proverbes 18.13)."],
            ["Utilise la menace de rupture ou de divorce comme outil de chantage ou de punition.", "Protège la sécurité de l'alliance et cherche la résolution pacifique du problème."],
            ["Déverse son stress professionnel ou sa fatigue sur son conjoint (bouc émissaire).", "Gère son hygiène de vie, reconnaît sa fatigue et communique avec vulnérabilité."],
          ],
        },
        {
          type: "worksheet",
          title: "Le thermomètre d'impulsivité et de gestion de crise",
          intro: "Évalue sincèrement chaque comportement de 1 (jamais) à 5 (fréquemment).",
          sections: [
            { title: "Section 1 — Grille d'auto-évaluation de la colère", intro: "Note chaque comportement de 1 à 5 :", items: [
              "Quand je suis très contrarié(e), j'ai tendance à élever la voix, crier ou tenir des propos accusateurs violents.",
              "Il m'est déjà arrivé de briser des objets, de taper sur des meubles ou de claquer une porte sous le coup de la colère.",
              "J'utilise le silence punitif et la bouderie pendant plusieurs heures ou jours pour punir l'autre.",
              "J'ai déjà agité la menace de rompre ou de divorcer lors d'une dispute tendue.",
              "Quand je suis fatigué(e) ou stressé(e) par mon travail, je deviens irritable et cassant(e) avec mon entourage.",
            ] },
            { title: "Section 2 — Engagement de maîtrise de soi (sous 14 jours)", intro: "Si le total dépasse 10/25 :", items: [
              "Engage-toi à appliquer la règle du time-out de 20 minutes et à débriefer tes accès d'impulsivité avec ton mentor Garden of Alliance :",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Pendant la phase de fréquentation, ne te laisse pas aveugler par la douceur d'un prétendant dans les moments calmes. Observe attentivement sa réaction sous la pression ! Comment traite-t-il un serveur qui fait une erreur ? Comment réagit-il quand un projet échoue, qu'un embouteillage le bloque ou qu'un désaccord survient ? Cherche un partenaire dont le frein émotionnel fonctionne aussi bien que l'accélérateur passionnel. C'est la garantie de ta sécurité future." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision.",
  quiz: [
    {
      question: "Selon Proverbes 16.32, qui est supérieur à un héros qui prend des villes ?",
      options: [
        "Celui qui gagne beaucoup d'argent.",
        "Celui qui est lent à la colère et maître de lui-même.",
        "Celui qui impose son point de vue avec éclat.",
      ],
      answer: 1,
      explanation: "La véritable force spirituelle et humaine réside dans la maîtrise de soi en situation de crise.",
    },
    {
      question: "Quel est l'effet de la menace répétée de rupture ou de divorce lors des disputes ?",
      options: [
        "Cela prouve qu'on a du caractère.",
        "Cela détruit la sécurité fondamentale de l'alliance et démolit la confiance dans le couple.",
        "C'est une méthode efficace de négociation.",
      ],
      answer: 1,
      explanation: "Brandir le divorce à la moindre contrariété sabote la confiance indispensable à l'alliance.",
    },
    {
      question: "Quelle est la première règle à appliquer lors de la montée d'une fureur incontrôlable ?",
      options: [
        "Crier immédiatement pour vider son sac.",
        "Appliquer le time-out de 20 minutes pour laisser chuter la pression physiologique avant de poursuivre.",
        "Bouder pendant trois jours.",
      ],
      answer: 1,
      explanation: "La pause de 20 minutes permet au cerveau rationnel de reprendre le dessus dans la paix.",
    },
    {
      question: "Que signifie faire de son partenaire son « bouc émissaire émotionnel » ?",
      options: [
        "Prier pour son conjoint.",
        "Déverser sur lui le stress, la fatigue et les frustrations de sa journée professionnelle au lieu de les gérer avec maturité.",
        "Lui offrir des cadeaux imprévus.",
      ],
      answer: 1,
      explanation: "C'est une injustice relationnelle qui consiste à faire payer au conjoint la fatigue causée par d'autres.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Prends un temps d'arrêt sincère. As-tu déjà blessé quelqu'un par une parole colérique ou une réaction impulsive que tu regrettes aujourd'hui ? Quelle décision concrète prends-tu devant Dieu pour que ton futur foyer soit un sanctuaire de sécurité et de paix, et non un champ de bataille émotionnel ?",
  },
};

/* ───────────────────────────── Leçon 3.3 ───────────────────────────── */

const lecon33: Lesson = {
  number: "3.3",
  slug: "3-3",
  title: "La maturité financière : budget, gestion des dettes, épargne et vision financière du foyer",
  image: lessonImage("3-3"),
  poster: POSTERS["3-3"],
  pdf: `${BASE}/pdf/lecon-3-3-la-maturite-financiere.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "La bombe à retardement sous le lit conjugal",
    blocks: [
      { type: "p", text: "Imaginons un couple qui vient de célébrer un mariage somptueux. Les vœux ont été échangés, les invités ont applaudi, la bénédiction pastorale a été prononcée. Mais quelques semaines seulement après la fin de la fête, la réalité s'invite brutalement : les courriers de relance arrivent, les découverts bancaires surgissent, et l'un des conjoints découvre avec effroi que l'autre traîne 10 000 € de dettes de crédit à la consommation cachées." },
      { type: "p", text: "L'amour romantique s'évapore instantanément sous la pression de la tromperie financière. Toutes les études cliniques et pastorales s'accordent sur ce constat : l'argent figure parmi les deux premières causes de divorce dans le monde. Aborder la préparation au mariage en considérant l'argent comme un sujet tabou ou purement profane est une erreur tragique. **L'argent est le révélateur ultime du cœur et du niveau de maturité spirituelle (Luc 16.11).**" },
    ],
  },
  objective: "Démasquer les illusions financières, apprendre la transparence absolue avant l'alliance, et poser les bases d'une gestion budgétaire biblique et prévoyante pour ton futur foyer.",
  parts: [
    {
      heading: "L'illusion du « Dieu pourvoira » sans gestion",
      blocks: [
        { type: "p", text: "Certains célibataires chrétiens utilisent la foi comme un masque pour camoufler leur paresse ou leur indiscipline financière. Ils répètent *« Le Seigneur pourvoira ! »* tout en accumulant des achats impulsifs et des découverts. La Parole de Dieu remet les choses à leur place avec une clarté redoutable :" },
        { type: "verse", text: "Le riche domine sur les pauvres, et celui qui emprunte est l'esclave de celui qui prête.", ref: "Proverbes 22.7" },
        { type: "verse", text: "Car, lequel de vous, s'il veut bâtir une tour, ne s'assied d'abord pour calculer la dépense et voir s'il a de quoi la terminer ?", ref: "Luc 14.28" },
        { type: "p", text: "Jésus lui-même fait du calcul budgétaire une parabole de sagesse divine. S'asseoir pour calculer la dépense avant de bâtir la tour de son mariage n'est pas un manque de foi : c'est un acte d'obéissance administrative. Dieu ne pourvoit pas pour financer notre désordre ; il bénit ce qui est géré avec responsabilité." },
        { type: "p", text: "La dette de consommation irréfléchie crée un lien d'asservissement (Proverbes 22.7). Entrer dans le mariage en imposant à son conjoint le remboursement de dettes nées de son propre laisser-aller passé est une injustice relationnelle grave. Dans Luc 16.11, le Seigneur pose la question de confiance : *« Si donc vous n'avez pas été fidèles dans les richesses injustes, qui vous confiera les vraies ? »*" },
      ],
    },
    {
      heading: "Les 4 piliers de la santé financière prémaritale",
      blocks: [
        { type: "p", text: "Pour bâtir un foyer financièrement paisible et prospère selon le Royaume, le célibataire doit maîtriser quatre piliers :" },
        { type: "titledSteps", items: [
          { title: "La transparence totale", text: "Révéler sans détour ses revenus réels, ses charges, ses dettes et son épargne avant tout engagement officiel. L'opacité financière est le terreau du mensonge." },
          { title: "La maîtrise budgétaire écrite", text: "Établir chaque mois un budget rigoureux (règle des 70 % besoins fixes / 20 % épargne & remboursement / 10 % dîme & générosité) et vivre en dessous de ses moyens." },
          { title: "Le fonds de sécurité (l'épargne de prévoyance)", text: "Bâtir une réserve financière d'urgence représentant 3 à 6 mois de charges courantes pour faire face aux imprévus de la vie sans panique." },
          { title: "L'alignement de la vision du ménage", text: "Définir à deux la structure des comptes (un compte joint principal pour les charges du foyer + des sous-comptes personnels pour l'autonomie d'argent de poche), la dîme et les projets d'investissement." },
        ] },
        { type: "authorQuote", text: "L'argent ne fait que révéler qui vous êtes. Si vous êtes indiscipliné en tant que célibataire, le mariage doublera vos revenus mais quadruplera vos conflits financiers.", author: "Dave Ramsey, expert en gestion financière chrétienne" },
      ],
    },
    {
      heading: "Le diagnostic miroir de la gestion financière",
      blocks: [
        { type: "p", text: "Examine ta situation financière actuelle à la lumière du tableau ci-dessous :" },
        {
          type: "table", variant: "compare",
          head: ["L'acheteur impulsif (risque financier)", "Le gestionnaire mûr (sagesse du Royaume)"],
          rows: [
            ["Cache ses dettes de crédit, ses découverts ou ses achats impulsifs par honte.", "Pratique une transparence financière absolue et n'a aucune dette dissimulée."],
            ["Achète sous le coup des émotions (shopping thérapie) et vit au-dessus de ses moyens.", "Planifie ses achats, différencie le besoin du désir et respecte son budget écrit."],
            ["Vit au jour le jour sans aucune réserve d'épargne de prévoyance.", "Construit méthodiquement un fonds d'urgence de 3 à 6 mois de charges."],
            ["Refuse de parler d'argent ou considère le sujet comme « anti-spirituel ».", "Traite l'argent comme un outil de bénédiction pour son foyer et le Royaume de Dieu."],
          ],
        },
        {
          type: "worksheet",
          title: "La fiche de transparence financière prémaritale",
          intro: "Évalue honnêtement ta situation financière actuelle de 1 (critique) à 5 (excellente).",
          sections: [
            { title: "Section 1 — Grille d'auto-évaluation financière", intro: "Note chaque affirmation de 1 à 5 :", items: [
              "Je connais le montant exact de mes dépenses mensuelles fixes et je respecte un budget écrit.",
              "Je possède une réserve d'épargne d'urgence permettant de couvrir au moins 3 mois de charges.",
              "Je n'ai aucune dette de consommation ou découvert bancaire récurrent non maîtrisé.",
              "Je suis totalement à l'aise pour parler d'argent, de dettes et de budget avec transparence.",
            ] },
            { title: "Section 2 — Plan d'extinction des dettes & transparence (sous 14 jours)", items: [
              "Inscris le montant exact de tes dettes actuelles et ton plan de remboursement prioritaire à présenter à ton mentor :",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Pendant tes échanges prémaritaux sur Garden of Alliance, n'aie pas peur d'aborder le sujet de l'argent ! Il ne s'agit pas de demander le relevé de compte lors du premier rendez-vous, mais d'observer l'attitude globale du prétendant. Est-il généreux ou avare ? Est-il cigale ou fourmi ? A-t-il une vision de travail et d'épargne ou vit-il dans l'illusion de dettes perpétuelles ? Un partenaire mûr parle d'argent avec clarté, responsabilité et foi." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision.",
  quiz: [
    {
      question: "Selon Proverbes 22.7, quel est le danger majeur de la dette de consommation ?",
      options: [
        "Elle empêche de voyager.",
        "Elle place l'emprunteur dans une posture d'asservissement qui crée de l'anxiété et pèse sur le foyer.",
        "Elle n'a aucun impact sur le couple.",
      ],
      answer: 1,
      explanation: "La dette prive le ménage de sa liberté d'action et apporte une anxiété permanente.",
    },
    {
      question: "Que commande Jésus dans Luc 14.28 avant d'engager un grand projet comme le mariage ?",
      options: [
        "Demander un prêt bancaire illimité.",
        "S'asseoir d'abord pour calculer la dépense et vérifier sa capacité d'organisation financière.",
        "Attendre que les autres paient pour nous.",
      ],
      answer: 1,
      explanation: "La planification et le calcul budgétaire prévoyants sont des actes de sagesse divine.",
    },
    {
      question: "Quelle est la règle d'or de la préparation financière prémaritale ?",
      options: [
        "Ne jamais parler d'argent avant la cérémonie du mariage.",
        "La transparence totale sur ses revenus, ses charges, ses dettes et son épargne.",
        "Cacher son argent de poche.",
      ],
      answer: 1,
      explanation: "L'honnêteté financière préalable construit la confiance et empêche les mauvaises surprises.",
    },
    {
      question: "Qu'est-ce qu'un fonds d'urgence de prévoyance ?",
      options: [
        "De l'argent réservé uniquement pour les vacances.",
        "Une réserve financière représentant 3 à 6 mois de charges courantes pour faire face aux imprévus sans panique.",
        "Un prêt bancaire de secours.",
      ],
      answer: 1,
      explanation: "Le fonds de sécurité protège la paix du foyer lors des imprévus de la vie.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Fais un bilan honnête devant Dieu. Es-tu totalement transparent(e) sur ton état financier actuel ? As-tu la discipline nécessaire pour gérer un budget à deux, ou la peur des chiffres te pousse-t-elle à l'évitement ? Quelle décision concrète prends-tu aujourd'hui pour assainir tes finances avant de dire « oui » ?",
  },
};

/* ───────────────────────────── Leçon 3.4 ───────────────────────────── */

const lecon34: Lesson = {
  number: "3.4",
  slug: "3-4",
  title: "La maturité sociale et professionnelle : équilibre carrière, ministère et vie de famille",
  image: lessonImage("3-4"),
  poster: POSTERS["3-4"],
  pdf: `${BASE}/pdf/lecon-3-4-la-maturite-sociale-et-professionnelle.pdf`,
  readingMinutes: 6,
  intro: {
    heading: "Le piège de l'agenda saturé et du foyer sacrifié",
    blocks: [
      { type: "p", text: "Imaginons une personne qui rêve passionnément de se marier. Mais lorsqu'on étudie son emploi du temps réel, on découvre qu'elle travaille 60 heures par semaine, enchaîne les réunions ecclésiales chaque soir et consacre ses week-ends à des événements communautaires. Même si elle prétend vouloir accueillir un conjoint, sur son agenda, il n'y a littéralement aucune place pour une vie de couple." },
      { type: "p", text: "C'est un piège très répandu chez les célibataires chrétiens ambitieux ou très dévoués. Ils oublient que le mariage exige du temps, de la disponibilité émotionnelle et une présence physique réelle. Réussir sa carrière ou briller dans le ministère au prix du sacrifice de son futur foyer est un non-sens spirituel et relationnel (1 Timothée 5.8)." },
    ],
  },
  objective: "Apprendre à harmoniser ton travail, tes ministères et ta vie sociale afin de bâtir un emploi du temps équilibré et prêt à accueillir l'alliance conjugale.",
  parts: [
    {
      heading: "Soigner son champ avant de bâtir sa maison",
      blocks: [
        { type: "p", text: "La sagesse biblique établit un principe d'ordre et de chronologie dans la préparation sociale et professionnelle :" },
        { type: "verse", text: "Soigne tes affaires au-dehors, mets ton champ en état, puis tu bâtiras ta maison.", ref: "Proverbes 24.27" },
        { type: "verse", text: "Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.", ref: "Colossiens 3.23" },
        { type: "p", text: "Salomon donne un conseil de bon sens fondamental : *mettre son champ en état* (stabiliser son travail, son autonomie financière et sa responsabilité sociale) doit précéder la construction du foyer (*« puis tu bâtiras ta maison »*). Vouloir se marier sans aucune autonomie professionnelle ou dans une précarité due à la paresse est une irresponsabilité." },
        { type: "p", text: "Par ailleurs, l'excellence professionnelle (Colossiens 3.23) honore Dieu. Le travail n'est pas une malédiction, c'est une vocation sacrée. Mais il doit rester à sa juste place dans la pyramide des priorités du Royaume :" },
        { type: "steps", items: ["Dieu", "Le conjoint et le foyer", "Le travail et la carrière", "Le ministère et l'engagement social"] },
        { type: "p", text: "Inverser cet ordre détruit la vie de couple." },
      ],
    },
    {
      heading: "Les 3 pièges sociaux et professionnels fréquents",
      blocks: [
        { type: "titledSteps", items: [
          { title: "Le syndrome du « workaholic » (bourreau de travail)", text: "Chercher sa valeur personnelle uniquement dans les promotions et le statut social, ou utiliser le travail pour fuir la solitude. Le workaholic n'a plus d'énergie affective à offrir." },
          { title: "Le piège du surengagement ecclésial", text: "Remplir toutes ses soirées de réunions de ministère sous prétexte de « servir Dieu », en négligeant sa santé, son repos et sa vie affective. Dieu n'a jamais demandé de sacrifier son foyer sur l'autel de l'activisme religieux." },
          { title: "L'instabilité sociale et la dépendance", text: "Papillonner d'emploi en emploi sans constance ou rester dépendant de ses parents par refus d'effort." },
        ] },
        { type: "authorQuote", text: "Aucun succès professionnel ou ecclésiastique ne peut compenser l'échec d'un foyer abandonné par manque de présence et d'écoute.", author: "Dr. Henry Cloud, psychologue et auteur" },
      ],
    },
    {
      heading: "Le diagnostic miroir de la maturité sociale",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["L'activiste débordé (agenda saturé)", "Le disciple équilibré (priorités alignées)"],
          rows: [
            ["Est esclave de son travail ou de ses réunions et n'a aucune soirée libre.", "Travaille avec excellence mais sait poser des limites pour préserver son foyer."],
            ["Accepte toutes les charges à l'église jusqu'à l'épuisement total.", "Sait dire « non » avec politesse et sagesse pour préserver du temps de qualité."],
            ["Incapable de maintenir un emploi stable et de planifier sa subsistance.", "Assume sa subsistance avec responsabilité et prépare l'avenir avec maturité."],
            ["N'a aucune vie sociale ou amicale saine en dehors du travail et du ministère.", "Entretient un réseau d'amitiés édifiantes et une hygiène de repos régulière."],
          ],
        },
        {
          type: "worksheet",
          title: "La matrice de priorités & gestion du temps",
          intro: "Évalue l'équilibre de ton emploi du temps actuel de 1 (déséquilibré) à 5 (équilibré).",
          sections: [
            { title: "Section 1 — Auto-évaluation de l'équilibre du temps", intro: "Note chaque affirmation de 1 à 5 :", items: [
              "Mon travail me laisse du temps libre et de l'énergie le soir et les week-ends pour ma vie personnelle.",
              "Mes engagements ecclésiaux ou bénévoles sont équilibrés et ne m'épuisent pas.",
              "Je suis capable de poser des limites fermes à mon travail pour protéger mon repos.",
              "Mon activité professionnelle est suffisamment stable pour assumer les charges d'un foyer.",
            ] },
            { title: "Section 2 — Réalignement de l'emploi du temps (sous 14 jours)", items: [
              "Quelle activité ou responsabilité décides-tu d'alléger dès cette semaine pour libérer du temps pour ton futur foyer ?",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Lors de tes échanges prémaritaux sur Garden of Alliance, observe le rythme de vie du prétendant ! A-t-il du temps pour échanger en profondeur ou répond-il toujours à la hâte entre deux réunions ? A-t-il des loisirs, des moments de repos et des amis, ou sa vie est-elle un marathon d'épuisement ? Cherche un partenaire capable d'accorder une priorité réelle au temps de couple." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision.",
  quiz: [
    {
      question: "Selon Proverbes 24.27, quelle étape doit précéder la construction du foyer ?",
      options: [
        "Voyager à l'étranger.",
        "Soigner ses affaires au-dehors et stabiliser son champ (activité professionnelle).",
        "Attendre sans rien faire.",
      ],
      answer: 1,
      explanation: "La stabilité professionnelle et la prévoyance précèdent la responsabilité du mariage.",
    },
    {
      question: "Quelle est la hiérarchie divine des priorités pour un croyant ?",
      options: [
        "Travail → Ministère → Famille → Dieu.",
        "Dieu → Le conjoint et la famille → Le travail et la carrière → Le ministère et les engagements.",
        "Église → Travail → Famille → Dieu.",
      ],
      answer: 1,
      explanation: "Le foyer vient immédiatement après Dieu dans la priorité du Royaume.",
    },
    {
      question: "Quel est le risque du syndrome du « workaholic » dans la vie amoureuse ?",
      options: [
        "Gagner trop d'argent.",
        "Assécher la disponibilité temporelle et affective indispensable pour bâtir l'intimité du couple.",
        "Devenir trop joyeux.",
      ],
      answer: 1,
      explanation: "L'addiction au travail prive le conjoint de présence et d'écoute.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Fais le bilan de ta semaine passée. Combien d'heures as-tu consacrées au repos, à la prière, à tes proches et à ton développement personnel ? Si ton/ta futur(e) conjoint(e) entrait dans ta vie aujourd'hui, quelle place réelle lui offrirais-tu dans ton agenda ?",
  },
};

/* ───────────────────────────── Leçon 3.5 ───────────────────────────── */

const lecon35: Lesson = {
  number: "3.5",
  slug: "3-5",
  title: "La préparation physique et l'hygiène de vie dans le couple",
  image: lessonImage("3-5"),
  poster: POSTERS["3-5"],
  pdf: `${BASE}/pdf/lecon-3-5-la-preparation-physique.pdf`,
  readingMinutes: 6,
  intro: {
    heading: "Le sanctuaire négligé",
    blocks: [
      { type: "p", text: "Il existe dans certains milieux chrétiens une dichotomie trompeuse qui oppose le spirituel et le physique. On sur-spiritualise le cœur tout en méprisant le corps. On se dit : *« Seul le cœur compte ! La beauté est vaine et le corps n'est que de la poussière. »* Et l'on entre dans le mariage avec une hygiène corporelle négligée, une santé abandonnée au laisser-aller et parfois des addictions cachées." },
      { type: "p", text: "C'est une erreur de vision théologique majeure. Dans la Bible, le corps n'est ni un objet de honte ni un dieu à idolâtrer : il est le sanctuaire du Saint-Esprit (1 Corinthiens 6.19-20) et le véhicule terrestre par lequel tu exprimeras ta tendresse, ta présence et ton amour à ton conjoint. Prendre soin de son corps, de sa propreté, de son sommeil et de son esthétique est un acte d'honneur envers Dieu et de respect envers son futur conjoint." },
    ],
  },
  objective: "Découvrir la valeur spirituelle et relationnelle du corps, éliminer les addictions cachées (pornographie, substances) et bâtir une hygiène de vie digne de l'Alliance.",
  parts: [
    {
      heading: "La théologie du corps et le don au conjoint",
      blocks: [
        { type: "p", text: "L'apôtre Paul établit la dignité extraordinaire du corps humain dans sa première lettre aux Corinthiens :" },
        { type: "verse", text: "Ne savez-vous pas que votre corps est le temple du Saint-Esprit qui est en vous, que vous avez reçu de Dieu, et que vous ne vous appartenez point à vous-mêmes ? Car vous avez été rachetés à un grand prix. Glorifiez donc Dieu dans votre corps et dans votre esprit, qui appartiennent à Dieu.", ref: "1 Corinthiens 6.19-20" },
        { type: "p", text: "Dans l'alliance du mariage, Paul ajoute un principe d'interdépendance corporelle fascinant :" },
        { type: "verse", text: "La femme n'a pas autorité sur son propre corps, mais c'est le mari ; et pareillement, le mari n'a pas autorité sur son propre corps, mais c'est la femme.", ref: "1 Corinthiens 7.4" },
        { type: "p", text: "Ton corps deviendra le jardin intime de ton conjoint. Prendre soin de ta santé physique, soigner ta présentation vestimentaire, maintenir une hygiène bucco-dentaire et corporelle irréprochable et faire du sport pour garder de l'énergie n'est pas de la vanité : c'est de l'amour prévenant. Proposer à son conjoint un corps négligé par paresse est un manque de respect envers l'Alliance." },
      ],
    },
    {
      heading: "La libération obligatoire des addictions cachées",
      blocks: [
        { type: "p", text: "Le plus grand danger physique et mental dans la préparation au mariage est la présence d'addictions secrètes, au premier rang desquelles figurent la pornographie et la masturbation compulsive." },
        { type: "p", text: "La psychologie et la neurologie montrent que la pornographie détruit la chimie du cerveau (dopamine) et reprogramme le désir. Elle crée des attentes irréalistes, transforme l'autre en objet de consommation et assèche la capacité d'intimité réelle. Entrer dans le mariage avec une addiction pornographique dissimulée, c'est amener un tiers invisible et toxique dans le lit conjugal. La délivrance et la redevabilité sont obligatoires avant de dire « oui »." },
        { type: "authorQuote", text: "Vous ne pouvez pas offrir un cœur saint dans un corps volontairement négligé ou enchaîné par des addictions cachées. La sanctification touche aussi l'hygiène et la santé.", author: "Dr. Neil Anderson, auteur de *Le Libérateur*" },
      ],
    },
    {
      heading: "Le diagnostic miroir de l'hygiène corporelle",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["Le célibataire négligent (laisser-aller)", "Le disciple honorable (temple soigné)"],
          rows: [
            ["Néglige son apparence et son hygiène sous prétexte que « le cœur suffit ».", "Honore son corps comme temple du Saint-Esprit et soigne sa présentation."],
            ["Entretient une addiction cachée à la pornographie ou à des substances.", "Marche dans la pureté et la transparence, et se fait accompagner pour guérir."],
            ["Ne fait aucun sport et vit dans l'épuisement par manque de sommeil.", "Pratique une activité physique régulière et veille à son sommeil et à sa santé."],
            ["Refuse de faire des bilans médicaux ou de soigner des problèmes évitables.", "Prend soin de sa santé avec responsabilité en prévision de sa vie de famille."],
          ],
        },
        {
          type: "worksheet",
          title: "Le bilan d'hygiène de vie et de santé globale",
          intro: "Évalue sincèrement ton hygiène de vie de 1 (négligée) à 5 (excellente).",
          sections: [
            { title: "Section 1 — Grille d'auto-évaluation corporelle", intro: "Note chaque affirmation de 1 à 5 :", items: [
              "Je fais attention à mon hygiène corporelle et bucco-dentaire et à la propreté de ma tenue.",
              "Je pratique une activité physique régulière (2 à 3 fois par semaine) pour maintenir mon corps en santé.",
              "Je suis totalement libre de toute addiction à la pornographie ou à des substances.",
              "Je dors suffisamment et je gère mon alimentation pour éviter l'épuisement.",
            ] },
            { title: "Section 2 — Plan de pureté & remise en forme (sous 14 jours)", items: [
              "Si une addiction ou un laisser-aller existe, note la décision concrète prise (ex. : logiciel de filtrage, sport, bilan médical) :",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Pendant tes rencontres prémaritales sur Garden of Alliance, sois attentif/attentive à l'hygiène de vie globale ! Une personne qui ne prend aucun soin d'elle-même, qui vit dans le laisser-aller physique ou qui cache des dépendances manquera de discipline dans le foyer. L'attraction physique ne fait pas tout, mais le soin corporel mutuel entretient la flamme et l'honneur de l'alliance." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision.",
  quiz: [
    {
      question: "Selon 1 Corinthiens 6.19-20, quelle est la réalité théologique du corps du croyant ?",
      options: [
        "Une enveloppe sans valeur.",
        "Le temple du Saint-Esprit racheté à grand prix par Christ, qui doit être honoré.",
        "Un objet de vanité esthétique.",
      ],
      answer: 1,
      explanation: "Le corps est le sanctuaire de Dieu et doit être géré avec soin et sainteté.",
    },
    {
      question: "Quel est l'effet de la pornographie sur la préparation au mariage ?",
      options: [
        "Elle prépare à la vie de couple.",
        "Elle détruit la capacité d'intimité réelle, crée des illusions irréalistes et déforme la perception du conjoint.",
        "Elle est sans conséquence.",
      ],
      answer: 1,
      explanation: "La pornographie est une toxine relationnelle qui doit être éliminée avant l'alliance.",
    },
    {
      question: "Pourquoi l'hygiène personnelle et la présentation soignée sont-elles importantes selon 1 Corinthiens 7.4 ?",
      options: [
        "Par simple orgueil social.",
        "C'est une marque de respect et d'honneur envers soi-même et envers son futur conjoint, à qui le corps est donné.",
        "Pour plaire aux inconnus.",
      ],
      answer: 1,
      explanation: "Prendre soin de son corps entretient l'attraction et le respect mutuel dans l'alliance.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Regarde-toi avec bienveillance et vérité dans un miroir. Prends-tu réellement soin du temple du Saint-Esprit que Dieu t'a confié ? As-tu des dépendances secrètes à déposer au pied de la croix aujourd'hui pour offrir à ton futur conjoint un corps saint, pur et plein d'énergie ?",
  },
};

/* ───────────────────────────── Leçon 3.6 ───────────────────────────── */

const lecon36: Lesson = {
  number: "3.6",
  slug: "3-6",
  title: "Les 5 langages de l'amour et la gestion des réservoirs affectifs",
  image: lessonImage("3-6"),
  poster: POSTERS["3-6"],
  pdf: `${BASE}/pdf/lecon-3-6-les-5-langages-de-l-amour.pdf`,
  readingMinutes: 6,
  intro: {
    heading: "Le dialogue de sourds affectif",
    blocks: [
      { type: "p", text: "Imaginons un mari qui exprime passionnément son amour à son épouse en travaillant 12 heures par jour et en lui offrant de beaux cadeaux. Mais son épouse pleure en silence dans sa chambre, se sentant profondément délaissée parce que son cœur a désespérément besoin de 20 minutes de dialogue les yeux dans les yeux, sans téléphone. Lui parle « cadeaux et sécurité », elle comprend « absence et rejet »." },
      { type: "p", text: "C'est la tragédie de milliers de couples chrétiens sincères : ils s'aiment, mais ils parlent des langues émotionnelles différentes. L'amour biblique (*agapè*) ne consiste pas à imposer la façon dont *nous* aimons donner de l'affection, mais à apprendre avec humilité le langage affectif propre à notre futur conjoint (Philippiens 2.4) afin de maintenir son réservoir émotionnel constamment rempli." },
    ],
  },
  objective: "Découvrir les 5 langages de l'amour, comprendre le mécanisme du réservoir affectif, et développer la flexibilité relationnelle nécessaire pour aimer l'autre selon ses besoins réels.",
  parts: [
    {
      heading: "Le principe du décentrement altruiste",
      blocks: [
        { type: "p", text: "L'apôtre Paul pose la règle d'or de l'amour relationnel dans sa lettre aux Philippiens :" },
        { type: "verse", text: "Que chacun de vous, au lieu de regarder à ses propres intérêts, regarde aussi à ceux des autres.", ref: "Philippiens 2.4" },
        { type: "verse", text: "L'amour est patient, il est plein de bonté… l'amour ne cherche point son intérêt, il ne s'irrite point, il ne soupçonne point le mal.", ref: "1 Corinthiens 13.4-5" },
        { type: "p", text: "Aimer selon le Royaume exige de sortir de l'égocentrisme affectif. Si ton futur conjoint a besoin de paroles d'encouragement pour se sentir valorisé(e) et que tu ne lui donnes que des services rendus, tu réponds à ton besoin d'agir, pas à son besoin de recevoir. L'amour ne cherche pas son propre confort : il s'adapte." },
        { type: "p", text: "Tout être humain possède un « réservoir affectif » intérieur. Lorsqu'il est plein, le couple traverse les tensions avec patience et sécurité ; lorsqu'il est vide, la moindre friction provoque irritabilité, amertume et retrait. Remplir le réservoir affectif de son conjoint est un acte de gestion spirituelle quotidienne." },
      ],
    },
    {
      heading: "Les 5 langages de l'amour décodés",
      blocks: [
        { type: "titledSteps", items: [
          { title: "Les paroles d'encouragement et de valorisation", text: "Mots doux, compliments sincères, mercis explicites et encouragements. Pour cette personne, les critiques dures laissent des cicatrices profondes." },
          { title: "Les moments de qualité", text: "Attention exclusive sans distraction (sans écran), dialogues profonds et promenades à deux. Il s'agit d'être véritablement ensemble, pas juste côte à côte." },
          { title: "Les cadeaux et attentions visibles", text: "Symboles tangibles de la pensée et de l'affection. Ce n'est pas le prix qui compte, mais le fait d'avoir pensé à elle ou à lui." },
          { title: "Les services rendus", text: "Actions concrètes pour soulager la charge de l'autre (aide au foyer, démarches, soutien logistique). Pour cette personne, les actes parlent plus fort que les mots." },
          { title: "Le toucher physique", text: "Baisers, caresses, se tenir la main, étreintes chaleureuses. C'est le véhicule principal de sa sécurité affective." },
        ] },
        { type: "authorQuote", text: "Faire preuve d'amour envers son conjoint, c'est décider de parler son langage émotionnel, même si cela exige de nous de sortir de notre zone de confort.", author: "Dr. Gary Chapman, auteur des *5 langages de l'amour*" },
      ],
    },
    {
      heading: "Le diagnostic miroir des langages affectifs",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["L'égoïste affectif (incurieux)", "Le partenaire mûr (altruiste et adaptatif)"],
          rows: [
            ["Impose son propre langage et reproche à l'autre de ne pas s'en contenter.", "Étudie activement les besoins de l'autre et s'adapte à son langage primaire."],
            ["Offre uniquement ce qui lui fait plaisir à lui-même.", "Recherche les attentions qui remplissent le réservoir spécifique du conjoint."],
            ["Ignore les signaux d'un réservoir vide chez l'autre (irritabilité, boudage).", "Détecte la baisse du réservoir et prend l'initiative de le remplir à nouveau."],
            ["Utilise les mots blessants ou le retrait du toucher comme arme de punition.", "Protège le cœur du conjoint par des paroles bienveillantes et une présence sûre."],
          ],
        },
        {
          type: "worksheet",
          title: "Test d'identification des langages primaires & secondaires",
          intro: "Classe les 5 langages par ordre de priorité pour toi (de 1 = le plus important à 5 = le moins important).",
          sections: [
            { title: "Section 1 — Classement de mes langages affectifs", intro: "Donne un rang à chaque langage :", items: [
              "**Paroles d'encouragement** : mots doux, remerciements, compliments sincères. — Rang :",
              "**Moments de qualité** : attention exclusive sans écran, dialogues profonds. — Rang :",
              "**Cadeaux & attentions** : petites surprises, symboles d'une pensée attentive. — Rang :",
              "**Services rendus** : coup de main concret, soulagement des tâches. — Rang :",
              "**Toucher physique** : câlins, caresses, tenir la main, proximité physique. — Rang :",
            ] },
            { title: "Section 2 — Engagement de flexibilité affective (sous 14 jours)", items: [
              "Identifie le langage de l'amour qui t'est le moins naturel et pratique 3 actes délibérés dans ce langage envers tes proches cette semaine :",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Pendant la phase de fréquentation sur Garden of Alliance, cherche à découvrir la langue affective de ton prétendant ! Observe ce dont il ou elle se plaint le plus souvent (*« Tu ne me fais jamais de compliments »* = paroles d'encouragement ; *« Tu es toujours distrait(e) par ton téléphone »* = moments de qualité). Un partenaire mûr est curieux d'apprendre comment t'aimer correctement." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision.",
  quiz: [
    {
      question: "Selon Philippiens 2.4, quel est le cœur de l'amour chrétien dans la gestion des langages affectifs ?",
      options: [
        "Imposer son propre langage au conjoint.",
        "Regarder aux intérêts et aux besoins de l'autre en apprenant à parler sa langue émotionnelle.",
        "Attendre sans rien donner.",
      ],
      answer: 1,
      explanation: "L'amour *agapè* se décentre de soi pour répondre aux besoins réels du conjoint.",
    },
    {
      question: "Quels sont les 5 langages de l'amour selon le Dr. Gary Chapman ?",
      options: [
        "Le travail, la prière, le sport, l'argent et le silence.",
        "Les paroles d'encouragement, les moments de qualité, les cadeaux, les services rendus et le toucher physique.",
        "La logique, la critique, l'autorité, les cadeaux et les ordres.",
      ],
      answer: 1,
      explanation: "Ces 5 langages recouvrent les modes de réception de la tendresse humaine.",
    },
    {
      question: "Que provoque un réservoir affectif vide chez un conjoint ?",
      options: [
        "De la joie constante.",
        "De l'irritabilité, de l'amertume, du retrait émotionnel et des frictions fréquentes.",
        "Une plus grande spiritualité.",
      ],
      answer: 1,
      explanation: "Un réservoir vide assèche la patience et déclenche des crises relationnelles.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Connais-tu exactement ton langage de l'amour primaire ? Et surtout, es-tu prêt(e) à faire l'effort d'apprendre un langage qui ne t'est pas naturel (faire des compliments, rendre des services…) pour faire grandir la joie de ton futur conjoint ?",
  },
};

/* ───────────────────────────── Leçon 3.7 ───────────────────────────── */

const lecon37: Lesson = {
  number: "3.7",
  slug: "3-7",
  title: "Auto-évaluation globale : suis-je prêt(e) à assumer la responsabilité du mariage ?",
  image: lessonImage("3-7"),
  poster: POSTERS["3-7"],
  pdf: `${BASE}/pdf/lecon-3-7-auto-evaluation-globale.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "Le rendez-vous avec sa propre vérité",
    blocks: [
      { type: "p", text: "Imaginons un pilote de ligne qui s'apprête à faire décoller un avion avec des passagers à bord, mais qui refuse catégoriquement d'effectuer la check-list de sécurité avant le départ sous prétexte qu'il « se sent prêt ». Tout le monde s'accorderait à dire que c'est de la folie. Pourtant, des milliers de célibataires s'engagent chaque jour dans le mariage — la plus grande aventure de la vie humaine — sans jamais avoir effectué leur check-list de maturité globale devant Dieu." },
      { type: "p", text: "Félicitations d'être arrivé(e) au terme des 6 leçons du pilier 3 ! Tu as traversé l'examen de ta vie spirituelle, émotionnelle, financière, sociale, physique et affective. Cette dernière leçon de synthèse a un objectif unique : te faire passer du sentiment vague à la certitude éclairée, pour répondre en toute responsabilité à la question fondamentale : *« Suis-je véritablement prêt(e) à assumer la charge d'un foyer ? »*" },
    ],
  },
  parts: [
    {
      heading: "L'obligation biblique de l'auto-examen lucide",
      blocks: [
        { type: "p", text: "Dans la démarche de la foi chrétienne, la maturité exige l'honnêteté envers soi-même :" },
        { type: "verse", text: "Examinez-vous vous-mêmes, pour savoir si vous êtes dans la foi ; éprouvez-vous vous-mêmes. Ne reconnaissez-vous pas que Jésus-Christ est en vous ? à moins peut-être que vous ne soyez réprouvés.", ref: "2 Corinthiens 13.5" },
        { type: "verse", text: "L'enfant laisse déjà voir par ses actes si sa conduite sera pure et droite.", ref: "Proverbes 20.11" },
        { type: "p", text: "S'examiner et s'éprouver soi-même n'est pas un acte de culpabilité, mais de dignité spirituelle (2 Corinthiens 13.5). Le mariage n'est pas une loterie ni une machine à guérir miraculeusement des failles que l'on a refusé de regarder en face. Ce sont tes comportements observés dans le quotidien (Proverbes 20.11) qui révèlent ton niveau d'aptitude réel." },
        { type: "p", text: "La règle du Royaume est claire : on ne peut pas franchir le seuil du pilier 4 (discernement et choix du conjoint) sans avoir validé son propre bilan de maturité. Si tu n'es pas prêt(e) à te gouverner toi-même, tu ne seras pas prêt(e) à bâtir avec un autre." },
      ],
    },
    {
      heading: "Bilan synthétique des 6 dimensions du pilier 3",
      blocks: [
        { type: "titledSteps", items: [
          { title: "Maturité spirituelle (leçon 3.1)", text: "Une foi personnelle autonome, un autel de prière secret quotidien et un leadership de service (non autoritaire)." },
          { title: "Maturité émotionnelle (leçon 3.2)", text: "La maîtrise de la colère sous le stress, le bannissement des menaces de rupture et l'utilisation de la règle du time-out." },
          { title: "Maturité financière (leçon 3.3)", text: "La transparence totale sur les chiffres, la maîtrise d'un budget écrit et l'absence de dettes de consommation cachées." },
          { title: "Maturité sociale & professionnelle (leçon 3.4)", text: "Un emploi du temps équilibré qui accorde une priorité réelle au foyer sur le travail et le ministère." },
          { title: "Préparation physique & hygiène (leçon 3.5)", text: "Le soin du corps comme temple de Dieu, l'hygiène de vie et la libération totale de la pornographie." },
          { title: "Souplesse affective (leçon 3.6)", text: "La capacité à déceler et parler le langage de l'amour propre à son conjoint." },
        ] },
        { type: "authorQuote", text: "L'honnêteté envers soi-même est la première preuve de la maturité. Reconnaître une faiblesse aujourd'hui est le moyen le plus sûr d'éviter une crise conjugale demain.", author: "Dr. Henry Cloud, psychologue" },
      ],
    },
    {
      heading: "Le diagnostic miroir de l'aptitude au mariage",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["Profil immature / à risque (non prêt)", "Profil mûr / prêt pour l'alliance"],
          rows: [
            ["S'effondre sans béquille religieuse ; n'a aucune vie de prière secrète.", "Entretient une intimité vivante et autonome avec Dieu au quotidien."],
            ["Crie, brise des objets ou menace de divorcer lors des tensions.", "Pratique la maîtrise de soi, la retenue et la règle du time-out."],
            ["Cache ses dettes, vit au-dessus de ses moyens sans budget.", "Pratique une transparence financière totale et gère son budget avec sagesse."],
            ["Est esclave de son travail ou surengagé à l'église, sans temps libre.", "Maintient une hiérarchie stricte des priorités centrée sur le foyer."],
            ["Entretient des addictions pornographiques ou néglige son corps.", "Honore son corps comme temple de Dieu et vit dans la pureté."],
          ],
        },
        {
          type: "worksheet",
          title: "La grille d'aptitude à l'alliance (bilan synthétique)",
          intro: "Évalue sincèrement ton niveau sur chacune des 6 dimensions (note de 1 à 5), puis fais le total sur 30.",
          sections: [
            { title: "Section 1 — Auto-notation des 6 dimensions", intro: "Note chaque dimension de 1 à 5 :", items: [
              "**Maturité spirituelle** : autonomie de foi, prière quotidienne et leadership de service.",
              "**Maturité émotionnelle** : maîtrise de la colère, time-out et absence de menaces de rupture.",
              "**Maturité financière** : transparence totale, budget maîtrisé et liberté des dettes cachées.",
              "**Maturité sociale et professionnelle** : emploi du temps équilibré et priorité donnée à la vie de famille.",
              "**Préparation physique** : hygiène de vie, pureté corporelle et libération des addictions.",
              "**Souplesse affective** : capacité à pratiquer les 5 langages de l'amour pour l'autre.",
              "**Score total** : … / 30",
            ] },
            { title: "Section 2 — Validation & passage au pilier 4", intro: "Si ton score est d'au moins 22/30, sans aucune note à 1/5 :", items: [
              "Formule ton engagement de maturité et soumets ce bilan à ton mentor :",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Lorsque tu complètes la grille d'aptitude, rappelle-toi que l'objectif n'est pas d'atteindre une perfection impossible, mais d'attester d'une responsabilité vivante et d'une volonté sincère de croissance. Si tu découvres un point rouge (dettes cachées ou colère incontrôlée, par exemple), ne panique pas ! Fais une pause préventive de 14 à 30 jours avec ton mentor Garden of Alliance pour redresser ce domaine avant de lancer tes fréquentations." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision.",
  quiz: [
    {
      question: "Selon 2 Corinthiens 13.5, pourquoi l'auto-évaluation globale est-elle obligatoire ?",
      options: [
        "Pour s'auto-condamner.",
        "Pour s'examiner avec lucidité devant Dieu afin de valider sa maturité avant d'avancer vers l'engagement.",
        "Pour obtenir un certificat académique.",
      ],
      answer: 1,
      explanation: "L'examen de soi empêche d'apporter des failles majeures non traitées dans le couple.",
    },
    {
      question: "Que révèle Proverbes 20.11 sur la preuve de la maturité ?",
      options: [
        "La maturité se prouve par de beaux discours romantiques.",
        "Ce sont les actes et comportements observés au quotidien qui attestent de la maturité réelle.",
        "La maturité dépend de l'âge chronologique.",
      ],
      answer: 1,
      explanation: "Les actes concrets sont le miroir de l'état réel de l'âme.",
    },
    {
      question: "Que doit faire une personne qui obtient une note de 1/5 sur la colère ou les dettes ?",
      options: [
        "Ignorer la note et chercher un conjoint tout de suite.",
        "Suivre un plan de redressement ciblé de 14 à 30 jours avec son mentor Garden of Alliance.",
        "Abandonner son projet de mariage.",
      ],
      answer: 1,
      explanation: "Un point rouge doit être traité avec responsabilité avant de s'engager avec un autre.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Regarde le score global de ta grille d'aptitude. As-tu la certitude intérieure d'être prêt(e) à assumer la responsabilité d'un foyer selon Dieu ? Quels sont les 2 domaines où tu t'engages à grandir dès aujourd'hui avec l'aide du Saint-Esprit ?",
  },
};

/* ───────────────────────────── Pilier ───────────────────────────── */

export const pillar3: Pillar = {
  number: 3,
  slug: "bilan-de-maturite",
  title: "Bilan de maturité & préparation multidimensionnelle",
  summary: "Faire le point, dimension par dimension — spirituelle, émotionnelle, financière, sociale, physique et affective — pour savoir en vérité si l'on est prêt(e) à assumer la responsabilité d'un foyer.",
  poster: PILLAR_3_POSTER,
  lessons: [lecon31, lecon32, lecon33, lecon34, lecon35, lecon36, lecon37],
};
