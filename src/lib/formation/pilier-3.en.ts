// Pillar 3 of "Build on the Rock" — English version of pilier-3.ts.
//
// PARITY RULE: mirror pilier-3.ts exactly — same lessons, slugs and numbers,
// same block types in the same order, same quiz options and `answer` indices.
// Progress is stored by slug and index and is shared between both languages.
//
// Scripture: World English Bible (public domain), with "the LORD".
import type { Lesson, Pillar, Poster } from "./types";

const BASE = "/formation/batir-sur-le-roc";
const card = (n: string) => `${BASE}/images/${n}-carte.webp`;
const portrait = (n: string, alt: string): Poster => ({ src: `${BASE}/images/${n}.webp`, width: 1055, height: 1491, alt });

const PILLAR_3_POSTER: Poster = {
  src: `${BASE}/images/pilier-3.webp`,
  width: 1122,
  height: 1402,
  alt: "Poster (in French) “Maturity review & multidimensional preparation”: a couple fill in a maturity checklist together, surrounded by seven dimensions — emotional, spiritual, financial, social and professional maturity, physical preparation, emotional flexibility and the vision for the home.",
};

const POSTERS = {
  "3-1": portrait("lecon-3-1", "Poster (in French) for lesson 3.1, “Spiritual maturity: independent faith and spiritual leadership”: a man holds his Bible beside a woman in prayer, between the myth of second-hand spirituality and spiritual leadership according to Christ, with the mirror check of the spiritual child and the mature disciple."),
  "3-2": portrait("lecon-3-2", "Poster (in French) for lesson 3.2, “Emotional maturity: self-control, managing stress and anger”: facing the impulsive person, a calm couple illustrates true self-mastery, the mirror check and the golden rule of the 20-minute time-out."),
  "3-3": portrait("lecon-3-3", "Poster (in French) for lesson 3.3, “Financial maturity”: a couple do their accounts together, facing the illusion of “God will provide” without management, with the four pillars of financial health, the mirror check and the 70 / 20 / 10 budget rule."),
  "3-4": portrait("lecon-3-4", "Poster (in French) for lesson 3.4, “Social and professional maturity: balancing career, ministry and family life”: facing the trap of the overloaded diary, a couple organise their time around the Kingdom's priorities, with the three common traps and the priorities matrix."),
  "3-5": portrait("lecon-3-5", "Poster (in French) for lesson 3.5, “Physical preparation and lifestyle in the couple”: facing the neglected sanctuary, a couple care for the body as a sanctuary to honour, with the mirror check and the lifestyle review."),
  "3-6": portrait("lecon-3-6", "Poster (in French) for lesson 3.6, “The 5 love languages and managing emotional reservoirs”: around a heart-shaped reservoir, five couple scenes illustrate words of affirmation, quality time, gifts, acts of service and physical touch."),
  "3-7": portrait("lecon-3-7", "Poster (in French) for lesson 3.7, “Overall self-assessment: am I ready to take on the responsibility of marriage?”: a thoughtful couple in front of the covenant readiness checklist and its six dimensions, between the at-risk profile and the mature profile, with the readiness score out of 30."),
} satisfies Record<string, Poster>;

const lessonImage = (slug: keyof typeof POSTERS) => ({ src: POSTERS[slug].src, card: card(`lecon-${slug}`), alt: POSTERS[slug].alt });

/* ───────────────────────────── Lesson 3.1 ───────────────────────────── */

const lesson31: Lesson = {
  number: "3.1",
  slug: "3-1",
  title: "Spiritual maturity: independent faith and spiritual leadership",
  image: lessonImage("3-1"),
  poster: POSTERS["3-1"],
  pdf: `${BASE}/pdf/lecon-3-1-la-maturite-spirituelle.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "The religious crutch and the ruined altar",
    blocks: [
      { type: "p", text: "Imagine a man about to run a marathon who has never learned to walk without crutches. As soon as the slope rises and outside support moves away, he collapses. That is exactly the tragic sight many Christian singles offer when they enter marriage with what we must call a **borrowed faith**." },
      { type: "p", text: "In our churches it is easy to confuse the enthusiasm of a youth group or the fervour of a Sunday service with real spiritual maturity. But marriage is not a two-hour Sunday service: it is a daily face-to-face in which the dust of everyday life, tiredness and trials lay bare the substance of our personal spiritual life. In the intimacy of the home, you will not be able to feed your household with your parents' faith, your pastor's anointing or your friends' prayers." },
    ],
  },
  objective: "To discover why a dependent spirituality condemns a couple to fragility, and to learn to build an unshakeable independent faith and a spiritual leadership modelled on Christ.",
  parts: [
    {
      heading: "The myth of second-hand spirituality",
      blocks: [
        { type: "p", text: "The apostle Paul sets out an uncompromising rule of maturity in his first letter to the Corinthians:" },
        { type: "verse", text: "When I was a child, I spoke as a child, I felt as a child, I thought as a child. Now that I have become a man, I have put away childish things.", ref: "1 Corinthians 13:11" },
        { type: "p", text: "The spiritual child is marked by dependence. They need to be pushed to pray, reminded to read the Bible, told what to think in a trial and supported at every step. But entering the marriage covenant requires leaving behind the crutches of spiritual childhood." },
        { type: "p", text: "A blessed marriage needs two believers able to drink directly from the Source. If a husband or wife constantly waits for the other to be the home's “spiritual engine” to get out of their torpor, the couple creates an exhausting imbalance. Independent faith is not isolation; it is the ability to keep a burning personal altar in the secret of one's room (Matthew 6:6) before coming to join one's flame to one's spouse's." },
      ],
    },
    {
      heading: "The true nature of spiritual leadership according to Christ",
      blocks: [
        { type: "p", text: "Few subjects have caused as much damage and misunderstanding in Christian homes as the notion of “head” and spiritual leadership. Yet Scripture sets out a revolutionary model:" },
        { type: "verse", text: "For the husband is the head of the wife, as Christ also is the head of the assembly, being himself the savior of the body.", ref: "Ephesians 5:23" },
        { type: "p", text: "Worldly culture and religious tradition have too often turned this verse into a licence for domination, tyranny or one-sided decisions. That is a complete perversion of the text. In the Gospel, what kind of head is Christ?" },
        { type: "points", items: [
          { lead: "He is the Head who kneels", text: "to wash his disciples' feet (John 13)." },
          { lead: "He is the Head who gives his own life", text: "as a sacrifice to sanctify his Church (Ephesians 5:25)." },
          { lead: "He is the Head who protects, listens, feeds", text: "and takes care of his body." },
        ] },
        { type: "p", text: "A man's true spiritual leadership is not a certificate of authority, but a **mandate of responsibility for love, service and intercession**. A mature man does not try to impose his will; he takes the initiative in prayer, he is the first to ask forgiveness in a conflict, and he covers his wife with a mantle of intercession." },
        { type: "p", text: "For her part, the mature woman is not a passive spectator. She embodies the leadership of influence and wisdom described in Proverbs 14:1: *“Every wise woman builds her house.”* She is the spiritual co-warrior (*Ezer Kenegdo*), gifted with sharp discernment and a power of intercession that guards the walls of the home." },
        { type: "authorQuote", text: "A mature man is not afraid of a spiritually strong woman; he looks for a teammate able to intercede by his side in life's battles.", author: "Dr. Tony Evans, author of *Kingdom Man*" },
      ],
    },
    {
      heading: "The mirror check of spiritual independence",
      blocks: [
        { type: "p", text: "To measure accurately your level of independence and spiritual maturity before committing to marriage, look at the table below:" },
        {
          type: "table", variant: "compare",
          head: ["The spiritual child (borrowed faith)", "The mature disciple (independent faith)"],
          rows: [
            ["Their prayer depends on the atmosphere of Sunday service or the fervour of others.", "Keeps a secret, daily personal altar of prayer (Matthew 6:6)."],
            ["Never opens the Bible alone at home; relies only on the occasional sermon.", "Meditates on and studies God's Word personally to feed their soul."],
            ["Uses Bible verses as weapons to dominate, shame or impose their will.", "Exercises a leadership of service, listening, humility and mutual forgiveness."],
            ["Collapses spiritually at the slightest doubt or the first trial.", "Stands firm in the faith and knows how to intercede with authority for their future and their home."],
          ],
        },
        {
          type: "worksheet",
          title: "Audit of spiritual independence & leadership",
          intro: "Honestly rate each statement from 1 (very weak) to 5 (excellent).",
          sections: [
            { title: "Section 1 — Scale of independent faith", intro: "Rate each statement from 1 to 5:", items: [
              "I have a daily discipline of personal prayer and Bible reading without needing to be pushed.",
              "I know how to seek and discern God's will in prayer before making an important decision.",
              "I am able to intercede with spiritual authority in a trial or an attack of the enemy.",
              "I am comfortable leading a time of prayer and Bible sharing aloud with my future spouse.",
            ] },
            { title: "Section 2 — Personal recovery commitment (within 14 days)", intro: "If your overall score is below 15/20:", items: [
              "Write your action plan for a personal altar (e.g. 20 minutes of morning prayer every day, without your phone):",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "When you talk with a suitor on Garden of Alliance, don't settle for asking: *“Which church do you go to?”* or *“Do you have a ministry?”* Seek to discover the life of the secret altar! Ask: *“How does the Lord speak to you in your daily reading?”*, *“How do you handle times of spiritual dryness?”* Look for a partner whose faith is not just Sunday decoration, but an independent and contagious engine of life." },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision.",
  quiz: [
    {
      question: "According to 1 Corinthians 13:11, what does spiritual maturity mean for a single person?",
      options: [
        "Having completed long studies in theology.",
        "Putting away what belongs to childhood (dependence, laziness) to live a responsible, mature personal faith.",
        "Becoming perfect without any temptation.",
      ],
      answer: 1,
      explanation: "Spiritual maturity is the move from a dependent, borrowed faith to a posture of responsibility and steadfastness in Christ.",
    },
    {
      question: "How is a man's spiritual leadership exercised according to Ephesians 5:23?",
      options: [
        "Through authoritarian domination and one-sided decisions.",
        "Following Christ's example: through service, sacrificial love, taking the initiative in prayer and protecting the family.",
        "By leaving his wife to carry everything alone.",
      ],
      answer: 1,
      explanation: "True biblical leadership is a responsibility of love and spiritual covering, not tyranny.",
    },
    {
      question: "What is the spiritual role of the mature woman (*Ezer Kenegdo*) in the home according to Proverbs 14:1?",
      options: [
        "To be a passive spectator with no opinion.",
        "To bring a leadership of influence, wisdom, discernment and intercession to build and protect her house.",
        "Never to pray for her husband.",
      ],
      answer: 1,
      explanation: "The mature woman is a powerful strategic partner through prayer and wisdom.",
    },
    {
      question: "Why is the personal altar the precondition for the family altar?",
      options: [
        "Because you cannot pass on or lead what you do not practise yourself in intimacy with God.",
        "Because it is an administrative rule.",
        "Because it replaces marriage.",
      ],
      answer: 0,
      explanation: "The family altar is simply the overflow of the personal communion each spouse keeps with the Lord.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Take a moment before God. If you had to assess honestly the state of your personal altar today, what is its temperature? Are you inwardly sure you are ready to inspire and support your future home spiritually, rather than waiting for your spouse to do all the work in your place?",
  },
};

/* ───────────────────────────── Lesson 3.2 ───────────────────────────── */

const lesson32: Lesson = {
  number: "3.2",
  slug: "3-2",
  title: "Emotional maturity: self-control, managing stress and anger",
  image: lessonImage("3-2"),
  poster: POSTERS["3-2"],
  pdf: `${BASE}/pdf/lecon-3-2-la-maturite-emotionnelle.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "The furious child in an adult's body",
    blocks: [
      { type: "p", text: "Imagine a 35-year-old man in an impeccable suit, holding a senior position or preaching from the pulpit on Sundays. But as soon as there is a delay, an annoyance or a remark that stings him, he bangs the table, shouts, breaks something or sulks in silence for three days. Despite his adult appearance, emotionally it is a 6-year-old child who has taken the wheel." },
      { type: "p", text: "One of the greatest marital tragedies is to link maturity only with age or professional success. Marriage is an incubator of intimacy in which tiredness, stress and friction inevitably make the pressure rise. If you have not learned to govern your mind and emotions as a single person, marriage will not calm that instability — it will amplify it." },
    ],
  },
  objective: "To unmask the destructive mechanisms of anger and impulsiveness, and learn to cultivate self-control so you become a haven of peace and emotional safety for your future home.",
  parts: [
    {
      heading: "The time bomb of a lack of self-control",
      blocks: [
        { type: "p", text: "God's Word does not make self-control a minor character trait, but the supreme mark of true spiritual strength:" },
        { type: "verse", text: "One who is slow to anger is better than the mighty; one who rules his spirit, than he who takes a city.", ref: "Proverbs 16:32" },
        { type: "verse", text: "So, then, my beloved brothers, let every man be swift to hear, slow to speak, and slow to anger; for the anger of man doesn't produce the righteousness of God.", ref: "James 1:19-20" },
        { type: "p", text: "Solomon makes a striking observation: conquering cities, running companies or winning great outward victories proves nothing if you cannot tame your own rage. An impulsive person is like a city without walls (Proverbs 25:28): at the mercy of the slightest outside trigger." },
        { type: "p", text: "In a couple, a lack of self-control shows up as venomous words, hasty judgements, punitive sulking and, worst of all, **the nuclear threat of break-up or divorce** brandished at every argument. Someone who shouts or threatens as soon as they are annoyed is not communicating: they are demolishing the covenant's basic safety. Proverbs 14:1 warns: *“Every wise woman builds her house, but the foolish one tears it down with her own hands.”* Exactly the same goes for a man." },
      ],
    },
    {
      heading: "The physiology of stress and the scapegoat trap",
      blocks: [
        { type: "p", text: "Why do sincere Christians sometimes lose all control? Clinical psychology and neurology explain that under stress and tiredness, the emotional brain (the amygdala) short-circuits the rational brain (the prefrontal cortex). The person switches into “fight or flight” mode." },
        { type: "p", text: "When a single person has not learned to handle work stress or tiredness responsibly, they make the tragic mistake of turning their partner into their **emotional scapegoat**. They come home and pour their frustration onto the other as irritability, reproaches or accusations of bad intent. It is relational injustice at its worst." },
        { type: "p", text: "A mature person learns to recognise their body's warning signs (racing heart, clenched jaw) and applies the golden rule of the **20-minute time-out**: being able to say calmly, *“I can feel the pressure rising. I'm taking 20 minutes to walk, breathe and pray, and we'll pick this conversation up again in peace.”* Those 20 minutes let the adrenaline drop so that the Kingdom's wisdom can speak again." },
        { type: "authorQuote", text: "Emotional maturity in a couple is not measured by the absence of disagreements, but by how quickly and responsibly you bring the pressure down without hurting the other.", author: "Dr. Les Parrott, psychologist and author" },
      ],
    },
    {
      heading: "The mirror check of emotional maturity",
      blocks: [
        { type: "p", text: "Look carefully at the two postures below to locate your current level of self-control:" },
        {
          type: "table", variant: "compare",
          head: ["The impulsive person (emotional bomb)", "The mature, safe person (self-controlled)"],
          rows: [
            ["Shouts, insults, bangs furniture or breaks things in anger.", "Pauses to breathe, calms their body and speaks with restraint and respect."],
            ["Assumes bad intent and accuses without proof (“It's bound to be your fault!”).", "Listens first, asks questions and checks the facts before judging (Proverbs 18:13)."],
            ["Uses the threat of break-up or divorce as blackmail or punishment.", "Protects the safety of the covenant and seeks a peaceful resolution of the problem."],
            ["Pours work stress or tiredness onto their spouse (scapegoat).", "Looks after their lifestyle, acknowledges their tiredness and communicates with vulnerability."],
          ],
        },
        {
          type: "worksheet",
          title: "The impulsiveness and crisis-management thermometer",
          intro: "Honestly rate each behaviour from 1 (never) to 5 (often).",
          sections: [
            { title: "Section 1 — Anger self-assessment", intro: "Rate each behaviour from 1 to 5:", items: [
              "When I am very annoyed, I tend to raise my voice, shout or make violent accusations.",
              "I have already broken things, banged furniture or slammed a door in anger.",
              "I use punitive silence and sulking for several hours or days to punish the other.",
              "I have already brandished the threat of breaking up or divorcing in a heated argument.",
              "When I am tired or stressed by work, I become irritable and curt with those around me.",
            ] },
            { title: "Section 2 — Self-control commitment (within 14 days)", intro: "If your total is above 10/25:", items: [
              "Commit to applying the 20-minute time-out rule and to debriefing your outbursts with your Garden of Alliance mentor:",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "While dating, don't let yourself be blinded by a suitor's gentleness in calm moments. Watch closely how they react under pressure! How do they treat a waiter who makes a mistake? How do they react when a project fails, when they're stuck in traffic or when a disagreement arises? Look for a partner whose emotional brake works as well as their passionate accelerator. That is the guarantee of your future safety." },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision.",
  quiz: [
    {
      question: "According to Proverbs 16:32, who is better than a mighty man who takes cities?",
      options: [
        "The one who earns a lot of money.",
        "The one who is slow to anger and rules his own spirit.",
        "The one who imposes their view with flair.",
      ],
      answer: 1,
      explanation: "True spiritual and human strength lies in self-control in a crisis.",
    },
    {
      question: "What is the effect of repeatedly threatening break-up or divorce during arguments?",
      options: [
        "It proves you have character.",
        "It destroys the covenant's basic safety and demolishes trust in the couple.",
        "It is an effective negotiating method.",
      ],
      answer: 1,
      explanation: "Brandishing divorce at the slightest annoyance sabotages the trust the covenant needs.",
    },
    {
      question: "What is the first rule to apply when uncontrollable fury rises?",
      options: [
        "Shout immediately to get it off your chest.",
        "Apply the 20-minute time-out to let the physical pressure drop before carrying on.",
        "Sulk for three days.",
      ],
      answer: 1,
      explanation: "The 20-minute pause lets the rational brain take over again in peace.",
    },
    {
      question: "What does making your partner your “emotional scapegoat” mean?",
      options: [
        "Praying for your spouse.",
        "Pouring onto them the stress, tiredness and frustrations of your working day instead of handling them maturely.",
        "Giving them surprise gifts.",
      ],
      answer: 1,
      explanation: "It is a relational injustice that makes your spouse pay for tiredness caused by others.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Take an honest pause. Have you ever hurt someone with an angry word or an impulsive reaction you regret today? What concrete decision are you making before God so that your future home is a sanctuary of safety and peace, not an emotional battlefield?",
  },
};

/* ───────────────────────────── Lesson 3.3 ───────────────────────────── */

const lesson33: Lesson = {
  number: "3.3",
  slug: "3-3",
  title: "Financial maturity: budget, managing debt, saving and the home's financial vision",
  image: lessonImage("3-3"),
  poster: POSTERS["3-3"],
  pdf: `${BASE}/pdf/lecon-3-3-la-maturite-financiere.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "The time bomb under the marriage bed",
    blocks: [
      { type: "p", text: "Imagine a couple who have just celebrated a lavish wedding. The vows have been exchanged, the guests have applauded, the pastoral blessing has been pronounced. But only a few weeks after the party, reality bursts in: reminder letters arrive, overdrafts appear, and one spouse discovers in dismay that the other is carrying €10,000 of hidden consumer-credit debt." },
      { type: "p", text: "Romantic love evaporates instantly under the pressure of financial deception. Clinical and pastoral studies all agree: money is among the two leading causes of divorce in the world. Approaching marriage preparation as if money were a taboo or purely secular subject is a tragic mistake. **Money is the ultimate revealer of the heart and of one's level of spiritual maturity (Luke 16:11).**" },
    ],
  },
  objective: "To unmask financial illusions, learn complete transparency before the covenant, and lay the foundations of a biblical, provident budget for your future home.",
  parts: [
    {
      heading: "The illusion of “God will provide” without management",
      blocks: [
        { type: "p", text: "Some Christian singles use faith as a mask to hide their laziness or financial indiscipline. They repeat *“The Lord will provide!”* while piling up impulse purchases and overdrafts. God's Word puts things in their place with formidable clarity:" },
        { type: "verse", text: "The rich rule over the poor. The borrower is servant to the lender.", ref: "Proverbs 22:7" },
        { type: "verse", text: "For which of you, desiring to build a tower, doesn't first sit down and count the cost, to see if he has enough to complete it?", ref: "Luke 14:28" },
        { type: "p", text: "Jesus himself makes budgeting a parable of divine wisdom. Sitting down to count the cost before building the tower of your marriage is not a lack of faith: it is an act of administrative obedience. God does not provide to finance our disorder; he blesses what is managed responsibly." },
        { type: "p", text: "Thoughtless consumer debt creates a bond of servitude (Proverbs 22:7). Entering marriage by making your spouse repay debts born of your own past carelessness is a serious relational injustice. In Luke 16:11, the Lord asks the question of trust: *“If therefore you have not been faithful in the unrighteous mammon, who will commit to your trust the true riches?”*" },
      ],
    },
    {
      heading: "The 4 pillars of financial health before marriage",
      blocks: [
        { type: "p", text: "To build a financially peaceful home that prospers according to the Kingdom, a single person must master four pillars:" },
        { type: "titledSteps", items: [
          { title: "Complete transparency", text: "Disclosing plainly your real income, expenses, debts and savings before any official commitment. Financial opacity is the breeding ground of lies." },
          { title: "A written budget", text: "Drawing up a rigorous budget every month (the rule of 70% fixed needs / 20% saving & repayment / 10% tithe & generosity) and living below your means." },
          { title: "The safety fund (precautionary savings)", text: "Building an emergency reserve equal to 3 to 6 months of running costs to face life's unexpected events without panic." },
          { title: "Aligning the household's vision", text: "Deciding together how accounts will be structured (a main joint account for household costs + personal sub-accounts for pocket-money independence), the tithe and investment plans." },
        ] },
        { type: "authorQuote", text: "Money only reveals who you are. If you are undisciplined as a single person, marriage will double your income but quadruple your financial conflicts.", author: "Dave Ramsey, Christian financial management expert" },
      ],
    },
    {
      heading: "The mirror check of financial management",
      blocks: [
        { type: "p", text: "Examine your current financial situation in the light of the table below:" },
        {
          type: "table", variant: "compare",
          head: ["The impulse buyer (financial risk)", "The mature manager (Kingdom wisdom)"],
          rows: [
            ["Hides credit debts, overdrafts or impulse purchases out of shame.", "Practises complete financial transparency and has no hidden debt."],
            ["Buys on emotion (retail therapy) and lives beyond their means.", "Plans purchases, tells needs from wants and keeps to a written budget."],
            ["Lives from day to day with no precautionary savings.", "Methodically builds an emergency fund of 3 to 6 months of expenses."],
            ["Refuses to talk about money or sees the subject as “unspiritual”.", "Treats money as a tool of blessing for their home and God's Kingdom."],
          ],
        },
        {
          type: "worksheet",
          title: "Pre-marital financial transparency sheet",
          intro: "Honestly assess your current financial situation from 1 (critical) to 5 (excellent).",
          sections: [
            { title: "Section 1 — Financial self-assessment", intro: "Rate each statement from 1 to 5:", items: [
              "I know the exact amount of my fixed monthly expenses and I keep to a written budget.",
              "I have emergency savings covering at least 3 months of expenses.",
              "I have no consumer debt or recurring overdraft out of control.",
              "I am completely comfortable talking about money, debt and budget transparently.",
            ] },
            { title: "Section 2 — Debt clearance & transparency plan (within 14 days)", items: [
              "Write down the exact amount of your current debts and your priority repayment plan to present to your mentor:",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "In your pre-marital conversations on Garden of Alliance, don't be afraid to bring up money! It is not about asking for a bank statement on the first date, but about observing the suitor's overall attitude. Are they generous or stingy? A grasshopper or an ant? Do they have a vision of work and saving, or live in the illusion of endless debt? A mature partner talks about money with clarity, responsibility and faith." },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision.",
  quiz: [
    {
      question: "According to Proverbs 22:7, what is the major danger of consumer debt?",
      options: [
        "It stops you from travelling.",
        "It puts the borrower in a position of servitude that creates anxiety and weighs on the home.",
        "It has no impact on the couple.",
      ],
      answer: 1,
      explanation: "Debt robs the household of its freedom of action and brings constant anxiety.",
    },
    {
      question: "What does Jesus command in Luke 14:28 before undertaking a great project like marriage?",
      options: [
        "Take out an unlimited bank loan.",
        "First sit down to count the cost and check your capacity to organise your finances.",
        "Wait for others to pay for us.",
      ],
      answer: 1,
      explanation: "Provident planning and budgeting are acts of divine wisdom.",
    },
    {
      question: "What is the golden rule of financial preparation before marriage?",
      options: [
        "Never talk about money before the wedding ceremony.",
        "Complete transparency about your income, expenses, debts and savings.",
        "Hide your pocket money.",
      ],
      answer: 1,
      explanation: "Financial honesty beforehand builds trust and prevents nasty surprises.",
    },
    {
      question: "What is a precautionary emergency fund?",
      options: [
        "Money kept only for holidays.",
        "A financial reserve equal to 3 to 6 months of running costs to face the unexpected without panic.",
        "An emergency bank loan.",
      ],
      answer: 1,
      explanation: "The safety fund protects the peace of the home when life's surprises come.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Take an honest look before God. Are you completely transparent about your current financial state? Do you have the discipline needed to manage a budget for two, or does a fear of figures push you into avoidance? What concrete decision are you making today to put your finances in order before you say “yes”?",
  },
};

/* ───────────────────────────── Lesson 3.4 ───────────────────────────── */

const lesson34: Lesson = {
  number: "3.4",
  slug: "3-4",
  title: "Social and professional maturity: balancing career, ministry and family life",
  image: lessonImage("3-4"),
  poster: POSTERS["3-4"],
  pdf: `${BASE}/pdf/lecon-3-4-la-maturite-sociale-et-professionnelle.pdf`,
  readingMinutes: 6,
  intro: {
    heading: "The trap of the overloaded diary and the sacrificed home",
    blocks: [
      { type: "p", text: "Imagine someone who passionately dreams of getting married. But when you look at their real schedule, you find they work 60 hours a week, attend church meetings every evening and spend their weekends at community events. Even if they claim to want to welcome a spouse, in their diary there is literally no room for life as a couple." },
      { type: "p", text: "It is a very common trap among ambitious or very devoted Christian singles. They forget that marriage requires time, emotional availability and real physical presence. Succeeding in your career or shining in ministry at the cost of sacrificing your future home makes no spiritual or relational sense (1 Timothy 5:8)." },
    ],
  },
  objective: "To learn to harmonise your work, ministries and social life so as to build a balanced schedule, ready to welcome the marriage covenant.",
  parts: [
    {
      heading: "Tend your field before building your house",
      blocks: [
        { type: "p", text: "Biblical wisdom lays down a principle of order and timing in social and professional preparation:" },
        { type: "verse", text: "Prepare your work outside, and get your fields ready. Afterwards, build your house.", ref: "Proverbs 24:27" },
        { type: "verse", text: "And whatever you do, work heartily, as for the Lord, and not for men.", ref: "Colossians 3:23" },
        { type: "p", text: "Solomon gives fundamental common-sense advice: *getting your fields ready* (stabilising your work, your financial independence and your social responsibility) must come before building the home (*“afterwards, build your house”*). Wanting to marry with no professional independence, or in insecurity caused by laziness, is irresponsible." },
        { type: "p", text: "Moreover, professional excellence (Colossians 3:23) honours God. Work is not a curse; it is a sacred calling. But it must stay in its proper place in the pyramid of the Kingdom's priorities:" },
        { type: "steps", items: ["God", "Your spouse and your home", "Work and career", "Ministry and social involvement"] },
        { type: "p", text: "Reversing this order destroys life as a couple." },
      ],
    },
    {
      heading: "3 common social and professional traps",
      blocks: [
        { type: "titledSteps", items: [
          { title: "The workaholic syndrome", text: "Looking for your personal worth only in promotions and social status, or using work to escape loneliness. A workaholic has no emotional energy left to give." },
          { title: "The trap of church over-commitment", text: "Filling every evening with ministry meetings on the pretext of “serving God”, while neglecting your health, rest and emotional life. God has never asked anyone to sacrifice their home on the altar of religious activism." },
          { title: "Social instability and dependence", text: "Flitting from job to job without consistency, or staying dependent on your parents out of unwillingness to make an effort." },
        ] },
        { type: "authorQuote", text: "No professional or church success can make up for the failure of a home abandoned for lack of presence and listening.", author: "Dr. Henry Cloud, psychologist and author" },
      ],
    },
    {
      heading: "The mirror check of social maturity",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["The overwhelmed activist (overloaded diary)", "The balanced disciple (aligned priorities)"],
          rows: [
            ["Is a slave to work or meetings and has no free evening.", "Works with excellence but knows how to set boundaries to protect their home."],
            ["Takes on every responsibility at church to the point of total exhaustion.", "Knows how to say “no” politely and wisely to keep quality time."],
            ["Unable to keep a stable job or plan for their own needs.", "Provides for their needs responsibly and prepares for the future maturely."],
            ["Has no healthy social life or friendships outside work and ministry.", "Keeps a network of upbuilding friendships and a regular rhythm of rest."],
          ],
        },
        {
          type: "worksheet",
          title: "Priorities & time-management matrix",
          intro: "Assess the balance of your current schedule from 1 (unbalanced) to 5 (balanced).",
          sections: [
            { title: "Section 1 — Self-assessment of how you use your time", intro: "Rate each statement from 1 to 5:", items: [
              "My work leaves me free time and energy in the evenings and at weekends for my personal life.",
              "My church or volunteer commitments are balanced and don't exhaust me.",
              "I am able to set firm limits on my work to protect my rest.",
              "My work is stable enough to cover the costs of a household.",
            ] },
            { title: "Section 2 — Realigning your schedule (within 14 days)", items: [
              "Which activity or responsibility do you decide to lighten this week to free up time for your future home?",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "In your pre-marital conversations on Garden of Alliance, watch the suitor's pace of life! Do they have time to talk in depth, or do they always reply in a hurry between two meetings? Do they have hobbies, times of rest and friends, or is their life an exhausting marathon? Look for a partner able to give real priority to time as a couple." },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision.",
  quiz: [
    {
      question: "According to Proverbs 24:27, which step must come before building the home?",
      options: [
        "Travelling abroad.",
        "Preparing your work outside and getting your field ready (your professional activity).",
        "Waiting and doing nothing.",
      ],
      answer: 1,
      explanation: "Professional stability and foresight come before the responsibility of marriage.",
    },
    {
      question: "What is God's order of priorities for a believer?",
      options: [
        "Work → Ministry → Family → God.",
        "God → Spouse and family → Work and career → Ministry and commitments.",
        "Church → Work → Family → God.",
      ],
      answer: 1,
      explanation: "In the Kingdom's priorities, the home comes immediately after God.",
    },
    {
      question: "What is the risk of the workaholic syndrome in one's love life?",
      options: [
        "Earning too much money.",
        "Drying up the time and emotional availability essential to building intimacy as a couple.",
        "Becoming too cheerful.",
      ],
      answer: 1,
      explanation: "Work addiction deprives the spouse of presence and listening.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Review your past week. How many hours did you give to rest, prayer, your loved ones and your personal growth? If your future spouse came into your life today, what real place would you give them in your diary?",
  },
};

/* ───────────────────────────── Lesson 3.5 ───────────────────────────── */

const lesson35: Lesson = {
  number: "3.5",
  slug: "3-5",
  title: "Physical preparation and lifestyle in the couple",
  image: lessonImage("3-5"),
  poster: POSTERS["3-5"],
  pdf: `${BASE}/pdf/lecon-3-5-la-preparation-physique.pdf`,
  readingMinutes: 6,
  intro: {
    heading: "The neglected sanctuary",
    blocks: [
      { type: "p", text: "In some Christian circles there is a misleading split that sets the spiritual against the physical. People over-spiritualise the heart while despising the body. They say: *“Only the heart matters! Beauty is vain and the body is just dust.”* And they enter marriage with neglected personal hygiene, health abandoned to carelessness and sometimes hidden addictions." },
      { type: "p", text: "That is a major theological error. In the Bible, the body is neither an object of shame nor a god to idolise: it is the sanctuary of the Holy Spirit (1 Corinthians 6:19-20) and the earthly vehicle through which you will express your tenderness, presence and love to your spouse. Taking care of your body, your cleanliness, your sleep and your appearance is an act of honour towards God and respect towards your future spouse." },
    ],
  },
  objective: "To discover the spiritual and relational value of the body, get rid of hidden addictions (pornography, substances) and build a lifestyle worthy of the Covenant.",
  parts: [
    {
      heading: "A theology of the body and the gift to one's spouse",
      blocks: [
        { type: "p", text: "The apostle Paul sets out the extraordinary dignity of the human body in his first letter to the Corinthians:" },
        { type: "verse", text: "Or don't you know that your body is a temple of the Holy Spirit who is in you, whom you have from God? You are not your own, for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God's.", ref: "1 Corinthians 6:19-20" },
        { type: "p", text: "Within the covenant of marriage, Paul adds a fascinating principle of bodily interdependence:" },
        { type: "verse", text: "The wife doesn't have authority over her own body, but the husband. Likewise also the husband doesn't have authority over his own body, but the wife.", ref: "1 Corinthians 7:4" },
        { type: "p", text: "Your body will become your spouse's private garden. Looking after your physical health, taking care with your clothes, keeping impeccable dental and personal hygiene and exercising to keep your energy is not vanity: it is considerate love. Offering your spouse a body neglected out of laziness is a lack of respect for the Covenant." },
      ],
    },
    {
      heading: "The necessary freedom from hidden addictions",
      blocks: [
        { type: "p", text: "The greatest physical and mental danger in preparing for marriage is the presence of secret addictions, foremost among them pornography and compulsive masturbation." },
        { type: "p", text: "Psychology and neurology show that pornography disrupts the brain's chemistry (dopamine) and reprograms desire. It creates unrealistic expectations, turns the other into an object of consumption and dries up the capacity for real intimacy. Entering marriage with a hidden pornography addiction is bringing an invisible, toxic third party into the marriage bed. Deliverance and accountability are essential before saying “yes”." },
        { type: "authorQuote", text: "You cannot offer a holy heart in a body deliberately neglected or chained by hidden addictions. Sanctification also touches hygiene and health.", author: "Dr. Neil Anderson, author of *The Bondage Breaker*" },
      ],
    },
    {
      heading: "The mirror check of physical care",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["The careless single (letting things slide)", "The honourable disciple (a well-kept temple)"],
          rows: [
            ["Neglects their appearance and hygiene on the pretext that “the heart is enough”.", "Honours their body as a temple of the Holy Spirit and takes care of their appearance."],
            ["Keeps a hidden addiction to pornography or substances.", "Walks in purity and transparency, and gets help to heal."],
            ["Does no exercise and lives exhausted by lack of sleep.", "Exercises regularly and looks after their sleep and health."],
            ["Refuses medical check-ups or treatment for avoidable problems.", "Takes responsible care of their health with their future family life in mind."],
          ],
        },
        {
          type: "worksheet",
          title: "Lifestyle and overall health review",
          intro: "Honestly rate your lifestyle from 1 (neglected) to 5 (excellent).",
          sections: [
            { title: "Section 1 — Physical self-assessment", intro: "Rate each statement from 1 to 5:", items: [
              "I pay attention to my personal and dental hygiene and to keeping my clothes clean.",
              "I exercise regularly (2 to 3 times a week) to keep my body healthy.",
              "I am completely free from any addiction to pornography or substances.",
              "I get enough sleep and manage my diet to avoid exhaustion.",
            ] },
            { title: "Section 2 — Purity & fitness plan (within 14 days)", items: [
              "If an addiction or neglect exists, write down the concrete decision you have taken (e.g. filtering software, exercise, medical check-up):",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "During your pre-marital meetings on Garden of Alliance, pay attention to overall lifestyle! Someone who takes no care of themselves, lets themselves go physically or hides dependencies will lack discipline in the home. Physical attraction isn't everything, but mutual care of the body keeps the flame and the honour of the covenant alive." },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision.",
  quiz: [
    {
      question: "According to 1 Corinthians 6:19-20, what is the theological reality of the believer's body?",
      options: [
        "A worthless shell.",
        "The temple of the Holy Spirit, bought at a high price by Christ, which must be honoured.",
        "An object of aesthetic vanity.",
      ],
      answer: 1,
      explanation: "The body is God's sanctuary and must be looked after with care and holiness.",
    },
    {
      question: "What is the effect of pornography on preparing for marriage?",
      options: [
        "It prepares you for life as a couple.",
        "It destroys the capacity for real intimacy, creates unrealistic illusions and distorts how you see your spouse.",
        "It has no consequences.",
      ],
      answer: 1,
      explanation: "Pornography is a relational toxin that must be removed before the covenant.",
    },
    {
      question: "Why do personal hygiene and a cared-for appearance matter according to 1 Corinthians 7:4?",
      options: [
        "Out of mere social pride.",
        "It is a mark of respect and honour towards yourself and towards your future spouse, to whom your body is given.",
        "To please strangers.",
      ],
      answer: 1,
      explanation: "Taking care of your body nurtures attraction and mutual respect in the covenant.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Look at yourself kindly and truthfully in a mirror. Are you really taking care of the temple of the Holy Spirit God has entrusted to you? Do you have secret dependencies to lay at the foot of the cross today, so you can offer your future spouse a body that is holy, pure and full of energy?",
  },
};

/* ───────────────────────────── Lesson 3.6 ───────────────────────────── */

const lesson36: Lesson = {
  number: "3.6",
  slug: "3-6",
  title: "The 5 love languages and managing emotional reservoirs",
  image: lessonImage("3-6"),
  poster: POSTERS["3-6"],
  pdf: `${BASE}/pdf/lecon-3-6-les-5-langages-de-l-amour.pdf`,
  readingMinutes: 6,
  intro: {
    heading: "An emotional dialogue of the deaf",
    blocks: [
      { type: "p", text: "Imagine a husband who passionately expresses his love for his wife by working 12 hours a day and giving her beautiful gifts. But his wife weeps silently in her room, feeling deeply neglected, because her heart desperately needs 20 minutes of eye-to-eye conversation with no phone. He speaks “gifts and security”; she hears “absence and rejection”." },
      { type: "p", text: "That is the tragedy of thousands of sincere Christian couples: they love each other, but they speak different emotional languages. Biblical love (*agape*) is not about imposing the way *we* like to give affection, but about humbly learning our future spouse's own emotional language (Philippians 2:4) so as to keep their emotional reservoir constantly full." },
    ],
  },
  objective: "To discover the 5 love languages, understand how the emotional reservoir works, and develop the relational flexibility needed to love the other according to their real needs.",
  parts: [
    {
      heading: "The principle of unselfish decentring",
      blocks: [
        { type: "p", text: "The apostle Paul sets out the golden rule of relational love in his letter to the Philippians:" },
        { type: "verse", text: "Each of you not just looking to his own things, but each of you also to the things of others.", ref: "Philippians 2:4" },
        { type: "verse", text: "Love is patient and is kind… doesn't seek its own way, is not provoked, takes no account of evil.", ref: "1 Corinthians 13:4-5" },
        { type: "p", text: "Loving according to the Kingdom means leaving emotional self-centredness behind. If your future spouse needs words of affirmation to feel valued and you only give them acts of service, you are meeting your need to act, not their need to receive. Love does not seek its own comfort: it adapts." },
        { type: "p", text: "Every human being has an inner “emotional reservoir”. When it is full, the couple go through tensions with patience and security; when it is empty, the slightest friction leads to irritability, bitterness and withdrawal. Filling your spouse's emotional reservoir is an act of daily spiritual stewardship." },
      ],
    },
    {
      heading: "The 5 love languages decoded",
      blocks: [
        { type: "titledSteps", items: [
          { title: "Words of affirmation and appreciation", text: "Kind words, sincere compliments, explicit thanks and encouragement. For this person, harsh criticism leaves deep scars." },
          { title: "Quality time", text: "Undivided attention without distraction (no screens), deep conversations and walks together. It is about truly being together, not just side by side." },
          { title: "Gifts and visible tokens", text: "Tangible symbols of thought and affection. It is not the price that counts, but the fact that you thought of them." },
          { title: "Acts of service", text: "Concrete actions to lighten the other's load (help at home, paperwork, practical support). For this person, actions speak louder than words." },
          { title: "Physical touch", text: "Kisses, caresses, holding hands, warm hugs. It is the main vehicle of their emotional security." },
        ] },
        { type: "authorQuote", text: "Showing love to your spouse means deciding to speak their emotional language, even if it requires us to step out of our comfort zone.", author: "Dr. Gary Chapman, author of *The 5 Love Languages*" },
      ],
    },
    {
      heading: "The mirror check of love languages",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["The emotionally selfish (incurious)", "The mature partner (unselfish and adaptable)"],
          rows: [
            ["Imposes their own language and blames the other for not being satisfied with it.", "Actively studies the other's needs and adapts to their primary language."],
            ["Gives only what they themselves enjoy.", "Looks for the gestures that fill their spouse's particular reservoir."],
            ["Ignores the signs of an empty reservoir in the other (irritability, sulking).", "Notices the reservoir running low and takes the initiative to fill it again."],
            ["Uses hurtful words or withholds touch as a weapon of punishment.", "Protects their spouse's heart with kind words and a safe presence."],
          ],
        },
        {
          type: "worksheet",
          title: "Identifying primary & secondary languages",
          intro: "Rank the 5 languages in order of priority for you (from 1 = most important to 5 = least important).",
          sections: [
            { title: "Section 1 — Ranking my love languages", intro: "Give each language a rank:", items: [
              "**Words of affirmation**: kind words, thanks, sincere compliments. — Rank:",
              "**Quality time**: undivided attention without screens, deep conversations. — Rank:",
              "**Gifts & tokens**: little surprises, symbols of thoughtful attention. — Rank:",
              "**Acts of service**: practical help, lightening the load. — Rank:",
              "**Physical touch**: hugs, caresses, holding hands, physical closeness. — Rank:",
            ] },
            { title: "Section 2 — Emotional flexibility commitment (within 14 days)", items: [
              "Identify the love language that comes least naturally to you and practise 3 deliberate acts in that language towards those close to you this week:",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "While dating on Garden of Alliance, try to discover your suitor's emotional language! Notice what they complain about most often (*“You never pay me compliments”* = words of affirmation; *“You're always distracted by your phone”* = quality time). A mature partner is curious to learn how to love you well." },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision.",
  quiz: [
    {
      question: "According to Philippians 2:4, what is the heart of Christian love in handling love languages?",
      options: [
        "Imposing your own language on your spouse.",
        "Looking to the interests and needs of the other by learning to speak their emotional language.",
        "Waiting without giving anything.",
      ],
      answer: 1,
      explanation: "*Agape* love turns away from self to meet the spouse's real needs.",
    },
    {
      question: "What are the 5 love languages according to Dr. Gary Chapman?",
      options: [
        "Work, prayer, sport, money and silence.",
        "Words of affirmation, quality time, gifts, acts of service and physical touch.",
        "Logic, criticism, authority, gifts and orders.",
      ],
      answer: 1,
      explanation: "These 5 languages cover the ways human beings receive tenderness.",
    },
    {
      question: "What does an empty emotional reservoir cause in a spouse?",
      options: [
        "Constant joy.",
        "Irritability, bitterness, emotional withdrawal and frequent friction.",
        "Greater spirituality.",
      ],
      answer: 1,
      explanation: "An empty reservoir drains patience and triggers relational crises.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Do you know exactly what your primary love language is? And above all, are you ready to make the effort to learn a language that doesn't come naturally to you (paying compliments, doing acts of service…) to increase your future spouse's joy?",
  },
};

/* ───────────────────────────── Lesson 3.7 ───────────────────────────── */

const lesson37: Lesson = {
  number: "3.7",
  slug: "3-7",
  title: "Overall self-assessment: am I ready to take on the responsibility of marriage?",
  image: lessonImage("3-7"),
  poster: POSTERS["3-7"],
  pdf: `${BASE}/pdf/lecon-3-7-auto-evaluation-globale.pdf`,
  readingMinutes: 7,
  intro: {
    heading: "An appointment with your own truth",
    blocks: [
      { type: "p", text: "Imagine an airline pilot about to take off with passengers on board who flatly refuses to run the safety checklist before departure because he “feels ready”. Everyone would agree it is madness. Yet thousands of single people enter marriage every day — the greatest adventure of human life — without ever having run their overall maturity checklist before God." },
      { type: "p", text: "Congratulations on reaching the end of the 6 lessons of pillar 3! You have gone through an examination of your spiritual, emotional, financial, social, physical and relational life. This final summary lesson has a single aim: to take you from a vague feeling to an informed certainty, so you can answer responsibly the fundamental question: *“Am I truly ready to take on the charge of a home?”*" },
    ],
  },
  parts: [
    {
      heading: "The biblical duty of clear-sighted self-examination",
      blocks: [
        { type: "p", text: "In the life of Christian faith, maturity requires honesty with oneself:" },
        { type: "verse", text: "Examine your own selves, whether you are in the faith. Test your own selves. Or don't you know about your own selves, that Jesus Christ is in you?—unless indeed you are disqualified.", ref: "2 Corinthians 13:5" },
        { type: "verse", text: "Even a child makes himself known by his doings, whether his work is pure, and whether it is right.", ref: "Proverbs 20:11" },
        { type: "p", text: "Examining and testing yourself is not an act of guilt but of spiritual dignity (2 Corinthians 13:5). Marriage is neither a lottery nor a machine that miraculously heals the flaws you refused to face. It is your behaviour observed in daily life (Proverbs 20:11) that reveals your real level of readiness." },
        { type: "p", text: "The rule of the Kingdom is clear: you cannot cross the threshold of pillar 4 (discernment and choosing a spouse) without having validated your own maturity review. If you are not ready to govern yourself, you will not be ready to build with someone else." },
      ],
    },
    {
      heading: "A summary of the 6 dimensions of pillar 3",
      blocks: [
        { type: "titledSteps", items: [
          { title: "Spiritual maturity (lesson 3.1)", text: "An independent personal faith, a secret daily altar of prayer and a leadership of service (not authoritarian)." },
          { title: "Emotional maturity (lesson 3.2)", text: "Controlling anger under stress, banishing threats of break-up and using the time-out rule." },
          { title: "Financial maturity (lesson 3.3)", text: "Complete transparency about the figures, a written budget and no hidden consumer debt." },
          { title: "Social & professional maturity (lesson 3.4)", text: "A balanced schedule that gives the home real priority over work and ministry." },
          { title: "Physical preparation & lifestyle (lesson 3.5)", text: "Caring for the body as God's temple, a healthy lifestyle and complete freedom from pornography." },
          { title: "Emotional flexibility (lesson 3.6)", text: "The ability to discern and speak one's spouse's own love language." },
        ] },
        { type: "authorQuote", text: "Honesty with yourself is the first proof of maturity. Acknowledging a weakness today is the surest way to avoid a marital crisis tomorrow.", author: "Dr. Henry Cloud, psychologist" },
      ],
    },
    {
      heading: "The mirror check of readiness for marriage",
      blocks: [
        {
          type: "table", variant: "compare",
          head: ["Immature / at-risk profile (not ready)", "Mature profile / ready for the covenant"],
          rows: [
            ["Collapses without a religious crutch; has no secret prayer life.", "Keeps a living, independent intimacy with God every day."],
            ["Shouts, breaks things or threatens divorce when tensions rise.", "Practises self-control, restraint and the time-out rule."],
            ["Hides debts, lives beyond their means without a budget.", "Practises complete financial transparency and manages their budget wisely."],
            ["Is a slave to work or over-committed at church, with no free time.", "Keeps a strict order of priorities centred on the home."],
            ["Keeps pornography addictions or neglects their body.", "Honours their body as God's temple and lives in purity."],
          ],
        },
        {
          type: "worksheet",
          title: "The covenant readiness grid (summary review)",
          intro: "Honestly assess your level on each of the 6 dimensions (score from 1 to 5), then add up the total out of 30.",
          sections: [
            { title: "Section 1 — Scoring the 6 dimensions", intro: "Rate each dimension from 1 to 5:", items: [
              "**Spiritual maturity**: independent faith, daily prayer and leadership of service.",
              "**Emotional maturity**: anger control, time-out and no threats of break-up.",
              "**Financial maturity**: complete transparency, a controlled budget and freedom from hidden debt.",
              "**Social and professional maturity**: a balanced schedule and priority given to family life.",
              "**Physical preparation**: healthy lifestyle, bodily purity and freedom from addictions.",
              "**Emotional flexibility**: ability to practise the 5 love languages for the other.",
              "**Total score**: … / 30",
            ] },
            { title: "Section 2 — Validation & moving on to pillar 4", intro: "If your score is at least 22/30, with no score of 1/5:", items: [
              "Write your commitment to maturity and submit this review to your mentor:",
            ] },
          ],
        },
      ],
    },
  ],
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "As you complete the readiness grid, remember that the goal is not to reach an impossible perfection, but to show a living sense of responsibility and a sincere will to grow. If you discover a red flag (hidden debts or uncontrolled anger, for example), don't panic! Take a preventive pause of 14 to 30 days with your Garden of Alliance mentor to put that area right before you start dating." },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision.",
  quiz: [
    {
      question: "According to 2 Corinthians 13:5, why is an overall self-assessment essential?",
      options: [
        "To condemn yourself.",
        "To examine yourself clearly before God so as to validate your maturity before moving towards commitment.",
        "To obtain an academic certificate.",
      ],
      answer: 1,
      explanation: "Self-examination keeps you from bringing major untreated flaws into the couple.",
    },
    {
      question: "What does Proverbs 20:11 reveal about the proof of maturity?",
      options: [
        "Maturity is proved by beautiful romantic speeches.",
        "It is the actions and behaviour observed in daily life that show real maturity.",
        "Maturity depends on age.",
      ],
      answer: 1,
      explanation: "Concrete actions are the mirror of the soul's real state.",
    },
    {
      question: "What should someone do who scores 1/5 on anger or debt?",
      options: [
        "Ignore the score and look for a spouse right away.",
        "Follow a targeted recovery plan of 14 to 30 days with their Garden of Alliance mentor.",
        "Give up their plan to marry.",
      ],
      answer: 1,
      explanation: "A red flag must be dealt with responsibly before committing to someone else.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Look at the overall score of your readiness grid. Are you inwardly sure you are ready to take on the responsibility of a home according to God? Which 2 areas do you commit to growing in from today, with the help of the Holy Spirit?",
  },
};

/* ───────────────────────────── Pillar ───────────────────────────── */

export const pillar3En: Pillar = {
  number: 3,
  slug: "bilan-de-maturite",
  title: "Maturity review & multidimensional preparation",
  summary: "Taking stock, dimension by dimension — spiritual, emotional, financial, social, physical and relational — to know truthfully whether you are ready to take on the responsibility of a home.",
  poster: PILLAR_3_POSTER,
  card: `${BASE}/images/pilier-3-carte.webp`,
  lessons: [lesson31, lesson32, lesson33, lesson34, lesson35, lesson36, lesson37],
};
