// Contenu des modules de l'Académie du Mariage (vie de couple).

export interface AcademySection {
  title: string;
  body: string;
  tip?: string;
}

export interface AcademyModule {
  slug: string;
  icon: string; // clé mappée vers une icône lucide dans la page
  title: string;
  subtitle: string;
  verse: { text: string; ref: string };
  intro: string;
  sections: AcademySection[];
  prayer: string;
}

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    slug: "vision-biblique",
    icon: "church",
    title: "La vision biblique du Mariage",
    subtitle: "Une alliance sacrée, reflet de l'amour de Christ",
    verse: {
      text: "C'est pourquoi l'homme quittera son père et sa mère, s'attachera à sa femme, et ils deviendront une seule chair.",
      ref: "Genèse 2:24",
    },
    intro:
      "Le mariage n'est pas une simple union sociale ni un contrat révocable : c'est une alliance instituée par Dieu, image de l'amour fidèle de Christ pour son Église. Comprendre cette vision change radicalement la manière d'aimer et de durer.",
    sections: [
      {
        title: "Une alliance, pas un contrat",
        body: "Le contrat protège des droits ; l'alliance engage des personnes. Là où le monde dit « tant que je reçois », l'alliance dit « quoi qu'il arrive ». C'est un engagement inconditionnel pris devant Dieu.",
        tip: "Posez-vous la question : est-ce que j'aime pour recevoir, ou pour donner ?",
      },
      {
        title: "« Une seule chair »",
        body: "L'unité du couple touche le corps, l'âme et l'esprit. Elle se construit dans le temps, par des milliers de petits choix de préférer l'autre et le « nous » au « je ».",
      },
      {
        title: "Le reflet de Christ et l'Église",
        body: "Éphésiens 5 présente le mariage comme un mystère qui annonce l'Évangile : un amour qui se donne, pardonne et reste fidèle. Votre foyer devient un témoignage.",
      },
    ],
    prayer:
      "Seigneur, donne-nous de voir notre union comme une alliance sacrée. Apprends-nous à aimer comme tu aimes : fidèlement, patiemment, jusqu'au bout. Amen.",
  },
  {
    slug: "communication",
    icon: "message",
    title: "Communication & Conflits",
    subtitle: "Écouter, parler vrai, se réconcilier",
    verse: {
      text: "Que tout homme soit prompt à écouter, lent à parler, lent à se mettre en colère.",
      ref: "Jacques 1:19",
    },
    intro:
      "La plupart des tensions ne viennent pas des différences, mais de la façon de les gérer. Une communication saine et un conflit traité avec amour renforcent le couple au lieu de le diviser.",
    sections: [
      {
        title: "Écouter pour comprendre",
        body: "Écoutez pour comprendre, pas pour répondre. Reformulez ce que dit l'autre avant de réagir : « Si je comprends bien, tu ressens… ». La validation désamorce la moitié des conflits.",
        tip: "Rangez le téléphone et regardez l'autre dans les yeux pendant qu'il parle.",
      },
      {
        title: "Parler avec vérité et douceur",
        body: "Dites « je » plutôt que « tu » accusateur : « je me sens blessé quand… » au lieu de « tu fais toujours… ». La vérité dans l'amour (Éphésiens 4:15) construit ; la vérité sans amour détruit.",
      },
      {
        title: "Ne pas laisser le soleil se coucher",
        body: "« Que le soleil ne se couche pas sur votre colère » (Éph 4:26). On peut suspendre une discussion, jamais la relation. Réconciliez-vous avant la nuit, même imparfaitement.",
      },
    ],
    prayer:
      "Père, mets une garde sur nos lèvres et de la patience dans nos cœurs. Que nos paroles édifient et que nos conflits nous rapprochent de toi et l'un de l'autre. Amen.",
  },
  {
    slug: "finances",
    icon: "wallet",
    title: "Gestion des Finances",
    subtitle: "L'intendance fidèle d'un foyer uni",
    verse: {
      text: "Car là où est ton trésor, là aussi sera ton cœur.",
      ref: "Matthieu 6:21",
    },
    intro:
      "L'argent est l'une des premières causes de conflit conjugal — non par manque, mais par manque d'alignement. Gérer les finances comme une équipe, sous le regard de Dieu, protège l'unité.",
    sections: [
      {
        title: "Transparence totale",
        body: "Avant le mariage, partagez honnêtement revenus, dettes et habitudes. Après, plus de « mon argent / ton argent » caché : un foyer, un projet, une vision commune.",
        tip: "Fixez un montant au-delà duquel toute dépense se décide à deux.",
      },
      {
        title: "Un budget bâti ensemble",
        body: "« Qui de vous, voulant bâtir une tour, ne s'assied d'abord pour calculer la dépense ? » (Luc 14:28). Un budget simple — donner, épargner, vivre — évite l'angoisse et les reproches.",
      },
      {
        title: "Générosité et contentement",
        body: "« L'amour de l'argent est une racine de tous les maux » (1 Tim 6:10). Donnez en premier, vivez avec contentement, fuyez la course à la comparaison. La paix vaut plus que le superflu.",
      },
    ],
    prayer:
      "Seigneur, fais de nous de bons intendants de ce que tu confies. Délivre-nous de l'avidité et de l'inquiétude, et rends-nous généreux et unis. Amen.",
  },
  {
    slug: "belle-famille",
    icon: "users",
    title: "Belle-famille & Limites",
    subtitle: "Quitter pour s'attacher, honorer sans se laisser envahir",
    verse: {
      text: "L'homme quittera son père et sa mère et s'attachera à sa femme.",
      ref: "Genèse 2:24",
    },
    intro:
      "Honorer ses parents (et beaux-parents) est un commandement ; mais fonder un foyer suppose aussi de « quitter » pour faire du conjoint la priorité. Poser des limites saines protège le couple sans manquer de respect.",
    sections: [
      {
        title: "« Quitter » émotionnellement",
        body: "Quitter, ce n'est pas abandonner ses parents, mais transférer la première loyauté vers son conjoint. Les décisions du foyer se prennent à deux, pas sous la tutelle des familles.",
        tip: "Présentez toujours un front uni : décidez en couple avant d'en parler aux familles.",
      },
      {
        title: "Honorer avec sagesse",
        body: "Honorez vos aînés, recherchez leurs conseils, mais filtrez avec discernement. Le respect n'oblige pas l'obéissance aveugle une fois adulte et marié.",
      },
      {
        title: "Des limites claires et aimantes",
        body: "Des frontières dites avec douceur évitent l'amertume : horaires de visite, ingérence, confidences du couple. Protéger l'intimité conjugale n'est pas un rejet, c'est de la sagesse.",
      },
    ],
    prayer:
      "Père, aide-nous à honorer nos familles tout en protégeant notre foyer. Donne-nous le courage de poser des limites avec amour et la grâce de rester unis. Amen.",
  },
  {
    slug: "intimite",
    icon: "flame",
    title: "Intimité conjugale",
    subtitle: "Un don de Dieu pour l'unité du couple",
    verse: {
      text: "Que le mariage soit honoré de tous, et le lit conjugal exempt de souillure.",
      ref: "Hébreux 13:4",
    },
    intro:
      "Loin d'être un sujet tabou, l'intimité est un cadeau du Créateur, réservé et célébré dans le mariage. Vécue avec respect, tendresse et écoute, elle scelle l'unité du couple.",
    sections: [
      {
        title: "Un cadeau, pas une honte",
        body: "Le Cantique des Cantiques célèbre l'amour conjugal sans gêne. Dieu a conçu l'intimité pour le plaisir, la consolation et l'unité — à honorer, pas à banaliser ni diaboliser.",
      },
      {
        title: "Se donner l'un à l'autre",
        body: "« Que le mari rende à sa femme ce qu'il lui doit, et la femme de même » (1 Cor 7:3). L'intimité est un service mutuel : on cherche le bien et le plaisir de l'autre avant le sien.",
        tip: "La vraie intimité commence hors de la chambre : par la tendresse et l'attention au quotidien.",
      },
      {
        title: "Pureté avant, fidélité après",
        body: "Attendre le mariage n'est pas un retard mais une préparation : on apprend à s'aimer autrement. Après, la fidélité du cœur et des yeux garde le feu allumé.",
      },
    ],
    prayer:
      "Seigneur, sanctifie notre amour. Apprends-nous le respect, la tendresse et le don de soi, et garde notre cœur fidèle l'un à l'autre. Amen.",
  },
  {
    slug: "roles",
    icon: "briefcase",
    title: "Rôles & Responsabilités",
    subtitle: "Le leadership serviteur et la soumission mutuelle",
    verse: {
      text: "Soumettez-vous les uns aux autres dans la crainte de Christ.",
      ref: "Éphésiens 5:21",
    },
    intro:
      "Le foyer chrétien n'est ni une dictature ni une rivalité, mais une équipe où chacun sert l'autre. Comprendre les rôles dans l'amour libère au lieu d'opprimer.",
    sections: [
      {
        title: "Servir avant de diriger",
        body: "Le modèle du Christ est le leadership serviteur : « Le plus grand parmi vous sera votre serviteur ». Diriger, c'est porter, protéger et se sacrifier pour l'autre, jamais dominer.",
      },
      {
        title: "Considérer l'autre supérieur",
        body: "« Par humilité, estimez les autres comme étant au-dessus de vous-mêmes » (Phil 2:3). Chacun veille aux intérêts de l'autre. La soumission est mutuelle, par amour.",
        tip: "Répartissez les tâches selon les dons de chacun, pas selon des stéréotypes.",
      },
      {
        title: "Équilibrer ambitions et foyer",
        body: "Le travail est une vocation, mais le foyer n'est pas une variable d'ajustement. Décidez ensemble des priorités pour que la réussite professionnelle ne se paie pas en absence.",
      },
    ],
    prayer:
      "Père, apprends-nous à nous servir mutuellement avec humilité. Que nul ne cherche à dominer, mais que chacun préfère l'autre, à l'image de Christ. Amen.",
  },
  {
    slug: "vie-spirituelle",
    icon: "heart",
    title: "Vie spirituelle de couple",
    subtitle: "Bâtir l'autel familial",
    verse: {
      text: "Moi et ma maison, nous servirons l'Éternel.",
      ref: "Josué 24:15",
    },
    intro:
      "Un couple qui prie ensemble se tient devant Dieu côte à côte. La vie spirituelle commune est le ciment qui résiste aux tempêtes — c'est le « troisième brin » de la corde qui ne se rompt pas.",
    sections: [
      {
        title: "Prier ensemble",
        body: "« Là où deux s'accordent pour demander, cela leur sera accordé » (Mt 18:19-20). Quelques minutes de prière commune par jour soudent plus qu'un long discours.",
        tip: "Commencez petit : un merci et une demande, ensemble, chaque soir.",
      },
      {
        title: "Méditer la Parole",
        body: "Lisez un court passage ensemble et partagez ce qu'il vous dit. La Parole devient une boussole partagée pour vos décisions et vos désaccords.",
      },
      {
        title: "Servir comme une équipe",
        body: "S'engager ensemble dans l'église ou auprès des autres détourne le regard de soi et fortifie l'unité. Le couple qui sert grandit.",
      },
    ],
    prayer:
      "Seigneur, sois le centre de notre foyer. Donne-nous la fidélité de te chercher ensemble chaque jour et de servir ton Royaume comme une équipe. Amen.",
  },
  {
    slug: "enfants",
    icon: "baby",
    title: "Éducation des enfants",
    subtitle: "Transmettre la foi aux générations",
    verse: {
      text: "Instruis l'enfant selon la voie qu'il doit suivre ; et quand il sera vieux, il ne s'en détournera pas.",
      ref: "Proverbes 22:6",
    },
    intro:
      "Élever des enfants est une mission confiée par Dieu. Avant même qu'ils naissent, il est sage de s'accorder sur les valeurs, la discipline et la transmission de la foi.",
    sections: [
      {
        title: "S'accorder en amont",
        body: "Discutez tôt de votre vision : discipline, école, écrans, foi. Un désaccord parental devant l'enfant fragilise l'autorité ; l'unité des parents le sécurise.",
        tip: "Mettez-vous d'accord en privé, présentez une décision commune à l'enfant.",
      },
      {
        title: "Transmettre par l'exemple",
        body: "« Ces commandements… tu les inculqueras à tes enfants » (Deut 6:6-7). On transmet surtout ce que l'on vit. La foi se voit avant de s'enseigner.",
      },
      {
        title: "Discipline et tendresse",
        body: "La discipline biblique vise à former le cœur, pas à briser l'enfant : des limites fermes dans un amour inconditionnel. Corriger sans exaspérer (Éph 6:4).",
      },
    ],
    prayer:
      "Père, prépare nos cœurs à élever des enfants pour toi. Donne-nous sagesse, patience et unité, afin de leur transmettre la foi par l'exemple. Amen.",
  },
  {
    slug: "temps-loisirs",
    icon: "clock",
    title: "Temps & Loisirs",
    subtitle: "Cultiver l'unité et préserver l'équilibre",
    verse: {
      text: "Il y a un temps pour tout, un temps pour toute chose sous les cieux.",
      ref: "Ecclésiaste 3:1",
    },
    intro:
      "L'amour se nourrit de temps partagé. Entre travail, famille et amis, protéger des moments à deux et un repos sain n'est pas un luxe : c'est un investissement dans le couple.",
    sections: [
      {
        title: "Du temps protégé à deux",
        body: "Planifiez des moments réguliers rien que pour vous, comme un rendez-vous sacré. Ce qui n'est pas planifié finit par disparaître sous l'urgent.",
        tip: "Bloquez une soirée par semaine « couple » et tenez-la comme un engagement.",
      },
      {
        title: "Repos et sabbat",
        body: "« Enseigne-nous à bien compter nos jours » (Ps 90:12). Un rythme avec du repos protège de l'épuisement qui ronge les relations. Dieu lui-même s'est reposé.",
      },
      {
        title: "Amitiés et jardin secret",
        body: "Cultiver des amitiés saines et garder un espace personnel nourrit le couple au lieu de l'étouffer. L'unité n'est pas la fusion : deux personnes entières s'aiment mieux.",
      },
    ],
    prayer:
      "Seigneur, aide-nous à bien gérer notre temps : à nous réserver l'un à l'autre, à nous reposer en toi, et à garder l'équilibre. Amen.",
  },
  {
    slug: "cinq-piliers",
    icon: "mountain",
    title: "Les 5 piliers d'un foyer fondé sur le roc",
    subtitle: "Bâtir sur le roc, jamais sur le sable",
    verse: {
      text: "Quiconque entend ces paroles que je dis et les met en pratique sera semblable à un homme prudent qui a bâti sa maison sur le roc.",
      ref: "Matthieu 7:24-25",
    },
    intro:
      "Deux maisons, deux fondations. La tempête vient pour les deux, mais seule celle bâtie sur le roc tient debout. Un foyer solide ne repose pas sur les sentiments ni sur la chance, mais sur cinq piliers que l'on choisit d'édifier, jour après jour.",
    sections: [
      {
        title: "1. Christ, la pierre angulaire",
        body: "« Si l'Éternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain » (Ps 127:1). Un couple uni par une même foi place Dieu au centre de ses décisions : il devient le point d'appui qui ne cède pas quand tout vacille.",
        tip: "Posez-vous régulièrement la question : qui est réellement au centre de notre foyer aujourd'hui ?",
      },
      {
        title: "2. La prière et la Parole",
        body: "L'autel familial est le second pilier. Prier et méditer ensemble crée une intimité spirituelle qui dépasse l'émotion. La Parole devient la boussole commune des choix du foyer.",
      },
      {
        title: "3. La communication vraie",
        body: "« Prompt à écouter, lent à parler » (Jacques 1:19). Un foyer solide se parle avec vérité et douceur, sans mépris ni silence punitif. On nomme les choses avant qu'elles ne s'enveniment.",
      },
      {
        title: "4. L'engagement fidèle",
        body: "L'alliance se vit dans la durée : une loyauté qui ne dépend pas de l'humeur. La fidélité du cœur, des yeux et des actes protège le couple des tempêtes et des séductions.",
      },
      {
        title: "5. Le pardon et la grâce",
        body: "« Supportez-vous les uns les autres, et pardonnez-vous » (Col 3:13). Aucun foyer ne tient sans pardon : c'est le mortier qui répare les fissures et empêche la rancune de fissurer les fondations.",
        tip: "Ne laissez aucune offense s'installer : décidez de pardonner avant qu'elle ne durcisse.",
      },
    ],
    prayer:
      "Seigneur, sois la pierre angulaire de notre foyer. Aide-nous à bâtir sur le roc de ta Parole : dans la prière, la vérité, la fidélité et le pardon, afin que notre maison tienne dans la tempête. Amen.",
  },
  {
    slug: "celibat-foi",
    icon: "sprout",
    title: "Célibat & Foi : une saison de préparation",
    subtitle: "Vivre l'attente comme un temps fécond",
    verse: {
      text: "Fais de l'Éternel tes délices, et il te donnera ce que ton cœur désire.",
      ref: "Psaume 37:4",
    },
    intro:
      "Le célibat n'est pas un vide à combler en urgence, ni une salle d'attente avant la « vraie vie ». C'est une saison précieuse où Dieu prépare le cœur, forme le caractère et enracine l'identité — pour aimer un jour avec maturité plutôt que par manque.",
    sections: [
      {
        title: "Une saison, pas une punition",
        body: "Chaque saison a sa grâce (Ecc 3:1). Le célibat offre une liberté rare : se consacrer à Dieu d'un cœur sans partage (1 Cor 7:32-34), se connaître et guérir. Le vivre pleinement, c'est refuser de mettre sa vie en pause.",
        tip: "Demandez-vous : qu'est-ce que cette saison me permet de vivre que je ne pourrai plus vivre ensuite ?",
      },
      {
        title: "Se préparer plutôt que se précipiter",
        body: "Plutôt que de chercher fébrilement « la bonne personne », devenez la bonne personne. Travaillez votre caractère, vos finances, vos blessures : on n'attire pas ce qu'on désire, mais ce que l'on est.",
      },
      {
        title: "Garder son cœur et sa pureté",
        body: "« Garde ton cœur plus que toute autre chose, car de lui viennent les sources de la vie » (Pr 4:23). La pureté n'est pas une privation mais une protection : elle préserve le don de l'intimité pour l'alliance à venir.",
      },
      {
        title: "Attendre en servant",
        body: "« Il est bon d'attendre en silence le secours de l'Éternel » (Lam 3:26). Attendre n'est pas rester inactif : servez, créez des amitiés saines, grandissez dans l'Église. L'attente féconde porte du fruit.",
      },
    ],
    prayer:
      "Seigneur, apprends-moi à vivre cette saison sans amertume ni précipitation. Forme mon caractère, garde mon cœur pur, et fais de toi mes délices, en attendant l'alliance que tu prépares. Amen.",
  },
  {
    slug: "conflits-bibliques",
    icon: "handshake",
    title: "Gérer les conflits selon la Bible",
    subtitle: "Du désaccord à la réconciliation",
    verse: {
      text: "Une réponse douce calme la fureur, mais une parole dure excite la colère.",
      ref: "Proverbes 15:1",
    },
    intro:
      "Le conflit n'est pas le signe d'un couple raté : c'est le signe de deux personnes différentes qui s'aiment. Ce qui détruit n'est pas le désaccord, mais la manière de le traiter. La Bible offre un chemin clair pour transformer la dispute en réconciliation.",
    sections: [
      {
        title: "Choisir la réponse douce",
        body: "« Une réponse douce calme la fureur » (Pr 15:1). Le ton compte autant que les mots. Baisser la voix, ralentir, refuser le sarcasme et le mépris : c'est déjà désamorcer la moitié du conflit.",
        tip: "Avant de répondre sous le coup de l'émotion, respirez et demandez-vous : est-ce que je veux gagner, ou nous réconcilier ?",
      },
      {
        title: "Régler en privé et directement",
        body: "« Va et reprends-le entre toi et lui seul » (Mt 18:15). On parle à son conjoint, pas de son conjoint : ni aux réseaux, ni aux familles, ni aux amis. Le linge du couple se lave à deux, dans le respect.",
      },
      {
        title: "Ôter d'abord sa propre poutre",
        body: "« Ôte premièrement la poutre de ton œil » (Mt 7:3-5). Avant d'accuser, reconnaissez votre part. L'humilité de dire « j'ai eu tort sur ce point » ouvre le cœur de l'autre plus qu'un long plaidoyer.",
      },
      {
        title: "Pardonner comme Christ",
        body: "« Pardonnez-vous réciproquement, comme Christ vous a pardonné » (Col 3:13). Le but n'est pas d'avoir raison mais de restaurer le lien. Le pardon clôt le conflit et empêche la rancune de revenir l'alimenter.",
        tip: "Terminez chaque réconciliation par un geste concret : une étreinte, une prière courte ensemble.",
      },
    ],
    prayer:
      "Père, dans nos désaccords, garde nos paroles douces et nos cœurs humbles. Apprends-nous à nous reprendre dans l'amour, à reconnaître nos torts et à pardonner comme tu nous pardonnes. Amen.",
  },
];

export function getModule(slug: string): AcademyModule | undefined {
  return ACADEMY_MODULES.find((m) => m.slug === slug);
}
