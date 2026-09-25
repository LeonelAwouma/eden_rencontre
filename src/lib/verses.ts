// ── Parole du jour (tableau de bord) ─────────────────────────────
// Versets bilingues, choisis pour des célibataires chrétiens qui se préparent
// au mariage. Français : Louis Segond 1910 ; anglais : d'après la World English
// Bible (« the LORD » et « church », formes usuelles) — deux traductions du
// domaine public. Un « … » signale un passage abrégé. Les versets « hommes » et « femmes »
// s'adressent au lecteur selon le genre de son profil ; les autres à tous.

export interface Verse {
  fr: { text: string; ref: string };
  en: { text: string; ref: string };
}

const v = (frRef: string, frText: string, enRef: string, enText: string): Verse => ({
  fr: { text: frText, ref: frRef },
  en: { text: enText, ref: enRef },
});

/* ─────────────────────────── Pour tous ─────────────────────────── */

export const NEUTRAL_VERSES: Verse[] = [
  v("Hébreux 13.4", "Que le mariage soit honoré de tous, et le lit conjugal exempt de souillure.",
    "Hebrews 13:4", "Let marriage be held in honour among all, and let the bed be undefiled."),
  v("1 Corinthiens 13.4", "La charité est patiente, elle est pleine de bonté.",
    "1 Corinthians 13:4", "Love is patient and is kind."),
  v("1 Corinthiens 13.8", "La charité ne périt jamais.",
    "1 Corinthians 13:8", "Love never fails."),
  v("Matthieu 19.6", "Que l'homme donc ne sépare pas ce que Dieu a joint.",
    "Matthew 19:6", "What therefore God has joined together, don't let man tear apart."),
  v("Genèse 2.18", "Il n'est pas bon que l'homme soit seul ; je lui ferai une aide semblable à lui.",
    "Genesis 2:18", "It is not good for the man to be alone. I will make him a helper comparable to him."),
  v("Genèse 2.24", "C'est pourquoi l'homme quittera son père et sa mère, et s'attachera à sa femme, et ils deviendront une seule chair.",
    "Genesis 2:24", "Therefore a man will leave his father and his mother, and will join with his wife, and they will be one flesh."),
  v("Ecclésiaste 4.9", "Deux valent mieux qu'un, parce qu'ils retirent un bon salaire de leur travail.",
    "Ecclesiastes 4:9", "Two are better than one, because they have a good reward for their labour."),
  v("Ecclésiaste 4.12", "La corde à trois fils ne se rompt pas facilement.",
    "Ecclesiastes 4:12", "A threefold cord is not quickly broken."),
  v("Colossiens 3.14", "Mais par-dessus toutes ces choses revêtez-vous de la charité, qui est le lien de la perfection.",
    "Colossians 3:14", "Above all these things, walk in love, which is the bond of perfection."),
  v("Colossiens 3.13", "Supportez-vous les uns les autres, et, si l'un a sujet de se plaindre de l'autre, pardonnez-vous réciproquement.",
    "Colossians 3:13", "Bearing with one another, and forgiving each other, if any man has a complaint against any."),
  v("Éphésiens 4.2", "En toute humilité et douceur, avec patience, vous supportant les uns les autres avec charité.",
    "Ephesians 4:2", "With all lowliness and humility, with patience, bearing with one another in love."),
  v("Éphésiens 5.21", "Soumettez-vous les uns aux autres dans la crainte de Christ.",
    "Ephesians 5:21", "Subject yourselves to one another in the fear of Christ."),
  v("Éphésiens 5.33", "Que chacun de vous aime sa femme comme lui-même, et que la femme respecte son mari.",
    "Ephesians 5:33", "Let each of you love his own wife even as himself; and let the wife see that she respects her husband."),
  v("1 Pierre 4.8", "Avant tout, ayez les uns pour les autres une ardente charité, car la charité couvre une multitude de péchés.",
    "1 Peter 4:8", "Above all things be earnest in your love among yourselves, for love covers a multitude of sins."),
  v("1 Corinthiens 16.14", "Que tout ce que vous faites se fasse avec charité !",
    "1 Corinthians 16:14", "Let all that you do be done in love."),
  v("1 Jean 4.18", "La crainte n'est pas dans l'amour, mais l'amour parfait bannit la crainte.",
    "1 John 4:18", "There is no fear in love; but perfect love casts out fear."),
  v("1 Jean 4.19", "Pour nous, nous l'aimons, parce qu'il nous a aimés le premier.",
    "1 John 4:19", "We love him, because he first loved us."),
  v("Cantique des cantiques 8.7", "Les grandes eaux ne peuvent éteindre l'amour, et les fleuves ne le submergeraient pas.",
    "Song of Songs 8:7", "Many waters can't quench love, neither can floods drown it."),
  v("Ruth 1.16", "Où tu iras j'irai, où tu demeureras je demeurerai ; ton peuple sera mon peuple, et ton Dieu sera mon Dieu.",
    "Ruth 1:16", "Where you go, I will go; and where you stay, I will stay. Your people are my people, and your God is my God."),
  v("Psaume 127.1", "Si l'Éternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain.",
    "Psalm 127:1", "Unless the LORD builds the house, they labour in vain who build it."),
  v("Proverbes 3.5", "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse.",
    "Proverbs 3:5", "Trust in the LORD with all your heart, and don't lean on your own understanding."),
  v("Proverbes 16.3", "Recommande à l'Éternel tes œuvres, et tes projets réussiront.",
    "Proverbs 16:3", "Commit your deeds to the LORD, and your plans shall succeed."),
  v("Psaume 37.4", "Fais de l'Éternel tes délices, et il te donnera ce que ton cœur désire.",
    "Psalm 37:4", "Also delight yourself in the LORD, and he will give you the desires of your heart."),
  v("Psaume 37.5", "Recommande ton sort à l'Éternel, mets en lui ta confiance, et il agira.",
    "Psalm 37:5", "Commit your way to the LORD. Trust also in him, and he will do this."),
  v("Jérémie 29.11", "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.",
    "Jeremiah 29:11", "For I know the thoughts that I think towards you, says the LORD, thoughts of peace, and not of evil, to give you hope and a future."),
  v("Romains 8.28", "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu.",
    "Romans 8:28", "We know that all things work together for good for those who love God."),
  v("Philippiens 4.6", "Ne vous inquiétez de rien ; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces.",
    "Philippians 4:6", "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."),
  v("Lamentations 3.22-23", "Les bontés de l'Éternel ne sont pas épuisées, ses compassions ne sont pas à leur terme ; elles se renouvellent chaque matin.",
    "Lamentations 3:22-23", "It is because of the LORD's loving kindnesses that we are not consumed, because his mercies don't fail. They are new every morning."),
];

/* ─────────────────────────── Pour les hommes ─────────────────────────── */

export const MALE_VERSES: Verse[] = [
  v("Proverbes 18.22", "Celui qui trouve une femme trouve le bonheur ; c'est une grâce qu'il obtient de l'Éternel.",
    "Proverbs 18:22", "Whoever finds a wife finds a good thing, and obtains favour of the LORD."),
  v("Proverbes 19.14", "On peut hériter de ses pères une maison et des richesses, mais une femme intelligente est un don de l'Éternel.",
    "Proverbs 19:14", "House and riches are an inheritance from fathers, but a prudent wife is from the LORD."),
  v("Proverbes 31.10", "Qui peut trouver une femme vertueuse ? Elle a bien plus de valeur que les perles.",
    "Proverbs 31:10", "Who can find a worthy woman? For her price is far above rubies."),
  v("Éphésiens 5.25", "Maris, aimez vos femmes, comme Christ a aimé l'Église, et s'est livré lui-même pour elle.",
    "Ephesians 5:25", "Husbands, love your wives, even as Christ also loved the church, and gave himself up for it."),
  v("Éphésiens 5.28", "C'est ainsi que les maris doivent aimer leurs femmes comme leurs propres corps. Celui qui aime sa femme s'aime lui-même.",
    "Ephesians 5:28", "Even so husbands also ought to love their own wives as their own bodies. He who loves his own wife loves himself."),
  v("Colossiens 3.19", "Maris, aimez vos femmes, et ne vous aigrissez pas contre elles.",
    "Colossians 3:19", "Husbands, love your wives, and don't be bitter against them."),
  v("1 Pierre 3.7", "Maris, montrez à votre tour de la sagesse dans vos rapports avec vos femmes… honorez-les, comme devant aussi hériter avec vous de la grâce de la vie.",
    "1 Peter 3:7", "You husbands, in the same way, live with your wives according to knowledge… giving honour to the woman, as being also joint heirs of the grace of life."),
  v("Proverbes 5.18", "Fais ta joie de la femme de ta jeunesse.",
    "Proverbs 5:18", "Rejoice in the wife of your youth."),
  v("Psaume 128.3", "Ta femme est comme une vigne féconde dans l'intérieur de ta maison.",
    "Psalm 128:3", "Your wife will be as a fruitful vine in the innermost parts of your house."),
  v("Josué 24.15", "Moi et ma maison, nous servirons l'Éternel.",
    "Joshua 24:15", "As for me and my house, we will serve the LORD."),
  v("Josué 1.9", "Fortifie-toi et prends courage… car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.",
    "Joshua 1:9", "Be strong and courageous… for the LORD your God is with you wherever you go."),
  v("1 Corinthiens 16.13", "Veillez, demeurez fermes dans la foi, soyez des hommes, fortifiez-vous.",
    "1 Corinthians 16:13", "Watch! Stand firm in the faith! Be courageous! Be strong!"),
  v("Michée 6.8", "On t'a fait connaître, ô homme, ce qui est bien ; et ce que l'Éternel demande de toi, c'est que tu pratiques la justice, que tu aimes la miséricorde, et que tu marches humblement avec ton Dieu.",
    "Micah 6:8", "He has shown you, O man, what is good. What does the LORD require of you, but to act justly, to love mercy, and to walk humbly with your God?"),
  v("Psaume 112.1", "Heureux l'homme qui craint l'Éternel, qui trouve un grand plaisir à ses commandements.",
    "Psalm 112:1", "Blessed is the man who fears the LORD, who delights greatly in his commandments."),
  v("Proverbes 20.7", "Le juste marche dans son intégrité ; heureux ses enfants après lui !",
    "Proverbs 20:7", "A righteous man walks in integrity. Blessed are his children after him."),
  v("1 Timothée 4.12", "Sois un modèle pour les fidèles, en parole, en conduite, en charité, en foi, en pureté.",
    "1 Timothy 4:12", "Be an example to those who believe, in word, in your way of life, in love, in faith, and in purity."),
];

/* ─────────────────────────── Pour les femmes ─────────────────────────── */

export const FEMALE_VERSES: Verse[] = [
  v("Proverbes 31.25", "Elle est revêtue de force et de gloire, et elle se rit de l'avenir.",
    "Proverbs 31:25", "Strength and dignity are her clothing. She laughs at the time to come."),
  v("Proverbes 31.26", "Elle ouvre la bouche avec sagesse, et des instructions aimables sont sur sa langue.",
    "Proverbs 31:26", "She opens her mouth with wisdom. Kind instruction is on her tongue."),
  v("Proverbes 31.30", "La grâce est trompeuse, et la beauté est vaine ; la femme qui craint l'Éternel est celle qui sera louée.",
    "Proverbs 31:30", "Charm is deceitful, and beauty is vain; but a woman who fears the LORD, she shall be praised."),
  v("Proverbes 31.29", "Plusieurs filles ont une conduite vertueuse ; mais toi, tu les surpasses toutes.",
    "Proverbs 31:29", "Many women do noble things, but you excel them all."),
  v("Proverbes 31.11", "Le cœur de son mari a confiance en elle.",
    "Proverbs 31:11", "The heart of her husband trusts in her."),
  v("Proverbes 14.1", "La femme sage bâtit sa maison, et la femme insensée la renverse de ses propres mains.",
    "Proverbs 14:1", "Every wise woman builds her house, but the foolish one tears it down with her own hands."),
  v("1 Pierre 3.4", "Mais la parure intérieure et cachée dans le cœur, la pureté incorruptible d'un esprit doux et paisible, qui est d'un grand prix devant Dieu.",
    "1 Peter 3:4", "But in the hidden person of the heart, in the incorruptible adornment of a gentle and quiet spirit, which is very precious in God's sight."),
  v("Ruth 3.11", "Toute la porte de mon peuple sait que tu es une femme vertueuse.",
    "Ruth 3:11", "All the city of my people knows that you are a worthy woman."),
  v("Luc 1.45", "Heureuse celle qui a cru, parce que les choses qui lui ont été dites de la part du Seigneur auront leur accomplissement.",
    "Luke 1:45", "Blessed is she who believed, for there will be a fulfilment of the things which have been spoken to her from the Lord!"),
  v("Luc 1.38", "Voici la servante du Seigneur ; qu'il me soit fait selon ta parole.",
    "Luke 1:38", "Behold, the servant of the Lord; let it be done to me according to your word."),
  v("Ésaïe 54.5", "Car ton créateur est ton époux : l'Éternel des armées est son nom.",
    "Isaiah 54:5", "For your Maker is your husband; the LORD of Armies is his name."),
  v("Esther 4.14", "Et qui sait si ce n'est pas pour un temps comme celui-ci que tu es parvenue à la royauté ?",
    "Esther 4:14", "Who knows if you haven't come to the kingdom for such a time as this?"),
  v("Cantique des cantiques 4.7", "Tu es toute belle, mon amie, et il n'y a point en toi de défaut.",
    "Song of Songs 4:7", "You are all beautiful, my love. There is no spot in you."),
  v("Psaume 28.7", "L'Éternel est ma force et mon bouclier ; en lui mon cœur se confie.",
    "Psalm 28:7", "The LORD is my strength and my shield. My heart has trusted in him."),
  v("Psaume 139.14", "Je te loue de ce que je suis une créature si merveilleuse.",
    "Psalm 139:14", "I will give thanks to you, for I am fearfully and wonderfully made."),
  v("Genèse 2.22", "L'Éternel Dieu forma une femme de la côte qu'il avait prise de l'homme, et il l'amena vers l'homme.",
    "Genesis 2:22", "The LORD God made a woman from the rib which he had taken from the man, and brought her to the man."),
];

export type GenderKey = "male" | "female" | null;

/** Valeurs de profiles.gender : « homme » / « femme » (inscription), anciens « male » / « M »… */
export function genderKey(gender?: string | null): GenderKey {
  const g = (gender || "").trim().toLowerCase();
  if (g === "homme" || g === "male" || g === "m") return "male";
  if (g === "femme" || g === "female" || g === "f") return "female";
  return null;
}

const LAST_KEY = "eden-last-verse";

/**
 * Nouveau verset à chaque affichage du tableau de bord (rafraîchissement,
 * nouvelle session). Une fois sur deux, verset adressé au genre du profil ;
 * sinon, verset pour tous. Jamais deux fois de suite le même : le dernier
 * affiché est mémorisé dans le navigateur. À appeler côté client uniquement
 * (tirage aléatoire : le faire pendant le rendu serveur casserait l'hydratation).
 */
export function pickVerse(gender?: string | null): Verse {
  const key = genderKey(gender);
  const gendered = key === "male" ? MALE_VERSES : key === "female" ? FEMALE_VERSES : null;
  const pool = gendered && Math.random() < 0.5 ? gendered : NEUTRAL_VERSES;
  let last: string | null = null;
  try { last = localStorage.getItem(LAST_KEY); } catch { /* stockage indisponible */ }
  const candidates = pool.filter((x) => x.fr.ref !== last);
  const verse = candidates[Math.floor(Math.random() * candidates.length)];
  try { localStorage.setItem(LAST_KEY, verse.fr.ref); } catch { /* idem */ }
  return verse;
}
