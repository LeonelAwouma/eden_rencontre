// Formation « Bâtir sur le roc » — préparation au mariage en six piliers.
// Contenu transcrit des leçons PDF rédigées par l'équipe Garden of Alliance.
// Les PDF et les images sont servis depuis public/formation/batir-sur-le-roc/.
import type { Formation, Lesson, Pillar } from "./types";

const BASE = "/formation/batir-sur-le-roc";
const img = (n: string) => ({ src: `${BASE}/images/lecon-${n}.webp`, card: `${BASE}/images/lecon-${n}-carte.webp` });

/* ───────────────────────────── Pilier 1 ───────────────────────────── */

const lecon11: Lesson = {
  number: "1.1",
  slug: "1-1",
  title: "Entre éloge et réalité",
  image: { ...img("1-1"), alt: "Des mariés côte à côte pendant la cérémonie, la mariée tenant un bouquet de roses pâles." },
  pdf: `${BASE}/pdf/lecon-1-1-entre-eloge-et-realite.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "La lentille à travers laquelle nous regardons l'amour",
    blocks: [
      { type: "p", text: "Bienvenue dans ce premier pilier de notre parcours. Avant d'apprendre comment choisir la bonne personne ou comment communiquer, il est vital de savoir ce que l'on cherche à construire. Tout commence par la vision." },
      { type: "p", text: "Nous abordons tous la question du mariage avec des lunettes invisibles, forgées par la culture, nos expériences et nos observations. Le problème ? Ces lunettes sont souvent déformantes. Elles nous poussent généralement vers deux extrêmes destructeurs : **l'idéalisation naïve** ou **le cynisme amer**. Tant que ces deux illusions ne sont pas déconstruites, même le meilleur des conjoints nous paraîtra inadéquat ou menaçant." },
    ],
  },
  objective: "Déposer nos lunettes déformantes pour embrasser la vision claire, puissante et sacrée que Dieu a du mariage.",
  parts: [
    {
      heading: "L'ivresse de l'idéalisation (le mythe de la facilité)",
      blocks: [
        { type: "p", text: "La culture moderne, des films romantiques aux réseaux sociaux, nous a vendu une version altérée de l'amour. C'est l'idée que « l'amour suffit », que la bonne personne viendra combler tous nos vides existentiels, et que si l'on a trouvé la fameuse « âme sœur », tout coulera de source, sans effort." },
        { type: "p", text: "C'est ce qu'on appelle l'idéalisation naïve. Dans cette vision, l'amour est un produit de consommation basé sur l'émotion pure. On attend de l'autre qu'il soit parfait, qu'il lise dans nos pensées et qu'il ne nous frustre jamais." },
        { type: "p", text: "Le danger mortel de cette vision ? **L'intolérance à la réalité.** Dès le premier conflit sérieux, ou face à la première sécheresse émotionnelle, l'idéaliste panique et conclut : « Je me suis trompé de personne, l'amour a disparu. » Or, l'amour ne disparaît pas face au conflit ; il est simplement mis à l'épreuve pour passer de l'émotion à l'alliance." },
      ],
    },
    {
      heading: "L'armure du cynisme (la blessure déguisée en sagesse)",
      blocks: [
        { type: "p", text: "À l'opposé de l'idéalisation se trouve le cynisme. Celui qui a vu des mariages s'effondrer autour de lui, ou qui a lui-même essuyé de cuisantes trahisons, finit par adopter une posture défensive. Le cynique déclare : « Le grand amour n'existe pas, ça finit toujours mal, les hommes/femmes sont tous les mêmes. »" },
        { type: "p", text: "Il est crucial de comprendre que **le cynisme n'est rien d'autre que de l'idéalisme blessé**. C'est un mécanisme de protection. En s'attendant au pire, le cynique s'assure de ne plus jamais être déçu." },
        { type: "p", text: "Mais cette posture a un prix exorbitant. En construisant un mur pour empêcher la douleur d'entrer, on empêche aussi l'amour véritable de s'installer. Un célibataire cynique sabotera inconsciemment toute relation saine, car son cerveau cherchera constamment la preuve que « l'autre va finir par le trahir »." },
        { type: "verse", text: "Garde ton cœur plus que toute autre chose, car de lui jaillissent les sources de la vie.", ref: "Proverbes 4.23" },
        { type: "p", text: "Garder son cœur ne signifie pas l'emmurer, mais le préserver de la contamination du désespoir." },
      ],
    },
    {
      heading: "La troisième voie : la réalité de l'Alliance sacrée",
      blocks: [
        { type: "p", text: "Entre le conte de fées hollywoodien et le pessimisme moderne se dresse la vision biblique du mariage : **l'Alliance**." },
        { type: "p", text: "L'alliance n'est ni un contrat de consommation (où je reste tant que j'y trouve mon compte), ni une prison. C'est un engagement sacré, volontaire et mature, entre deux personnes imparfaites qui décident de s'unir sous le regard d'un Dieu parfait." },
        { type: "p", text: "Dans la vision sacrée du mariage :" },
        {
          type: "points",
          items: [
            { lead: "Le but n'est pas le confort, mais la croissance.", text: "Le mariage ne te rendra pas toujours heureux à chaque seconde, mais il te rendra saint. Il agira comme un miroir pour te faire grandir." },
            { lead: "L'amour est une décision, pas juste une émotion.", text: "Quand les papillons du début s'apaisent, c'est le choix intentionnel d'aimer qui prend le relais. C'est un amour qui retrousse ses manches." },
            { lead: "L'imperfection est attendue.", text: "Parce que la vision est claire, on ne s'effondre pas quand le conjoint montre ses limites. On s'appuie sur la grâce de Dieu pour pardonner et avancer." },
          ],
        },
      ],
    },
  ],
  caseStudy: {
    title: "Le cas de Marc — du virtuel au réel",
    context: "Marc échange avec une personne partageant sa foi. Sur un sujet d'organisation, elle exprime un avis divergent et un brin d'impatience.",
    responses: [
      { label: "Réflexe idéaliste", text: "« Elle est impatiente, ce n'est pas mon âme sœur. Tout devrait être fluide. »" },
      { label: "Réflexe cynique", text: "« Encore une personne instable, ils montrent tous leur vrai visage. »" },
      { label: "Attitude d'Alliance", text: "Marc se dit : « L'amour n'est pas l'absence d'imperfection, mais la capacité à échanger dans la grâce. Observons comment nous gérons la suite en échangeant calmement. »", right: true },
    ],
  },
  compass: {
    title: "La clé pour ton célibat aujourd'hui",
    blocks: [
      { type: "p", text: "En naviguant sur Garden of Alliance, rejette à la fois l'exigence de perfection (l'idéalisation) et la méfiance systématique (le cynisme). Cherche un partenaire non pas pour combler un vide ou jouer un rôle dans un scénario parfait, mais pour **bâtir une alliance réelle, ancrée dans la réalité et portée par la grâce**." },
    ],
  },
  quizIntro: "Réponds à ces questions pour valider ta compréhension de la vision de l'alliance.",
  quiz: [
    {
      question: "Quel est le principal danger de « l'idéalisation naïve » du couple ?",
      options: [
        "Elle empêche de ressentir de vraies émotions.",
        "Elle rend intolérant à la réalité et aux imperfections inévitables de l'autre.",
        "Elle pousse à choisir une personne trop différente de soi.",
      ],
      answer: 1,
      explanation: "En exigeant la perfection et la facilité, l'idéalisation fait fuir au premier obstacle, confondant « conflit » avec « erreur de casting ».",
    },
    {
      question: "Comment la leçon définit-elle le cynisme ?",
      options: [
        "Comme une grande sagesse acquise par l'expérience.",
        "Comme une lucidité nécessaire pour ne pas se faire avoir.",
        "Comme un idéalisme blessé qui utilise le pessimisme comme bouclier.",
      ],
      answer: 2,
      explanation: "Le cynique veut se protéger. Le problème, c'est que l'armure qui le protège de la douleur l'isole aussi de l'amour véritable.",
    },
    {
      question: "Quelle est la différence majeure entre l'amour tel que vendu par la culture et l'amour de « l'alliance » biblique ?",
      options: [
        "L'amour culturel est une émotion à consommer, l'alliance est une décision et un engagement sacré.",
        "L'amour de l'alliance est forcément sans conflits.",
        "L'amour culturel demande plus de sacrifices.",
      ],
      answer: 0,
      explanation: "L'alliance perdure bien après que l'émotion intense des débuts s'est stabilisée, car elle repose sur un choix quotidien.",
    },
    {
      question: "Selon la vision sacrée, quel est l'un des buts profonds du mariage ?",
      options: [
        "Garantir le confort émotionnel permanent.",
        "Être un outil de croissance spirituelle et de sainteté.",
        "Permettre de ne plus jamais se sentir seul.",
      ],
      answer: 1,
      explanation: "Le conjoint agit souvent comme un miroir qui révèle nos propres limites, nous poussant à grandir et à ressembler davantage à Christ.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "En toute honnêteté, vers lequel de ces deux extrêmes penches-tu naturellement aujourd'hui ? As-tu tendance à chercher « l'âme sœur parfaite » qui ne te décevra jamais (idéalisation), ou abordes-tu les profils avec méfiance en te disant que « de toute façon, les gens déçoivent » (cynisme) ? Confie cette tendance à Dieu aujourd'hui pour embrasser la vision claire de l'Alliance.",
  },
};

const lecon12: Lesson = {
  number: "1.2",
  slug: "1-2",
  title: "Le mariage comme sanctuaire",
  image: { ...img("1-2"), alt: "Allée d'une église décorée de fleurs blanches et vertes ; au fond, les mariés se tiennent devant l'autel." },
  pdf: `${BASE}/pdf/lecon-1-2-le-mariage-comme-sanctuaire.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "L'oasis dans un monde de performance",
    blocks: [
      { type: "p", text: "Dans la leçon précédente, nous avons déconstruit nos illusions pour adopter la vision de l'Alliance. Explorons maintenant la nature profonde de cette alliance. À quoi le foyer chrétien est-il censé ressembler de l'intérieur ?" },
      { type: "p", text: "Nous vivons dans un monde épuisant. La société est un espace de compétition, d'évaluation constante et de performance. Sur une plateforme de rencontre, on peut parfois ressentir cette même pression : on a l'impression de devoir prouver sa valeur, de cacher ses failles et de toujours présenter son « meilleur profil »." },
      { type: "p", text: "Mais selon le cœur de Dieu, le foyer conjugal doit être l'exact opposé de la frénésie du monde. Il n'est pas conçu pour être une extension du champ de bataille extérieur, mais **un sanctuaire**. Ce mot n'est pas une figure de style romantique, c'est une réalité spirituelle fondamentale qui doit guider votre vision du couple." },
    ],
  },
  parts: [
    {
      heading: "La théologie du refuge (le courage de désarmer)",
      blocks: [
        { type: "p", text: "Dans les Écritures, Dieu se révèle constamment comme un refuge, une haute retraite, un abri sûr contre la tempête (Psaume 46). Le mariage biblique est appelé à être l'incarnation terrestre de ce refuge divin. C'est un espace sacré où la grâce remplace le jugement, et où chaque conjoint peut, littéralement, ôter son armure." },
        { type: "p", text: "Avant la chute, dans le jardin d'Éden, l'homme et la femme étaient « nus et n'en éprouvaient point de honte » (Genèse 2.25). Ils n'avaient rien à cacher et rien à prouver. Le mariage chrétien est une invitation à recréer cette petite parcelle d'Éden. C'est le seul endroit au monde où tu devrais pouvoir dire « je suis fatigué, j'ai échoué, j'ai peur », tout en sachant que tu es en sécurité absolue." },
      ],
    },
    {
      heading: "Les deux antipodes du sanctuaire",
      blocks: [
        { type: "p", text: "Pour bien comprendre ce qu'est un sanctuaire, il faut identifier ce qu'il n'est pas. Faute de vision claire, de nombreux couples transforment leur foyer en l'un de ces deux lieux toxiques :" },
        {
          type: "points",
          items: [
            { lead: "Le ring de boxe.", text: "C'est une relation où domine l'ego. Le foyer devient un lieu d'affrontement où l'on compte les points et où l'on cherche à avoir raison à tout prix. Mais dans l'arithmétique de l'alliance, si l'un écrase l'autre pour gagner le match, c'est le couple entier qui perd. Le sanctuaire est détruit." },
            { lead: "La scène de théâtre.", text: "C'est une relation de façade. Par terreur de ne pas être à la hauteur ou d'être rejeté, on y joue un rôle — l'époux fort qui ne doute jamais, l'épouse parfaite qui sourit toujours. Mais la perfection est une illusion qui tue l'intimité véritable. On ne se repose jamais vraiment sur une scène de théâtre." },
          ],
        },
      ],
    },
    {
      heading: "La condition vitale : la sécurité émotionnelle",
      blocks: [
        { type: "p", text: "On associe souvent à tort la sécurité du foyer à la réussite financière ou matérielle. En réalité, **la pauvreté la plus douloureuse dans un couple est la précarité émotionnelle**." },
        { type: "p", text: "La vulnérabilité — cette capacité inouïe à confier ses cicatrices et ses doutes à quelqu'un d'autre — est totalement impossible sans un cadre de sécurité émotionnelle. Un couple qui n'établit pas cette paix inconditionnelle passera sa vie en « mode survie »." },
        { type: "p", text: "Le sanctuaire est ce lieu unique régi par une alliance de grâce : « Je connais tes failles, je vois tes limites, et je choisis de t'aimer et de te protéger quand même. » C'est la certitude que tes faiblesses ne seront jamais utilisées comme des armes contre toi. (Nous verrons dans les prochains piliers comment bâtir très concrètement cette sécurité à travers la communication et la gestion des conflits.)" },
      ],
    },
  ],
  caseStudy: {
    title: "Le cas de Sarah — gestion d'une vulnérabilité",
    context: "Sarah avoue : « J'ai fait un burn-out il y a deux ans et j'ai encore parfois peur de ne pas être à la hauteur. »",
    responses: [
      { label: "Sur la scène de théâtre", text: "L'autre survole le sujet et vante ses propres réussites pour paraître fort." },
      { label: "Sur le ring de boxe", text: "L'autre réutilise cela plus tard : « Tu réagis ainsi car tu es trop fragile. »" },
      { label: "Dans le sanctuaire", text: "L'autre accueille : « Merci pour ta confiance et ton authenticité. Tu n'as pas besoin de jouer un rôle parfait avec moi. »", right: true },
    ],
  },
  compass: {
    title: "La clé pour ton célibat aujourd'hui",
    blocks: [
      { type: "p", text: "Pendant ta période de rencontre sur Garden of Alliance, ne cherche pas seulement quelqu'un qui te donne des « papillons dans le ventre » ou qui coche des critères de réussite. Évalue tes échanges à l'aune de cette vision sacrée : « Est-ce que mon cœur se sent en paix avec cette personne ? Suis-je obligé(e) de jouer un rôle pour lui plaire, ou puis-je baisser ma garde ? » **La paix intérieure est souvent le signe précurseur d'un futur sanctuaire.**" },
    ],
  },
  quizIntro: "Réponds à ces questions pour valider ta compréhension du mariage comme sanctuaire.",
  quiz: [
    {
      question: "Quelle est la signification théologique du « foyer comme sanctuaire » ?",
      options: [
        "Un endroit où l'on s'isole totalement du monde extérieur et de la société.",
        "Un lieu qui reflète la nature de Dieu comme « refuge », où l'on peut baisser sa garde sans honte ni crainte.",
        "Un espace dédié uniquement à la prière silencieuse.",
      ],
      answer: 1,
      explanation: "Le mariage chrétien est appelé à être une démonstration terrestre de la sécurité et du repos offerts par Christ.",
    },
    {
      question: "Quel est le principal danger de transformer son couple en « scène de théâtre » ?",
      options: [
        "Cela coûte trop cher en énergie sociale.",
        "Le maintien d'un masque de perfection empêche l'intimité véritable et le vrai repos.",
        "Cela crée trop de conflits ouverts.",
      ],
      answer: 1,
      explanation: "Si on porte un masque par peur d'être rejeté pour ses failles, la relation reste superficielle et l'on ne se sent jamais véritablement en sécurité.",
    },
    {
      question: "Pourquoi la vulnérabilité exige-t-elle la « sécurité émotionnelle » ?",
      options: [
        "Parce que se montrer tel que l'on est demande d'avoir la garantie que nos failles ne seront pas utilisées contre nous.",
        "Parce qu'il faut être fort pour pleurer.",
        "Parce que la vulnérabilité est un signe de faiblesse qu'il faut cacher.",
      ],
      answer: 0,
      explanation: "Personne ne retire son armure s'il se sent menacé. La grâce et la non-condamnation sont les conditions préalables à toute intimité vraie.",
    },
    {
      question: "Dans l'analogie du « ring de boxe », que se passe-t-il lorsque l'un des conjoints cherche à « gagner » une dispute à tout prix ?",
      options: [
        "Le couple en ressort plus fort car la vérité éclate.",
        "Si l'un gagne en écrasant l'autre, c'est l'alliance tout entière (le couple) qui perd.",
        "Le gagnant gagne le droit de diriger le sanctuaire.",
      ],
      answer: 1,
      explanation: "Dans une alliance, il n'y a pas d'adversaire. Une victoire qui détruit le conjoint est une défaite pour le mariage.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Lors de tes dernières interactions avec de potentiels partenaires, as-tu cherché à éblouir l'autre par une performance (scène de théâtre), as-tu cherché à avoir le dessus dans vos débats (ring de boxe), ou as-tu instauré un climat d'authenticité et d'accueil ? Garde en tête que le sanctuaire de demain commence par l'authenticité de tes échanges d'aujourd'hui.",
  },
};

const lecon13: Lesson = {
  number: "1.3",
  slug: "1-3",
  title: "Le mariage comme réponse à un but",
  image: { ...img("1-3"), alt: "Deux alliances dorées posées sur la page d'un dictionnaire, à l'entrée « marriage »." },
  pdf: `${BASE}/pdf/lecon-1-3-le-mariage-comme-reponse-a-un-but.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "L'amour n'est pas une destination",
    blocks: [
      { type: "p", text: "L'une des plus grandes tragédies modernes est de considérer le mariage comme une ligne d'arrivée. On se bat pour trouver « la bonne personne », on organise la cérémonie, on échange les vœux, et ensuite… on s'assoit. On s'imagine que le but de l'amour, c'est l'amour lui-même." },
      { type: "p", text: "C'est une erreur fondamentale de vision. **Le mariage biblique n'est pas une destination, c'est un véhicule.** Si deux personnes montent dans une voiture sans savoir où elles vont, l'habitacle aura beau être confortable, elles finiront par tourner en rond, s'ennuyer, et inévitablement se disputer sur le choix de la musique ou la température de la climatisation." },
    ],
  },
  objective: "Découvrir pourquoi un mariage qui n'existe que pour lui-même finit par s'étouffer, et comment la vision d'une « destinée commune » transforme radicalement l'alliance en une force redoutable.",
  parts: [
    {
      heading: "Le mythe de l'amour en vase clos",
      blocks: [
        { type: "p", text: "La culture populaire nous dessine l'amour romantique comme deux personnes se regardant éternellement dans les yeux, coupées du reste du monde. Mais un couple qui se regarde continuellement le nombril finit par s'effondrer sous son propre poids." },
        { type: "p", text: "Le prophète Amos pose une question foudroyante de bon sens :" },
        { type: "verse", text: "Deux hommes marchent-ils ensemble, sans en avoir convenu ?", ref: "Amos 3.3" },
        { type: "p", text: "Le mariage divin ne consiste pas à se regarder l'un l'autre, mais à regarder ensemble dans la même direction. Dieu ne vous unit pas simplement pour résoudre votre solitude ou pour payer les factures à deux. Il unit deux vies pour répondre à un mandat, pour accomplir une mission que ni l'un ni l'autre n'aurait pu accomplir seul avec la même puissance." },
      ],
    },
    {
      heading: "L'arithmétique du Royaume (l'accélérateur de destinée)",
      blocks: [
        { type: "p", text: "Il existe dans les Écritures un principe spirituel fascinant concernant l'alliance :" },
        { type: "verse", text: "Comment un seul en poursuivrait-il mille, et deux en mettraient-ils dix mille en fuite ?", ref: "Deutéronome 32.30" },
        { type: "p", text: "Mathématiquement, si un chasse mille, deux devraient en chasser deux mille. Mais dans l'arithmétique du Royaume de Dieu, l'alliance produit une synergie exponentielle. L'union de deux personnes alignées sur un même but spirituel ne fait pas qu'additionner leurs forces : **elle les multiplie**. C'est l'effet accélérateur de la destinée." },
        { type: "p", text: "Un mariage béni et orienté vers un but te propulsera plus loin, plus haut et plus profondément dans ton appel spirituel, professionnel ou ministériel que tu ne l'aurais jamais imaginé en restant seul. Ton conjoint devient ton plus grand allié de destinée." },
      ],
    },
    {
      heading: "La séquence d'Éden et la force de l'Ezer Kenegdo",
      blocks: [
        { type: "p", text: "Regardons le tout premier mariage de l'humanité dans le livre de la Genèse. C'est un modèle parfait. Remarque bien la chronologie des événements :" },
        {
          type: "steps",
          items: [
            "Dieu crée l'homme et le place dans le jardin.",
            "Dieu lui donne un but et un travail : cultiver et garder le jardin (Genèse 2.15).",
            "Ensuite seulement, Dieu constate que l'homme ne peut pas accomplir ce mandat seul de manière optimale, et déclare : « Il n'est pas bon que l'homme soit seul ; je lui ferai une aide semblable à lui » (Genèse 2.18).",
          ],
        },
        { type: "p", text: "La première leçon est vertigineuse : **le but précède la relation**. Il est très difficile de savoir qui doit t'accompagner si tu n'as aucune idée de l'endroit où tu vas." },
        { type: "p", text: "Mais arrêtons-nous sur les mots utilisés par Dieu pour désigner cette « aide ». Dans le texte hébreu original, l'expression est *Ezer Kenegdo*. Historiquement, ce terme a souvent été mal compris ou réduit à l'image d'une simple assistante subordonnée. C'est une immense erreur théologique." },
        { type: "p", text: "Le mot *Ezer* signifie littéralement « secours vital » ou « force salvatrice ». C'est d'ailleurs ce même mot exact qui est utilisé dans les Psaumes pour décrire Dieu lorsqu'il vient secourir Israël au combat (Psaume 121.2 : « Mon secours [Ezer] vient de l'Éternel »). Quant au mot *Kenegdo*, il signifie « face à face », « à sa mesure », ou « sa force miroir »." },
        { type: "p", text: "Dans l'alliance sacrée, l'épouse n'est pas une figure passive ou secondaire : elle est décrite spirituellement comme une co-guerrière, une force miroir essentielle pour accomplir la destinée du foyer. **Le véritable conjoint divin ne vient jamais diminuer ou étouffer ta destinée — il l'amplifie.**" },
      ],
    },
  ],
  caseStudy: {
    title: "Le cas de David et Léa — orientation des projets",
    context: "David est passionné par l'action sociale ; Léa recherche principalement le confort et l'évasion.",
    responses: [
      { label: "L'amour en vase clos", text: "Ils discutent de loisirs sans aborder la vision de leur impact à cinq ans." },
      { label: "La démarche Ezer Kenegdo", text: "David demande : « Quelle cause te tient à cœur au point d'y investir ton énergie ? » S'ils réalisent que leurs appels s'annulent, le véhicule fera du surplace.", right: true },
    ],
  },
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Lorsque tu parcours les profils sur Garden of Alliance et que tu entames des discussions, ne te limite pas aux questions de surface (« Quels sont tes loisirs ? », « Quel est ton plat préféré ? »). **Cherche la direction de la voiture !** Demande : « Qu'est-ce qui te passionne ? Où vois-tu Dieu t'utiliser dans cinq ans ? » Cherche un partenaire dont l'appel résonne avec ton propre cœur. Cherche ton *Ezer Kenegdo* : ce copilote spirituel capable d'accélérer la vision que Dieu a placée en toi." },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer cette vision puissante de l'alliance.",
  quiz: [
    {
      question: "Selon cette leçon, quelle est l'erreur fondamentale de la culture romantique moderne ?",
      options: [
        "Considérer l'amour comme un point de départ difficile.",
        "Considérer le mariage comme une ligne d'arrivée et un but en soi (l'amour en vase clos).",
        "Donner trop d'importance à la spiritualité dans le couple.",
      ],
      answer: 1,
      explanation: "Le mariage n'est pas la destination finale, c'est le véhicule qui permet d'accomplir un but plus grand.",
    },
    {
      question: "Que signifie l'expression hébraïque « Ezer Kenegdo » utilisée dans la Genèse ?",
      options: [
        "Une assistante destinée à servir et obéir.",
        "Une force miroir, un secours vital et une co-guerrière de destinée.",
        "Une personne chargée uniquement des tâches du foyer.",
      ],
      answer: 1,
      explanation: "Le mot « Ezer » est utilisé pour décrire Dieu venant secourir son peuple au combat. C'est un terme de force extraordinaire, loin de toute notion d'infériorité.",
    },
    {
      question: "Dans le récit de la Genèse, que donne Dieu à l'homme avant de lui donner une épouse ?",
      options: [
        "Une maison et de l'argent.",
        "Des amis et une communauté.",
        "Une vision, un travail et un but (cultiver le jardin).",
      ],
      answer: 2,
      explanation: "La séquence biblique est claire : l'identité et le but précèdent l'alliance matrimoniale. L'Ezer Kenegdo est donnée pour accomplir la vision ensemble.",
    },
    {
      question: "Que risque un couple qui se marie sans direction ni but commun ?",
      options: [
        "De s'ennuyer et de s'étouffer sous le poids de la routine, car ils ne font que se regarder l'un l'autre.",
        "De devenir de meilleurs amis.",
        "De vivre de manière très paisible et sans conflits.",
      ],
      answer: 0,
      explanation: "Comme des passagers dans une voiture sans destination, l'absence de but commun génère de l'insatisfaction et des conflits de surface.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Prends un temps d'arrêt. Si tu devais décrire le « but » ou la direction générale de ta vie aujourd'hui (même si ce n'est pas encore parfait), quel serait-il ? Et surtout, as-tu la certitude intérieure d'être prêt(e) à agir comme une « force salvatrice » (Ezer) pour amplifier la destinée de l'autre, plutôt que de l'utiliser uniquement pour ton propre confort ?",
  },
};

const lecon14: Lesson = {
  number: "1.4",
  slug: "1-4",
  title: "Alignement théologique et spirituel",
  image: { ...img("1-4"), alt: "Des mariés main dans la main devant une église en briques surmontée d'une croix blanche, entourés de leur cortège.", position: "center 45%" },
  pdf: `${BASE}/pdf/lecon-1-4-alignement-theologique-et-spirituel.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "Le poids des mots",
    blocks: [
      { type: "p", text: "Nous utilisons souvent le mot « alliance » de manière très légère. Dans le langage courant, il désigne l'anneau que l'on porte au doigt ou un accord de convenance. Mais dans le vocabulaire divin, c'est l'un des mots les plus lourds, les plus sanglants et les plus magnifiques qui soient." },
      { type: "p", text: "La confusion majeure de notre époque est de traiter le mariage biblique (une **Alliance**) avec la mentalité d'une transaction humaine (un **Contrat**). Cette erreur de calibrage est responsable de l'effondrement de milliers de foyers, y compris chrétiens." },
    ],
  },
  objective: "Comprendre l'abîme théologique qui sépare un contrat d'une alliance, et réaliser pourquoi un alignement spirituel profond est la seule garantie pour que cette alliance tienne face aux tempêtes.",
  parts: [
    {
      heading: "Le gouffre conceptuel (contrat ou alliance)",
      blocks: [
        { type: "p", text: "Il est vital d'analyser la posture de notre cœur. Naviguons-nous dans le célibat avec une mentalité de contractant ou d'allié ?" },
        {
          type: "points",
          items: [
            { lead: "La logique du contrat.", text: "Un contrat est fondé sur la méfiance. Son but est de protéger mes droits et de limiter mes risques. La règle d'or est : « Je te donne 50 %, tu me donnes 50 %. Si tu ne remplis pas ta part, je retire la mienne et le contrat est annulé. » C'est une logique conditionnelle et consumériste." },
            { lead: "La logique de l'alliance.", text: "Une alliance biblique (*Berit* en hébreu) est fondée sur le don de soi. Son but n'est pas de protéger mes droits, mais de me donner entièrement à l'autre. La règle d'or est : « Je te donne 100 %, même les jours où tu ne peux donner que 10 %. » Donner 100 % ne signifie pas subir un abus, mais devenir un soutien inconditionnel, un bras qui porte et un encouragement qui aide l'autre à se relever et à redonner le meilleur de lui-même à son rythme. L'alliance est inconditionnelle. C'est l'amour *agapè* et la grâce agissante." },
          ],
        },
        { type: "p", text: "Celui qui aborde le mariage comme un contrat finira inévitablement déçu, car le conjoint humain faillira toujours à un moment donné. **Seule la structure de l'alliance permet d'absorber le choc de l'imperfection humaine.**" },
      ],
    },
    {
      heading: "Le sceau du sacrifice et de la croix",
      blocks: [
        { type: "p", text: "Dans l'Ancien Testament, on ne « concluait » pas une alliance ; littéralement, on la « coupait » (Genèse 15). Les contractants passaient entre des animaux sacrifiés, ce qui signifiait symboliquement : « Que je sois déchiré comme ces animaux si je romps mon engagement envers toi. » L'alliance est une question de vie ou de mort ; elle implique la mort à soi-même." },
        { type: "p", text: "Le Nouveau Testament sublime cette réalité. Christ a scellé la Nouvelle Alliance non pas avec le sang d'animaux, mais avec son propre sang. L'apôtre Paul fait un parallèle vertigineux :" },
        { type: "verse", text: "Maris, aimez vos femmes, comme Christ a aimé l'Église, et s'est livré lui-même pour elle.", ref: "Éphésiens 5.25" },
        { type: "p", text: "Le mariage est censé être un mini-Évangile. Il prêche au monde invisible et visible la fidélité sacrificielle de Dieu envers son peuple. Voilà pourquoi le divorce ou la trahison font si mal : ils déchirent un tissu qui était cousu avec le fil du divin." },
      ],
    },
    {
      heading: "Le danger mortel du « joug inégal »",
      blocks: [
        { type: "p", text: "Parce que l'alliance exige un tel niveau de don de soi et de sacrifice, Dieu nous donne un avertissement catégorique :" },
        { type: "verse", text: "Ne vous mettez pas avec les infidèles sous un joug étranger.", ref: "2 Corinthiens 6.14" },
        { type: "p", text: "Le « joug » est cette pièce de bois qui relie deux bœufs pour labourer un champ (ce qui nous ramène à la notion de « but » vue à la leçon précédente). Si l'un des bœufs veut aller à droite (vers le Royaume) et l'autre à gauche (vers les valeurs du monde), ou si l'un est beaucoup plus grand que l'autre, le joug va les étrangler et le champ ne sera jamais labouré." },
        { type: "p", text: "L'alignement théologique et spirituel n'est pas une question d'étiquette religieuse (aller dans la même dénomination). **C'est une question de Seigneurie.** Au cœur de la tempête, lorsque votre mariage sera ébranlé, vers quelle autorité ultime vous tournerez-vous ? Si l'un se soumet à la Parole de Dieu et l'autre à sa propre vérité émotionnelle ou sociétale, le socle se fissurera." },
      ],
    },
  ],
  caseStudy: {
    title: "Le cas de Samuel et Rachel — face à l'épreuve",
    context: "Samuel vit un chômage prolongé et un épuisement moral intense.",
    responses: [
      { label: "Logique du contrat", text: "Rachel se retire : « Tu ne remplis plus ta part financière et émotionnelle. »" },
      { label: "Logique de l'alliance", text: "Rachel soutient son conjoint : « L'alliance ne dépend pas de ta rentabilité. Aujourd'hui tu es affaibli, je porte la charge, nous prions et je t'aide à te relever. »", right: true },
    ],
  },
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Sur Garden of Alliance, « l'alignement spirituel » ne consiste pas à organiser un débat théologique dès le premier message. Il s'agit d'observer : cette personne craint-elle Dieu plus que l'opinion des hommes ? Sa vie démontre-t-elle le fruit de l'Esprit ? Sa définition de l'engagement ressemble-t-elle à un contrat ou à une alliance christocentrique ? **Choisir un conjoint non aligné spirituellement, c'est comme attacher sa barque à un navire qui coule.**" },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer ta compréhension de l'Alliance.",
  quiz: [
    {
      question: "Quelle est la différence fondamentale entre un contrat et une alliance biblique ?",
      options: [
        "Le contrat est oral, l'alliance est obligatoirement écrite.",
        "Le contrat protège mes droits et est conditionnel, l'alliance est inconditionnelle et implique le don total de soi.",
        "Il n'y a aucune différence, ce sont deux mots pour dire la même chose.",
      ],
      answer: 1,
      explanation: "Le contrat dit « je te protège si tu me satisfais », l'alliance dit « je t'aime même quand tu me déçois ».",
    },
    {
      question: "Quel mystère spirituel l'alliance du mariage est-elle censée refléter sur Terre ?",
      options: [
        "La perfection de la nature humaine.",
        "L'amour sacrificiel, fidèle et inconditionnel de Christ pour son Église.",
        "L'égalité stricte (50/50) entre les hommes et les femmes.",
      ],
      answer: 1,
      explanation: "C'est l'enseignement profond d'Éphésiens 5. Le mariage est une parabole vivante de l'Évangile.",
    },
    {
      question: "Que signifie bibliquement l'expression « couper une alliance » dans l'Ancien Testament ?",
      options: [
        "Partager un gâteau de mariage.",
        "Annuler un contrat qui ne fonctionne plus.",
        "Un engagement de sang signifiant la mort à soi-même et la fidélité au péril de sa propre vie.",
      ],
      answer: 2,
      explanation: "La gravité de ce symbole montre à quel point l'engagement du mariage est sacré aux yeux de Dieu.",
    },
    {
      question: "L'avertissement biblique contre le « joug inégal » (2 Corinthiens 6.14) nous enseigne que :",
      options: [
        "S'unir à une personne qui n'est pas soumise à la Seigneurie de Christ finira par étrangler la destinée du foyer.",
        "Il ne faut jamais se marier avec quelqu'un qui gagne moins d'argent que soi.",
        "Il faut absolument appartenir exactement à la même dénomination religieuse locale.",
      ],
      answer: 0,
      explanation: "Le joug inégal parle de l'autorité ultime. Si les deux conjoints ne se soumettent pas au même Maître, ils tireront dans des directions opposées.",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Lorsque tu as vécu des trahisons amoureuses dans le passé ou observé les échecs autour de toi, dirais-tu que ces relations étaient bâties sur une logique de contrat ou sur une logique d'alliance ? Aujourd'hui, comment peux-tu ajuster tes propres attentes pour chercher un(e) partenaire prêt(e) à entrer dans une alliance sacrificielle plutôt que dans un simple accord d'intérêts mutuels ?",
  },
};

const lecon15: Lesson = {
  number: "1.5",
  slug: "1-5",
  title: "Le renoncement et le service mutuel",
  image: { ...img("1-5"), alt: "Un homme et une femme dos à dos, bras croisés, le visage fermé : l'image du repli sur soi que la leçon invite à dépasser.", position: "center 30%" },
  pdf: `${BASE}/pdf/lecon-1-5-le-renoncement-et-le-service-mutuel.pdf`,
  readingMinutes: 10,
  intro: {
    heading: "La révolution contre-culturelle de l'amour",
    blocks: [
      { type: "p", text: "Le monde dans lequel nous cherchons l'amour est gouverné par une philosophie dominante : **l'épanouissement personnel**. Elle nous souffle en permanence que notre bonheur est la priorité absolue, que nous devons d'abord « nous aimer nous-mêmes », et que toute relation qui ne nous « apporte » plus doit être abandonnée." },
      { type: "p", text: "Cette philosophie n'est pas entièrement fausse — mais elle devient mortelle lorsqu'elle s'applique au mariage chrétien. Un amour centré sur ce que l'autre peut m'offrir est un amour de saison : il fleurit quand tout va bien, et se fane dès que le conjoint traverse une nuit sombre." },
      { type: "p", text: "La vision biblique du mariage pose une révolution radicalement contre-culturelle : le vrai épanouissement ne vient pas de ce que tu reçois, mais de ce que tu choisis de donner." },
    ],
  },
  objective: "Embrasser la beauté du renoncement et du service mutuel non comme une contrainte, mais comme le moteur le plus puissant d'une alliance qui dure.",
  parts: [
    {
      heading: "Le renoncement — la mort qui donne la vie",
      blocks: [
        { type: "p", text: "Le mot « renoncement » fait peur. Il évoque la privation, la perte de liberté, une vie étriquée dans l'ombre d'un autre. C'est précisément ce que la culture moderne nous a appris à craindre." },
        { type: "p", text: "Mais Jésus retourne cette logique avec une phrase d'une puissance dérangeante :" },
        { type: "verse", text: "Si quelqu'un veut venir après moi, qu'il renonce à lui-même, qu'il se charge de sa croix, et qu'il me suive. Car celui qui voudra sauver sa vie la perdra, mais celui qui la perdra à cause de moi la trouvera.", ref: "Matthieu 16.24-25" },
        { type: "p", text: "Ce paradoxe christique se déploie pleinement dans l'alliance conjugale. Renoncer à soi-même dans le mariage ne signifie pas s'effacer, s'annuler ou se soumettre aveuglément à l'abus. Cela signifie choisir, délibérément et chaque jour, de poser son ego à la porte du foyer. C'est mettre les besoins de l'autre sur la balance, même — et surtout — quand ce n'est pas pratique." },
        { type: "p", text: "Le renoncement dans l'alliance est l'acte paradoxal par lequel tu découvres une version de toi-même plus grande, plus généreuse et plus libre que tu n'aurais jamais pu l'imaginer en vivant uniquement pour toi." },
      ],
    },
    {
      heading: "La nuance cruciale — le sacrifice n'est pas un suicide",
      blocks: [
        { type: "p", text: "Il est essentiel de poser ici un garde-fou théologique et humain. Le renoncement dont parle le Christ n'est pas un appel à l'épuisement chronique ni à la disparition de soi. Il existe une contrefaçon dangereuse du don de soi : **le martyre émotionnel**. C'est cette posture de celui qui se vide jusqu'à l'os, se sacrifie jusqu'à la rupture, et finit par présenter sa propre destruction comme une preuve d'amour." },
        { type: "p", text: "Cette confusion blesse doublement : elle abîme celui qui donne jusqu'à l'épuisement, et elle place sur les épaules du conjoint une culpabilité écrasante — le poids de quelqu'un qui s'est immolé pour lui." },
        { type: "p", text: "L'amour agapè biblique ne s'achète pas. On ne mérite pas l'amour de l'autre en se détruisant pour lui. **Le service dans l'alliance jaillit toujours de l'abondance, jamais du vide.** Christ lui-même, qui nous donne l'exemple suprême du sacrifice, n'a pas cessé de se retirer pour prier, de se ressourcer dans la communion avec le Père. Son don de soi était nourri par une source inépuisable, non par une réserve que la fatigue aurait fini par tarir." },
        { type: "p", text: "Concrètement, cela signifie qu'un conjoint qui prend soin de sa santé spirituelle, émotionnelle et physique ne manque pas de générosité — il se garde en état de donner. Il maintient sa propre flamme allumée pour pouvoir réchauffer le foyer. Le renoncement sain est un choix fait depuis une place de liberté et de plénitude intérieure, jamais la rançon que l'on paie pour acheter l'amour ou éviter l'abandon." },
      ],
    },
    {
      heading: "Le service mutuel — le lavement des pieds comme modèle",
      blocks: [
        { type: "p", text: "La nuit où Jésus allait être trahi et conduit à la croix, la Bible nous dit qu'il se leva de table, ôta son vêtement, prit une serviette et se mit à laver les pieds de ses disciples (Jean 13.4-5). C'est l'acte le plus humble de la culture de l'époque, réservé aux serviteurs de rang inférieur. Et c'est le Roi de l'univers qui l'accomplit." },
        { type: "p", text: "Jésus conclut ce geste prophétique avec une déclaration fondatrice :" },
        { type: "verse", text: "Si donc moi, le Seigneur et le Maître, je vous ai lavé les pieds, vous devez aussi vous laver les pieds les uns aux autres.", ref: "Jean 13.14" },
        { type: "p", text: "Ce lavement des pieds est le modèle du mariage chrétien. Le service mutuel, c'est cette disposition intérieure qui dit : **« L'autre n'est pas là pour me servir — je suis là pour lui. »** Et puisque les deux conjoints partagent cette même posture, nul n'est jamais exploité. Au contraire, chacun se retrouve comblé par l'amour qu'il donne et qu'il reçoit en retour." },
      ],
    },
    {
      heading: "Le renoncement libère, le service amplifie",
      blocks: [
        { type: "p", text: "La contre-intuition profonde du mariage chrétien peut se formuler ainsi : c'est en cessant de te servir toi-même que tu te réalises pleinement. L'apôtre Paul le résume dans une formule d'une densité théologique saisissante :" },
        { type: "verse", text: "Ne faites rien par esprit de parti ou par vaine gloire, mais que l'humilité vous fasse regarder les autres comme étant au-dessus de vous-mêmes. Que chacun de vous, au lieu de considérer ses propres intérêts, considère aussi ceux des autres.", ref: "Philippiens 2.3-4" },
        { type: "p", text: "Dans la vie pratique d'un couple, cela se traduit par des actes quotidiens qui semblent anodins, mais qui constituent, brique par brique, la grandeur d'un foyer : préparer le repas quand l'autre est épuisé, renoncer à sa soirée préférée pour soutenir le projet de son conjoint, choisir de se taire et d'écouter plutôt que d'imposer sa propre analyse. Ces gestes invisibles sont les actes fondateurs de l'alliance." },
      ],
    },
  ],
  caseStudy: {
    title: "Le cas d'Inès — arbitrage du quotidien",
    context: "Inès a prévu un temps de repos seule. Son fiancé l'appelle, très stressé par une décision urgente.",
    responses: [
      { label: "L'égoïsme", text: "« C'est mon moment, gère tes soucis seul. »" },
      { label: "Le martyre émotionnel", text: "Inès s'annule, reste éveillée toute la nuit jusqu'à l'épuisement et accumule de l'amertume." },
      { label: "Le service sain", text: "Inès écoute et prie avec lui pendant 45 minutes, puis pose une limite sereine : « Je suis de tout cœur avec toi. Je vais me reposer pour être fraîche demain, mais mon cœur t'accompagne. »", right: true },
    ],
  },
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Lors de tes échanges sur Garden of Alliance, prête attention à la posture fondamentale de l'autre : est-ce quelqu'un qui parle *de lui* ou qui s'intéresse *à toi* ? Quelqu'un dont les questions vont vers l'autre, dont les propositions tiennent compte de ta réalité, dont l'attitude générale démontre une disposition naturelle au service, est un signal fort d'une maturité relationnelle réelle. **Le service n'attend pas le mariage pour se manifester — il se révèle dès les premiers mots échangés.**" },
    ],
  },
  quizIntro: "Réponds à ces questions pour ancrer la vision du renoncement et du service.",
  quiz: [
    {
      question: "Selon la leçon, pourquoi la philosophie culturelle de « l'épanouissement personnel » est-elle insuffisante comme fondement du mariage ?",
      options: [
        "Parce qu'elle ignore complètement les questions financières.",
        "Parce qu'elle crée un amour conditionnel centré sur la satisfaction personnelle, incapable de traverser les saisons difficiles.",
        "Parce qu'elle encourage trop d'indépendance entre les conjoints.",
      ],
      answer: 1,
      explanation: "Un amour qui n'existe que le temps où l'autre me « comble » est fragile comme du verre. La vision biblique est diamétralement opposée : c'est en donnant que l'on reçoit.",
    },
    {
      question: "Dans le contexte de l'alliance conjugale, quelle est la différence entre un renoncement sain et le martyre émotionnel ?",
      options: [
        "Le martyre émotionnel est une vertu chrétienne que l'on doit encourager.",
        "Il n'y a aucune différence : s'oublier totalement est toujours un acte d'amour.",
        "Le renoncement sain jaillit de l'abondance et de la liberté intérieure ; le martyre émotionnel naît du vide et cherche à acheter l'amour en se détruisant.",
      ],
      answer: 2,
      explanation: "Un conjoint épuisé et vidé ne peut plus aimer ni servir pleinement. Le service biblique se ressource dans la communion avec Dieu, comme Christ lui-même se retirait pour prier avant de donner.",
    },
    {
      question: "Quel geste du Christ lors de la Cène constitue le modèle du service mutuel dans le mariage ?",
      options: [
        "La multiplication des pains.",
        "Le lavement des pieds de ses disciples, accompli par le Roi lui-même.",
        "La transformation de l'eau en vin à Cana.",
      ],
      answer: 1,
      explanation: "Ce geste renverse toute hiérarchie d'orgueil. Dans l'alliance, aucun conjoint n'est au-dessus du service de l'autre.",
    },
    {
      question: "Quel paradoxe spirituel la vie de service dans l'alliance révèle-t-elle ?",
      options: [
        "En dominant l'autre, on s'épanouit davantage.",
        "En se servant soi-même en premier, on protège le couple.",
        "C'est en cessant de se servir soi-même que l'on se réalise pleinement, car l'autre adopte la même posture et comble en retour.",
      ],
      answer: 2,
      explanation: "C'est le paradoxe de la croix appliqué à l'intimité conjugale : celui qui perd sa vie la trouve (Matthieu 16.25).",
    },
  ],
  reflection: {
    title: "Réflexion personnelle",
    prompt: "Avec une honnêteté radicale, pose-toi cette question : dans ta recherche d'un conjoint aujourd'hui, quelle est ta posture dominante ? Cherches-tu avant tout quelqu'un qui te serve, te comprenne et comble tes attentes — ou es-tu prêt(e) à te demander, dès maintenant, comment tu pourrais être un(e) partenaire qui s'engage avec joie dans le service de l'autre ? La réponse à cette question en dit long sur ton niveau de préparation à l'alliance.",
  },
};

const lecon16: Lesson = {
  number: "1.6",
  slug: "1-6",
  title: "L'autel familial et la présence de Dieu",
  image: { ...img("1-6"), alt: "Silhouette d'une famille — un couple et deux enfants main dans la main — face au soleil couchant.", position: "center 60%" },
  pdf: `${BASE}/pdf/lecon-1-6-l-autel-familial-et-la-presence-de-dieu.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "Le foyer, micro-église ou simple cohabitation ?",
    blocks: [
      { type: "p", text: "Nous arrivons à l'ultime leçon de ce premier pilier, et il nous faut aborder la question qui couronne tout ce que nous avons bâti ensemble : **qui règne au centre de ton foyer ?**" },
      { type: "p", text: "On peut avoir une vision claire du mariage (leçon 1.1), se projeter comme un sanctuaire (leçon 1.2), partager une destinée commune (leçon 1.3), comprendre la profondeur de l'alliance (leçon 1.4) et embrasser le service mutuel (leçon 1.5) — et malgré tout cela, bâtir un foyer qui ressemble à une belle association humaine plutôt qu'à une demeure que Dieu habite." },
      { type: "p", text: "La différence entre ces deux réalités n'est pas anecdotique. Elle est absolument décisive." },
    ],
  },
  objective: "Comprendre pourquoi la présence de Dieu n'est pas un supplément d'âme optionnel dans un mariage chrétien, mais le socle sans lequel tout le reste repose sur du sable.",
  parts: [
    {
      heading: "La demeure de Dieu au cœur de l'Histoire",
      blocks: [
        { type: "p", text: "Depuis l'aube de l'Écriture, Dieu manifeste une aspiration constante et ardente : **habiter au milieu de son peuple**. Il ne se contente pas de le guider de loin — il veut dresser sa tente parmi les siens." },
        { type: "p", text: "Le Tabernacle d'abord, le Temple de Salomon ensuite, puis l'Incarnation de Christ — « la Parole a été faite chair, et elle a habité parmi nous » (Jean 1.14) — et enfin, le corps du croyant devenu temple du Saint-Esprit (1 Corinthiens 6.19) : toute l'histoire biblique est celle d'un Dieu qui se rapproche, qui descend, qui choisit d'habiter là où son peuple vit." },
        { type: "p", text: "Le foyer conjugal chrétien s'inscrit dans cette même ligne prophétique et théologique. Il est la version la plus intime de ce « temple » sur terre : **le lieu où Dieu choisit de manifester sa gloire à travers l'alliance de deux êtres qui lui appartiennent**. L'autel familial n'est pas un rituel de façade — c'est l'acte de souveraineté par lequel un couple déclare : « Dans cette maison, c'est Christ qui règne. »" },
      ],
    },
    {
      heading: "Le foyer sans Dieu — la maison vide",
      blocks: [
        { type: "p", text: "Jésus, dans Matthieu 12.44, décrit une maison balayée, mise en ordre, mais vide. Et c'est précisément parce qu'elle est vide qu'elle devient vulnérable à toutes les forces qui cherchent à l'habiter à la place de son Maître légitime." },
        { type: "p", text: "Un foyer sans la présence de Dieu au centre peut être beau, organisé, stable financièrement et admiré de l'extérieur. Mais dans les tempêtes que tout couple traverse inévitablement — la crise, le deuil, la trahison, la stérilité, le chômage, la maladie — il n'existe aucune ancre humaine qui tienne. Deux êtres seuls face à l'adversité, aussi forts soient-ils, se retrouvent à puiser dans des réserves qui s'épuisent." },
        { type: "p", text: "C'est là que la promesse de Matthieu 18.20 prend toute sa dimension conjugale :" },
        { type: "verse", text: "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.", ref: "Matthieu 18.20" },
        { type: "p", text: "Ce verset n'est pas uniquement ecclésiastique. Il est marital. Deux personnes réunies *en son nom* bénéficient d'une présence tierce, invisible mais réelle, plus forte que n'importe quelle difficulté extérieure." },
      ],
    },
    {
      heading: "Le cordon à trois fils — la vision de l'Ecclésiaste",
      blocks: [
        { type: "p", text: "Salomon, l'homme le plus sage de l'Ancien Testament, exprime cette réalité avec une image d'une densité remarquable :" },
        { type: "verse", text: "Un triple cordon ne se rompt pas facilement.", ref: "Ecclésiaste 4.12" },
        { type: "p", text: "Dans la vision sacrée du mariage chrétien, le couple n'est jamais un duo — c'est un trio. Les deux conjoints forment deux fils de ce cordon. Mais c'est le troisième fil — **la présence de Dieu** — qui transforme une corde ordinaire en un câble indestructible. Chacun des deux premiers fils peut fléchir à tour de rôle, traverser ses propres nuits et ses propres défauts, car le troisième fil tient l'ensemble." },
        { type: "p", text: "Cette vision change tout dans la manière dont on aborde la vie commune. Les saisons de froideur, les incompréhensions profondes, les impasses humaines ne signifient plus la fin de l'alliance, car il existe une troisième ressource, inépuisable et toujours disponible, à laquelle les deux conjoints peuvent accéder ensemble ou séparément : la grâce de Dieu." },
      ],
    },
  ],
  caseStudy: {
    title: "Le cas de Thomas et Julie — résolution de conflit",
    context: "Un désaccord financier tendu éclate au sujet de l'épargne.",
    responses: [
      { label: "Foyer sans autel", text: "Chacun s'enferme dans son orgueil et laisse l'amertume s'installer." },
      { label: "Foyer avec l'autel", text: "Thomas ou Julie prend l'initiative : « Nous sommes agacés, mais ne laissons pas l'ennemi nous diviser. Asseyons-nous et prions ensemble pour demander la sagesse de Dieu. » La présence divine adoucit les cœurs.", right: true },
    ],
  },
  compass: {
    title: "La boussole pour ton célibat",
    blocks: [
      { type: "p", text: "Sur Garden of Alliance, la question de l'autel familial se pose bien avant le mariage. Elle se pose aujourd'hui, dans ton célibat. Demande-toi honnêtement : est-ce que je cherche un partenaire de vie, ou est-ce que je cherche un partenaire *de foi* ? Ces deux profils ne sont pas identiques. Un partenaire de foi, c'est quelqu'un avec qui tu peux prier, confesser tes vulnérabilités devant Dieu, et inviter activement sa présence dans les décisions de votre vie commune. **Le foyer que tu bâtiras ressemblera à la vie spirituelle que tu construis aujourd'hui.**" },
    ],
  },
  quizIntro: "Ces questions clôturent l'ensemble du pilier 1. Elles sont l'occasion d'ancrer la vision sacrée du mariage dans toute sa cohérence.",
  quiz: [
    {
      question: "Selon l'histoire biblique, quelle aspiration constante Dieu manifeste-t-il envers son peuple ?",
      options: [
        "Le guider à distance avec des lois et des commandements.",
        "Habiter au milieu de son peuple, dans une proximité toujours croissante.",
        "Tester la foi de son peuple par des épreuves successives.",
      ],
      answer: 1,
      explanation: "Du Tabernacle à l'Incarnation en passant par l'Esprit habitant le croyant, Dieu est le Dieu de l'Emmanuel — « Dieu avec nous ». Le foyer chrétien est le prolongement le plus intime de cette réalité.",
    },
    {
      question: "Pourquoi la présence de Dieu au centre du foyer est-elle une nécessité et non un simple luxe spirituel ?",
      options: [
        "Parce que les voisins chrétiens l'attendent du couple.",
        "Parce qu'un foyer sans cette présence est structurellement vulnérable face aux tempêtes de la vie que deux êtres humains seuls ne peuvent absorber indéfiniment.",
        "Parce que cela améliore la communication entre conjoints.",
      ],
      answer: 1,
      explanation: "Les ressources humaines s'épuisent. La présence de Dieu est la seule réserve véritablement inépuisable dans un foyer en crise.",
    },
    {
      question: "Que symbolise le « triple cordon » de l'Ecclésiaste 4.12 appliqué au mariage chrétien ?",
      options: [
        "Les trois enfants idéaux que le couple devrait avoir.",
        "Les trois piliers financiers d'un foyer stable.",
        "L'union indéfectible de deux conjoints et de Dieu lui-même, formant une alliance impossible à rompre facilement.",
      ],
      answer: 2,
      explanation: "Ce n'est pas un duo mais un trio. Lorsque l'un des deux conjoints traverse une nuit, le troisième fil — Dieu — tient la corde et empêche la rupture.",
    },
    {
      question: "Quelle est la différence entre un foyer « propre et ordonné » et un foyer que Dieu habite réellement ?",
      options: [
        "La richesse matérielle et le style de vie.",
        "Le nombre de réunions d'église que le couple fréquente chaque semaine.",
        "La présence active et souveraine de Dieu au centre, qui transforme une belle association humaine en un sanctuaire vivant.",
      ],
      answer: 2,
      explanation: "La maison vide de Matthieu 12 est un avertissement puissant. L'ordre extérieur ne protège pas sans la présence intérieure du Maître.",
    },
  ],
  reflection: {
    title: "Réflexion de clôture du pilier 1",
    prompt: "Au terme de ces six leçons, pose-toi cette question fondatrice : si tu imaginais ton futur foyer comme un édifice, sur quels piliers reposerait-il réellement aujourd'hui ? La vision de l'alliance (1.1), la culture du sanctuaire (1.2), la clarté d'un but commun (1.3), la profondeur de l'engagement (1.4), le service mutuel sans martyre émotionnel (1.5) et la présence de Dieu au cœur (1.6) — lesquels de ces piliers sont déjà solides en toi, et lesquels nécessitent encore d'être travaillés avant même d'accueillir un(e) conjoint(e) ?",
  },
};

/* ───────────────────────────── Formation ───────────────────────────── */

const pillar1: Pillar = {
  number: 1,
  slug: "vision-sacree",
  title: "La vision sacrée du mariage",
  summary: "Déposer nos illusions pour embrasser la vision que Dieu a de l'alliance : un sanctuaire, un but commun, un engagement sans retour, un service mutuel et la présence de Dieu au centre.",
  lessons: [lecon11, lecon12, lecon13, lecon14, lecon15, lecon16],
};

// Les piliers 2 à 6 sont en cours de rédaction : ils s'affichent « en préparation ».
const upcoming = (n: number): Pillar => ({ number: n, slug: `pilier-${n}`, title: `Pilier ${n}`, lessons: [] });

export const BATIR_SUR_LE_ROC: Formation = {
  slug: "batir-sur-le-roc",
  title: "Bâtir sur le roc",
  tagline: "La formation de préparation au mariage de Garden of Alliance, en six piliers.",
  verse: {
    text: "C'est pourquoi, quiconque entend ces paroles que je dis et les met en pratique, sera semblable à un homme prudent qui a bâti sa maison sur le roc.",
    ref: "Matthieu 7.24",
  },
  pillars: [pillar1, upcoming(2), upcoming(3), upcoming(4), upcoming(5), upcoming(6)],
};

export const FORMATION_BASE_PATH = "/dashboard/academie/batir-sur-le-roc";

export const ALL_LESSONS = BATIR_SUR_LE_ROC.pillars.flatMap((p) => p.lessons.map((l) => ({ lesson: l, pillar: p })));

export function findLesson(slug: string) {
  const i = ALL_LESSONS.findIndex((x) => x.lesson.slug === slug);
  if (i === -1) return null;
  return { ...ALL_LESSONS[i], previous: ALL_LESSONS[i - 1]?.lesson ?? null, next: ALL_LESSONS[i + 1]?.lesson ?? null };
}
