// Pillar 2 of "Build on the Rock" — English version of pilier-2.ts.
//
// PARITY RULE: mirror pilier-2.ts exactly — same lessons, slugs and numbers,
// same block types in the same order, same quiz options and `answer` indices.
// Progress is stored by slug and index and is shared between both languages.
//
// Scripture: World English Bible (public domain), with "the LORD".
import type { Lesson, Pillar, Poster } from "./types";

const BASE = "/formation/batir-sur-le-roc";
const card = (n: string) => `${BASE}/images/${n}-carte.webp`;
const portrait = (n: string, alt: string): Poster => ({ src: `${BASE}/images/${n}.webp`, width: 1055, height: 1491, alt });

/** Pillar poster: reused at the top of lessons 2.2 and 2.4, which have no poster of their own yet. */
const PILLAR_2_POSTER: Poster = {
  src: `${BASE}/images/pilier-2.webp`,
  width: 1122,
  height: 1402,
  alt: "Poster (in French) “Self-knowledge — Temperaments & inner healing”: a woman looks at herself in a mirror surrounded by her strengths, needs, emotions, values and healed wounds; the four temperaments on the left, the path of inner healing on the right, and the verse Romans 12:2.",
};

const POSTERS = {
  "2-1": { src: `${BASE}/images/lecon-2-1.webp`, width: 1536, height: 1024, alt: "Poster (in French) “Know myself today to love better tomorrow”: a woman facing her mirror, surrounded by the four temperaments, the four attachment styles and the steps for growing in grace." },
  "2-3": portrait("lecon-2-3", "Poster (in French) for lesson 2.3, “Break the cycle to build differently”: a woman breaks her chains and the red threads of invisible loyalties, control and fear, and walks towards an open gate pointing to truth, healthy boundaries, peace, freedom and maturity."),
  "2-5": portrait("lecon-2-5", "Poster (in French) for lesson 2.5, “Live fully today, love healthily tomorrow”: a serene woman at her desk, surrounded by the three pillars of self-esteem in Christ, the emotional continuum and the keys to a fulfilled single life."),
  "2-6": portrait("lecon-2-6", "Poster (in French) for lesson 2.6, “Forgive to heal, be reconciled to move forward”: a woman freed from her chains, surrounded by the three dimensions of forgiveness, what forgiveness is not and four keys to keeping a free heart."),
  "2-7": portrait("lecon-2-7", "Poster (in French) for lesson 2.7, “In Christ, every chain can be broken”: a woman breaks her chains as she raises her hand towards the light, surrounded by the four doors to close and the biblical protocol of freedom."),
} satisfies Record<string, Poster>;

/* ───────────────────────────── Lesson 2.1 ───────────────────────────── */

const lesson21: Lesson = {
  number: "2.1",
  slug: "2-1",
  title: "Know yourself to love better",
  image: { src: POSTERS["2-1"].src, card: card("lecon-2-1"), alt: POSTERS["2-1"].alt },
  poster: POSTERS["2-1"],
  pdf: `${BASE}/pdf/lecon-2-1-se-connaitre-pour-mieux-aimer.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "The mirror we avoid",
    blocks: [
      { type: "p", text: "We spend a lot of time watching other people, analysing their behaviour, trying to understand them or change them. But there is one thing we rarely do with the same rigour: look at ourselves in an honest mirror." },
      { type: "p", text: "Yet if one single truth were to guide this whole of pillar 2, it would be this one: **you cannot offer what you do not know.** If you do not know how you work — your strengths, your deep needs, your automatic reactions — you will enter every relationship with dangerous blind spots." },
      { type: "p", text: "This lesson is neither a personality test to tick through quickly nor a cold inventory of your characteristics. It is an invitation to discover yourself with kindness, so that you can give yourself better to the other." },
      { type: "authorQuote", text: "Knowing yourself is not a narcissistic quest — it is one of the deepest acts of love you can accomplish for others. For we can only truly love from a place of inner awareness.", author: "Dr. Larry Crabb, Christian psychologist and author" },
    ],
  },
  parts: [
    {
      heading: "The four temperaments — How are you “wired”?",
      blocks: [
        { type: "p", text: "The concept of the four temperaments, inherited from Greek thought and deeply revisited by modern Christian psychology, remains one of the most accessible tools for understanding yourself. It is not a box to lock you in, but a map for reading your natural tendencies." },
        { type: "p", text: "Every human being is a unique blend of these four temperaments, usually with one or two that dominate:" },
        {
          type: "callout", tone: "neutral", title: "The Sanguine — The enthusiast",
          blocks: [{ type: "points", items: [
            { lead: "In a word:", text: "life, warmth, spontaneity." },
            { lead: "Strengths:", text: "communicative, joyful, sociable, expressive. Lights up a room on arrival." },
            { lead: "Challenges:", text: "can lack emotional depth, run from routine, avoid difficult subjects through light-heartedness." },
            { lead: "In love:", text: "looks for closeness, celebration and moments of intense connection. Needs a spouse who values their joy of life without stifling it." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "The Choleric — The leader",
          blocks: [{ type: "points", items: [
            { lead: "In a word:", text: "vision, action, determination." },
            { lead: "Strengths:", text: "decisive, organised, efficient, naturally gifted with authority. Accomplishes what others give up on." },
            { lead: "Challenges:", text: "can be domineering, impatient with others' slowness, uncomfortable with vulnerability." },
            { lead: "In love:", text: "needs respect and clarity. Their biggest marriage project is learning to serve with as much energy as they lead." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "The Melancholic — The deep one",
          blocks: [{ type: "points", items: [
            { lead: "In a word:", text: "depth, sensitivity, excellence." },
            { lead: "Strengths:", text: "analytical, creative, loyal and capable of very deep emotional intimacy. Loves truly and completely." },
            { lead: "Challenges:", text: "a tendency to idealise, to perfectionism, to melancholy and to harsh inner criticism." },
            { lead: "In love:", text: "needs emotional security and a patient spouse who does not take their seasons of withdrawal for rejection." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "The Phlegmatic — The peacemaker",
          blocks: [{ type: "points", items: [
            { lead: "In a word:", text: "peace, stability, faithfulness." },
            { lead: "Strengths:", text: "calm, diplomatic, reliable, an excellent listener. The rock others lean on." },
            { lead: "Challenges:", text: "can avoid conflict to the point of never expressing their own needs, and even pile up silent frustrations." },
            { lead: "In love:", text: "needs a safe space to express themselves. Their main project is learning to state their wishes gently but clearly." },
          ] }],
        },
        { type: "authorQuote", text: "Understanding your natural temperament is like finally having the user manual for your own heart. It lets you stop fighting against what you are, and start sanctifying it.", author: "Dr. Tim LaHaye, pastor and author of *Spirit-Controlled Temperament*" },
      ],
    },
    {
      heading: "Attachment styles — How do you really love?",
      blocks: [
        { type: "p", text: "Attachment theory, developed by the psychiatrist John Bowlby and widely applied by contemporary Christian psychology, teaches us an overwhelming truth: **the way we were loved (or not) in childhood literally programs the way we love as adults.**" },
        { type: "p", text: "There are four main attachment styles. Recognise yourself honestly in one of them:" },
        {
          type: "table",
          head: ["Style", "How it shows up in a relationship", "The inner question that governs it"],
          rows: [
            ["Secure", "Able to give and receive love freely. At ease with intimacy as well as autonomy. Does not panic during disagreements.", "“I am worthy of love and I trust the other.”"],
            ["Anxious", "Constantly seeks reassurance. Reads the other's slightest signals. Afraid of being abandoned and over-invests to “earn” love.", "“Will he/she still love me tomorrow if I don't do everything perfectly?”"],
            ["Avoidant", "Values independence to the extreme. Flees emotional intimacy. Shuts down as soon as the relationship becomes too intense or demanding.", "“If I really let myself be known, I will be hurt.”"],
            ["Disorganised", "Both attracts and pushes away intimacy. Swings between a burning need for love and the terror of being hurt. Often linked to deep trauma.", "“I need you, but you scare me.”"],
          ],
        },
        { type: "authorQuote", text: "The good news for those with an insecure attachment is that attachment style is not a sentence — it is a starting point. With God's grace, appropriate therapy and safe relationships, an anxious or avoidant attachment can become a secure one.", author: "Dr. Tim Clinton, Christian psychologist, president of the *American Association of Christian Counselors*" },
      ],
    },
    {
      heading: "Personality and grace — What God does with who you are",
      blocks: [
        { type: "p", text: "Here is an essential theological clarification so as not to fall into the trap of psychological determinism: knowing your temperament and your attachment style does not condemn you to stay locked inside them. Christian psychology is not fatalistic." },
        { type: "p", text: "It affirms two truths at the same time:" },
        { type: "points", items: [
          { lead: "You are wired in a certain way —", text: "and that architecture was shaped by your nature, your history and your family. Denying it would be blindness." },
          { lead: "God's grace can reshape that wiring —", text: "not by erasing who you are, but by sanctifying what you are, turning your weaknesses into wisdom and your wounds into empathy." },
        ] },
        { type: "authorQuote", text: "God did not save you so that you would become someone else. He saved you so that you would become fully yourself — the version of you that sin, hurt and fear had smothered.", author: "Dr. Henry Cloud, Christian psychologist, author of *Integrity* and *Boundaries in Marriage*" },
      ],
    },
    {
      heading: "Putting it into practice — On the platform and in your conversations",
      blocks: [
        { type: "p", text: "Self-knowledge is not an abstract theory. It has immediate, practical consequences for the way you find your way around Garden of Alliance:" },
        { type: "points", items: [
          { lead: "If you are anxious:", text: "when someone is slow to reply, notice your first reaction. Do you immediately imagine the worst? That is not reality — it is your attachment style talking. Come back to a place of peace before sending another message." },
          { lead: "If you are avoidant:", text: "when a conversation becomes interesting and deep, notice whether you suddenly feel the urge to pull away or cool the exchange down. That is your protective mechanism. Deliberately choose to stay present." },
          { lead: "For every temperament:", text: "be honest in your profile. Present not only your strengths, but also what you are working on. Authenticity filters out the wrong matches and attracts the right ones." },
        ] },
        { type: "authorQuote", text: "The strongest couples are not those who found themselves perfectly compatible from the start. They are those in which both partners knew themselves well enough to know what they brought into the relationship — and what they still had to work on.", author: "Dr. Gary Chapman, pastor and author of *The 5 Love Languages*" },
        {
          type: "callout", tone: "info", title: "To do today",
          blocks: [
            { type: "p", text: "Take a sheet of paper or open a journal. Write in all honesty:" },
            { type: "steps", items: [
              "My dominant temperament is probably… (and this is how it complicates my relationships…)",
              "My attachment style looks most like… (and this is what it triggered in my past relationships…)",
              "The strength of my personality I want to offer my spouse is…",
              "The inner work I need to do before I marry is…",
            ] },
            { type: "p", text: "This journal will be your companion throughout pillar 2. Don't try to make yourself comfortable — try to be true." },
          ],
        },
      ],
    },
  ],
  quizIntro: "Answer these questions to anchor what you have learned about yourself.",
  quiz: [
    {
      question: "Why is self-knowledge essential before looking for a spouse?",
      options: [
        "To appear more interesting in your online profile.",
        "Because you can only offer what you really know and possess; blind spots about yourself become blind spots in the relationship.",
        "To avoid any future conflict with your spouse.",
      ],
      answer: 1,
      explanation: "You cannot give what you do not have. A heart that does not know itself enters a relationship with automatic reactions it does not understand.",
    },
    {
      question: "What does attachment theory teach us about our behaviour in love?",
      options: [
        "That our star sign determines our relationships.",
        "That the way we were loved in childhood programs our emotional responses in adult relationships.",
        "That only Christians have a secure attachment.",
      ],
      answer: 1,
      explanation: "Attachment style is a deep relational imprint — but it can be transformed by grace, self-awareness and safe relationships.",
    },
    {
      question: "Which attachment style is most common in someone who flees intimacy and values independence to the extreme?",
      options: ["The secure style.", "The anxious style.", "The avoidant style."],
      answer: 2,
      explanation: "An avoidant person is not necessarily someone who does not want love — it is often someone who learned that being known is dangerous.",
    },
    {
      question: "According to Christian psychology, are temperament and attachment style a final sentence?",
      options: [
        "Yes, you don't fundamentally change your nature.",
        "No — God's grace can sanctify and reshape these traits, not by erasing the person but by transforming them from within.",
        "It depends on how intensely you pray.",
      ],
      answer: 1,
      explanation: "This is the heart of the Gospel applied to psychology: transformation is possible. Not by willpower alone, but by the grace that renews the mind (Romans 12:2).",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Go back to the table of attachment styles. Without judging yourself, identify which style showed up in your reactions in your last two or three relationships (romantic or even close friendships). Write down two concrete examples of moments when that style took over. Then ask God, in prayer, to show you where this imprint comes from and what he wants to do with it.",
  },
};

/* ───────────────────────────── Lesson 2.2 ───────────────────────────── */

const lesson22: Lesson = {
  number: "2.2",
  slug: "2-2",
  title: "Identifying and healing your wounds",
  image: { src: PILLAR_2_POSTER.src, card: card("lecon-2-2"), alt: "The path of inner healing: broken chains, a mended heart and a woman looking at herself peacefully in a mirror." },
  poster: PILLAR_2_POSTER,
  pdf: `${BASE}/pdf/lecon-2-2-identifier-et-guerir-ses-blessures.pdf`,
  readingMinutes: 12,
  intro: {
    heading: "What you carry without knowing it",
    blocks: [
      { type: "p", text: "There is a truth many Christian singles discover too late — often after their wedding, in the heat of a first serious conflict: **the wounds of our past never stay in the past.** They travel with us. They colour what we see in the other, distort what we hear in their words and amplify the pain of every relational friction." },
      { type: "p", text: "A careless word from a spouse can reawaken a twenty-year-old humiliation. A moment of silence can trigger a panic of abandonment that does not belong to the present scene. Ordinary criticism can bring down a self-esteem built on sand. This is not fragility — it is unhealed humanity." },
      { type: "authorQuote", text: "Untreated wounds of the soul do not disappear with time. They disguise themselves. They take the form of anger, mistrust, over-control or self-abandonment. Identifying the original wound is already beginning to disarm it.", author: "Dr. Dan Allender, Christian psychologist, author of *The Wounded Heart*" },
    ],
  },
  objective: "To help you identify your past wounds and rejections precisely, understand how they act in your relationships, and take the concrete path of healing — not alone, but accompanied.",
  parts: [
    {
      heading: "The eight fundamental wounds",
      blocks: [
        { type: "p", text: "Christian psychology identifies several kinds of wounds that shape our relational behaviour. Here are the eight most common in the context of dating and marriage:" },
        { type: "titledSteps", items: [
          { title: "The wound of rejection", text: "Being or feeling unwanted, excluded, abandoned. It produces a chronic fear of being left behind and a tendency to disappear or to over-perform in order to “earn” a place." },
          { title: "The wound of abandonment", text: "Often linked to an absent parent (physically or emotionally). It creates an anxious attachment and a silent terror that “everyone ends up leaving”." },
          { title: "The wound of humiliation", text: "Having been ridiculed, shamed or put down in public. It produces either excessive submission or aggressive defensiveness, so as never to be vulnerable again." },
          { title: "The wound of betrayal", text: "Having been deceived, lied to or manipulated by someone you trusted. It destroys the ability to trust and produces obsessive control of the other." },
          { title: "The wound of injustice", text: "Having been treated unfairly or rigidly. It produces perfectionism, difficulty receiving grace and blindness to one's own wrongs." },
          { title: "The wound of devaluation", text: "Never having been sufficiently recognised, admired or valued. It produces a chronic need for outside validation and unstable self-esteem." },
          { title: "The wound of romantic rejection", text: "Betrayals, painful break-ups, *ghosting*, infidelity. It places a distorting lens over every new potential partner, who is unconsciously treated as guilty of the exes' crimes." },
          { title: "The wound of violation or traumatic intrusion", text: "Having suffered deep sexual, physical or psychological abuse that destroys the right to bodily integrity and the sense of fundamental safety. It produces chronic hypervigilance, mechanisms of dissociation and a visceral fear of intimacy, making it extremely hard to feel safe in one's own body or with a partner, even a kind one." },
        ] },
        {
          type: "callout", tone: "warning", title: "Clinical & theological insight: the specific gravity of traumatic intrusion (rape or abuse in childhood)",
          blocks: [
            { type: "p", text: "Rape or abuse in childhood is not limited to one of these categories: it runs through almost all of them at once while being a much deeper wound. Because of its extreme gravity, trauma psychology does not classify it as a mere relational wound, since it involves a bodily intrusion that destroys the very notion of fundamental safety." },
            { type: "p", text: "**Traumatic intrusion is particularly intertwined with three major wounds:**" },
            { type: "points", items: [
              { lead: "Betrayal:", text: "the abuser is often someone close whom the child trusted or who should have protected them, which fundamentally breaks the ability to rely on others." },
              { lead: "Humiliation:", text: "abuse places an extremely heavy toxic shame on the victim and a feeling of defilement that has nothing to do with their own actions." },
              { lead: "Injustice:", text: "it is the outright theft of innocence, creating a relationship with the world in which one's surroundings feel dangerous and chaotic." },
            ] },
          ],
        },
        {
          type: "callout", tone: "warning", title: "An essential methodological note",
          blocks: [
            { type: "p", text: "While ordinary relational wounds can be accompanied effectively by a life coach or a mentor, **traumatic intrusion (sexual abuse, serious violence) absolutely requires prior or simultaneous care from a clinical therapist specialised in psychotrauma** (EMDR, specialised therapy). The coach then steps in to support relational rebuilding and the plan for a couple." },
          ],
        },
        { type: "authorQuote", text: "It is not the wound itself that defines your relational future. It is the decision you make — or refuse to make — to look it in the face and allow it to be transformed by grace.", author: "Dr. John Townsend, Christian psychologist, co-author of *Boundaries in Marriage*" },
      ],
    },
    {
      heading: "How the wound acts in your relationships",
      blocks: [
        { type: "p", text: "An unhealed wound works like an oversensitive alarm. In calm situations you don't hear it. But as soon as a trigger wakes it, it rings at full volume — far beyond what the real situation warrants." },
        { type: "p", text: "Concrete examples of relational triggers on a dating platform:" },
        { type: "points", items: [
          { lead: "A profile that stops replying after several interesting exchanges", text: "→ reactivates the **wound of abandonment**." },
          { lead: "A partner who questions one of your opinions", text: "→ reactivates the **wound of humiliation**." },
          { lead: "Discovering an inconsistency in what the other says", text: "→ reactivates the **wound of betrayal**." },
          { lead: "A promising relationship that ends abruptly", text: "→ reactivates the **wound of romantic rejection**." },
        ] },
        { type: "p", text: "The problem is not that these reactions exist — it is that they steer our behaviour *in our place*, without our being aware of it." },
        {
          type: "worksheet",
          title: "Identifying my wounds and rejections",
          intro: "Take 30 minutes somewhere quiet. Answer as honestly as you can, without judging yourself. There are no right or wrong answers — only your truth.",
          sections: [
            { title: "Section 1 — My founding relational story", items: [
              "How would you describe the relationship between your parents? (Stable / Conflictual / Cold / Absent / Loving but hurtful)",
              "Which emotion dominated the atmosphere of your childhood home?",
              "Have you ever felt that you had no place, that you were not wanted, or that you had to earn your parents' love? Describe.",
            ] },
            { title: "Section 2 — The relational wounds I recognise", intro: "Tick the wounds you recognise in yourself, then note for each one a memory or a specific situation in which it showed up:", items: [
              "**Rejection** — Memory:",
              "**Abandonment** — Memory:",
              "**Humiliation** — Memory:",
              "**Betrayal** — Memory:",
              "**Injustice** — Memory:",
              "**Devaluation** — Memory:",
              "**Romantic rejection** — Memory:",
              "**Violation / traumatic intrusion** — Memory:",
            ] },
            { title: "Section 3 — My relational triggers", items: [
              "In my past relationships, which situation most often made me lose my temper or shut down emotionally?",
              "Which phrase or behaviour of the other hurts me every time, even when it is probably not intended?",
              "In an argument, my automatic reaction is to (circle): run away · attack · give in · shut down · over-explain · cry · hurt back.",
            ] },
            { title: "Section 4 — The impact on my search for a spouse", items: [
              "Do I notice behaviours or profiles that consistently attract me and always turn out to be problematic? Which ones?",
              "What am I unconsciously trying to “repair” or to “get” in a romantic relationship that I did not have in childhood?",
              "If my main wound did not exist, how would I be different in a relationship?",
            ] },
          ],
        },
      ],
    },
    {
      heading: "A practical guide to the path of healing",
      blocks: [
        { type: "p", text: "Identifying your wound is a victory. But identification alone does not heal — just as naming a fracture does not mend it. The path of healing is an active process, walked step by step." },
        { type: "titledSteps", items: [
          { title: "Acknowledge and name the wound before God", text: "The first step is spiritual. Bring your wound in prayer, not to “be healed immediately”, but to stop carrying it alone. Psalm 34:18 says: *“The LORD is near to those who have a broken heart.”* He does not ask you to have repaired your wound before coming to him — he asks you to come with it." },
          { title: "Trace the path of the wound (its origins)", text: "With the worksheet above in hand, honestly trace the source of each wound you identified. Who was involved? How old were you? What did you conclude about yourself and about others at that moment? That conclusion (“I don't deserve love”, “men/women always end up leaving”) is often the real enemy — not the event itself." },
          { title: "Write a letter you will not send", text: "Write a letter to the person who hurt you — parent, ex, friend, etc. Filter nothing. Say everything you were never able to say. It is not meant to be sent, but to bring out what you carry inside. Burning or tearing up the letter afterwards can be a powerful symbolic act of release." },
          { title: "Choose forgiveness as an act of release", text: "Forgiveness is not an absolution of what was done. Nor is it a feeling. It is a deliberate decision to free yourself from the weight of the debt you hold against someone. Henry Cloud writes: *“To forgive is to give up the hope of a different past.”* It is an act of inner sovereignty, not of weakness." },
          { title: "Replace the wounded belief with a truth about your identity", text: "For each toxic conclusion you drew from your wound (“I'm not good enough”, “nobody stays”), find the truth of Scripture that contradicts it. *“God created man in his own image”* (Genesis 1:27). *“I will never leave you, nor will I forsake you”* (Hebrews 13:5). Repeat these truths until they move from your head into your heart — this is the renewing of the mind of Romans 12:2 in action." },
          { title: "Practise the new response deliberately", text: "Inner healing must translate into new behaviour. Each time a trigger shows up, pause and deliberately choose a response different from your usual reflex. It takes repeated practice — like rehabilitation after a physical injury." },
        ] },
        {
          type: "callout", tone: "neutral", title: "The indispensable role of the life coach or mentor",
          blocks: [
            { type: "p", text: "The path of inner healing can be undertaken alone. But it should not be. There is a fundamental limit to self-therapy: you cannot be both the patient and the surgeon at the same time. Blind spots about ourselves are blind precisely because we cannot see them." },
            { type: "p", text: "A Christian life coach or an experienced mentor in the faith plays a role no one else can:" },
            { type: "points", items: [
              { lead: "They see you from the outside.", text: "They spot the patterns you cannot see yourself because you are inside them." },
              { lead: "They name things without judging.", text: "They create a safe space where you can voice your wounds without shame and receive a kind but honest perspective." },
              { lead: "They hold you accountable.", text: "Growth without accountability is slow. A coach asks you the right questions, reminds you of your commitments and celebrates your progress with you." },
              { lead: "They pray with you.", text: "The spiritual dimension of healing is irreplaceable, and a good Christian coach knows when prayer is more powerful than method." },
              { lead: "They know their limits.", text: "A good coach also knows when to refer you to a Christian therapist or *counselor* if the wound goes beyond the scope of coaching." },
            ] },
            { type: "p", text: "On Garden of Alliance, we strongly encourage you to connect with a coach or mentor from the community before or during your dating journey. It is not a sign of weakness — it is the mark of mature emotional and spiritual intelligence." },
          ],
        },
        { type: "authorQuote", text: "No one really heals alone. We were created for community — and healing happens where someone else is brave enough to enter our pain with us.", author: "Dr. Larry Crabb, Christian psychologist, author of *Connecting*" },
        {
          type: "callout", tone: "info", title: "Your next concrete step",
          blocks: [
            { type: "p", text: "Don't let this lesson stay in your head. Starting today:" },
            { type: "steps", items: [
              "Complete the identification worksheet above (take the time you need).",
              "Identify your main wound and the toxic conclusion it led you to draw about yourself.",
              "Find a biblical truth that directly contradicts that conclusion and write it on a visible sticky note.",
              "Seriously consider contacting a trusted coach or mentor to walk with you.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Answer these questions to check your understanding of the path of healing.",
  quiz: [
    {
      question: "Why are past wounds so dangerous in a romantic relationship?",
      options: [
        "Because they stop you from dating someone different from your ex.",
        "Because they act like an oversensitive alarm that distorts how we perceive the present and steers our reactions in our place.",
        "Because they make a person too emotional to marry.",
      ],
      answer: 1,
      explanation: "An unhealed wound never stays in the past — it travels and projects itself onto present situations and people.",
    },
    {
      question: "What does forgiveness really represent on the path of healing?",
      options: [
        "A way of saying that what happened was acceptable.",
        "A feeling you patiently wait to experience naturally one day.",
        "A deliberate decision to free yourself from the weight of the debt, regardless of the emotions of the moment.",
      ],
      answer: 2,
      explanation: "Forgiveness is an act of sovereignty, not a feeling. It frees us before it frees the other — often without the other even knowing.",
    },
    {
      question: "Why does a coach or mentor play an irreplaceable role in inner healing?",
      options: [
        "Because they know the Bible better than we do.",
        "Because you cannot be both the patient and the surgeon at the same time — our blind spots are invisible to us by definition.",
        "Because they tell us what to do in our romantic choices.",
      ],
      answer: 1,
      explanation: "A coach's kind outside view makes it possible to see what cannot be seen from within, and to go further, faster.",
    },
    {
      question: "Of the eight wounds identified in the lesson, which one typically produces a chronic need for outside validation?",
      options: ["The wound of betrayal.", "The wound of injustice.", "The wound of devaluation."],
      answer: 2,
      explanation: "Someone who was never sufficiently recognised tries to fill that gap in adult relationships, often by disappearing or over-performing in order to be loved.",
    },
  ],
  reflection: {
    title: "Personal challenge",
    prompt: "As you completed the identification worksheet, which revelation about yourself was the hardest to accept? What does that revelation tell you about the spouse you have unconsciously been looking for until now? And about the spouse you truly need?",
  },
};

/* ───────────────────────────── Lesson 2.3 ───────────────────────────── */

const lesson23: Lesson = {
  number: "2.3",
  slug: "2-3",
  title: "Breaking with toxic and family relationship patterns",
  image: { src: POSTERS["2-3"].src, card: card("lecon-2-3"), alt: POSTERS["2-3"].alt },
  poster: POSTERS["2-3"],
  pdf: `${BASE}/pdf/lecon-2-3-la-rupture-avec-les-schemas-toxiques.pdf`,
  readingMinutes: 10,
  intro: {
    heading: "The invisible inheritance and the trap of relational “déjà vu”",
    blocks: [
      { type: "p", text: "Have you ever had the troubling feeling of rewriting the same love story with different faces? Of always ending up with people who are unavailable, emotionally distant, controlling or dependent? Or of realising with dismay that you are reproducing in your relationships the very flaws or conflicts you hated in your own parents?" },
      { type: "p", text: "This is neither bad luck nor a spiritual fate to be endured: it is the unconscious action of **toxic relationship patterns** and **invisible family loyalties**. We often enter adulthood wearing “relational glasses” shaped by our parents' model and by the roles we were given in childhood." },
      { type: "p", text: "God's Word recognises this transmission across generations while calling us to freedom. 1 Peter 1:18 tells us we were redeemed from *“the useless way of life handed down from your fathers”*. Marriage and couple relationships under the Covenant of grace are not meant to prolong the dysfunctions of the past, but to found a new culture of the kingdom." },
      { type: "authorQuote", text: "Until you make the unconscious conscious, it will direct your relational life and you will call it fate or the will of God.", author: "Dr. Tim Clinton, Christian psychologist and president of the AACC" },
    ],
  },
  objective: "To give you the psychological and spiritual tools to identify your invisible family loyalties, unmask your repeated relational traps, break the cycle of toxic patterns, and establish a healthy emotional and spiritual independence before you commit to marriage.",
  parts: [
    {
      heading: "Invisible loyalties and inherited family patterns",
      blocks: [
        { type: "p", text: "Systemic and family therapies show that every family works as a system with unwritten rules, taboos and underlying loyalties. As children, in order to be loved, accepted or to survive within the family ecosystem, we develop **invisible loyalties**. An invisible loyalty is an unconscious commitment to repeat a behaviour, suffer from the same lack or adopt the same posture so as not to “betray” one's clan." },
        { type: "p", text: "**The 4 childhood roles that follow single people:**" },
        { type: "points", items: [
          { lead: "The Rescuer / the Parentified child:", text: "a child who had to comfort a sad parent, regulate the adults' emotions or carry the household's responsibilities. **As a single adult:** attracted only to wounded people who need to be “fixed” or rescued." },
          { lead: "The Scapegoat:", text: "a child who carried the blame for the home's dysfunctions. **As a single adult:** always expects to be rejected, sabotages themselves as soon as a relationship goes well because happiness feels abnormal." },
          { lead: "The Invisible child / the Self-effacing one:", text: "a child who learned to ask for nothing and not to be a bother so as not to add to the family's burden. **As a single adult:** unable to express their needs, gives way to the partner, accepts crumbs of attention." },
          { lead: "The Hero / the Over-achiever:", text: "a child whose worth depended solely on successes and the honour brought to the family. **As a single adult:** approaches dating as a competition, looks for a “trophy” partner or runs from vulnerability for fear of being seen through." },
        ] },
        { type: "authorQuote", text: "You don't really leave your family of origin by moving out physically. You leave it when you stop unconsciously carrying out its invisible mandates and define your own identity in Christ.", author: "Dr. Henry Cloud, psychologist and author of *Boundaries*" },
      ],
    },
    {
      heading: "The 5 repeated relational traps (toxic patterns)",
      blocks: [
        { type: "p", text: "When these childhood roles and wounds are not dealt with, they crystallise into repeated relationship patterns in one's love life:" },
        { type: "titledSteps", items: [
          { title: "The trap of choosing the unavailable", text: "Systematically becoming attached to people who are married, emotionally distant, uncertain or living on the other side of the world. It unconsciously allows you to avoid real intimacy while replaying the original rejection." },
          { title: "The trap of the rescuer syndrome (codependency)", text: "Confusing love with pity or rescue. Believing that under our love the toxic, unfaithful or unstable partner will magically change." },
          { title: "The trap of anxious submission", text: "Abandoning your values, your boundaries and your identity to keep the other. A panicked fear of saying “no” in case you are left." },
          { title: "The trap of hyper-independent avoidance", text: "Finding a deal-breaking flaw in every suitor as soon as the relationship becomes serious, in order to flee before being vulnerable." },
          { title: "The trap of repeating the toxic parental model", text: "Marrying someone who has exactly the destructive traits of your father or mother (anger, control, silence, manipulation…) in the unconscious hope of finally “winning” the love you did not have as a child." },
        ] },
        { type: "authorQuote", text: "Choosing a spouse to repair your childhood is a guarantee of turning your marriage into a battlefield. Marriage is not a rehabilitation centre for your past.", author: "Dr. Dan Allender, Christian author and specialist in relational trauma" },
        {
          type: "worksheet",
          title: "Diagnosing loyalties and relationship patterns",
          intro: "Answer with complete sincerity to bring to light the invisible patterns that govern your romantic choices.",
          sections: [
            { title: "Section 1 — Analysing my parents' marriage model", items: [
              "How did your parents handle conflict? (Shouting, punishing silences, avoidance, domination, respectful dialogue…)",
              "Which sentence would sum up the vision of marriage your family passed on? (“You can't trust anyone”, “Marriage is a trap”, “Men/women always end up betraying you”…)",
              "Which role did you play in your childhood? Tick the most dominant one: the Rescuer / Parentified child (mediator between parents, emotional support) · the Scapegoat (carrier of the family's problems) · the Self-effacing / Invisible child (discreet, asks for nothing) · the Over-achiever / Hero (validated by success).",
            ] },
            { title: "Section 2 — Identifying your repeated relationship pattern", intro: "Tick the statements that describe your relationship history:", items: [
              "I am mainly attracted to people I need to help, encourage or spiritually “carry”.",
              "As soon as someone is really interested in me and shows they are available, they lose their appeal in my eyes.",
              "I regularly accept disrespectful behaviour so as not to spoil a chance of being in a relationship.",
              "My friends often tell me: “You always pick the same kind of person!”",
              "I am afraid of being smothered or controlled if I commit fully.",
            ] },
            { title: "Section 3 — Spotting the ties of invisible loyalty", items: [
              "Is there a taboo, a suffering or a recurring marital failure in your family (repeated divorces, unwanted singleness, infidelity) that you unconsciously fear avoiding or, on the contrary, repeating?",
              "Do you feel that succeeding in your married life, or going beyond your parents' level of marital happiness, would be a kind of guilt or betrayal towards them?",
            ] },
          ],
        },
      ],
    },
    {
      heading: "A practical guide to breaking toxic patterns",
      blocks: [
        { type: "p", text: "Getting out of a repeated pattern requires a deliberate act of spiritual, emotional and behavioural rupture. God gives us the authority to stop the flow of negative inheritances." },
        { type: "titledSteps", items: [
          { title: "Become aware of the pattern and put it into words", text: "You cannot fight an enemy you refuse to name. Write your recurring pattern clearly on paper: *“Until now, I have tended to choose unavailable partners for fear of really being seen and rejected.”* Simply putting it into words takes away the pattern's hypnotic power." },
          { title: "Apply Genesis 2:24: “leaving” spiritually and emotionally", text: "*“Therefore a man will leave his father and his mother…”* Leaving does not mean cutting ties in hatred, but achieving differentiation of self. Declare in prayer that you renounce the expectations, verbal curses, invisible loyalties and dysfunctional marriage models of your family line." },
          { title: "Redefine your selection criteria (the renewed attraction list)", text: "If your “romantic radar” was distorted by your past, what naturally attracts you (the toxic spark) is often a danger. Rewrite the criteria for your future spouse not on the basis of impulsive passion, but on emotional safety, spiritual maturity, respect and inner peace." },
          { title: "Set firm boundaries from the first exchanges", text: "Toxic patterns slip in through the absence of boundaries. Learn to say no to the first warning signs (*red flags*): disrespect, inconsistencies, aggressive flirting, emotional unavailability. Don't negotiate your values to keep someone around." },
          { title: "Pray for the breaking of past toxic soul ties", text: "If you have had intimate relationships or deep emotional commitments with toxic or manipulative people, it is right to formally cut these soul ties in prayer in the name of Jesus, claiming the cleansing of your emotions and your memory." },
        ] },
        {
          type: "callout", tone: "neutral", title: "Being accompanied by a coach or mentor in breaking patterns",
          blocks: [
            { type: "p", text: "**Why does breaking family and toxic patterns often require mentoring or coaching?**" },
            { type: "p", text: "Because repeated patterns create a “toxic comfort zone”. Even if a behaviour makes us suffer, it is familiar. Choosing a healthy partner can at first seem “boring” to someone used to an emotional roller coaster." },
            { type: "p", text: "The Garden of Alliance coach or mentor steps in to:" },
            { type: "points", items: [
              { lead: "Act as a relational decoder:", text: "they help you analyse profiles and exchanges objectively without letting your old reflexes take over." },
              { lead: "Confirm warning signs (red flags) and safety signs (green flags):", text: "they help you tell true love from manipulative seduction." },
              { lead: "Walk with you through the discomfort of the new:", text: "supporting you as you learn to set boundaries for the first time." },
              { lead: "Hold you accountable to your commitments:", text: "keeping you from falling back into the arms of a toxic ex in moments of loneliness." },
            ] },
          ],
        },
        { type: "authorQuote", text: "Relational freedom does not mean having no past, but no longer letting the past dictate whom you allow into your future.", author: "Dr. John Townsend, Christian psychologist" },
        {
          type: "callout", tone: "info", title: "Your roadmap for this lesson",
          blocks: [
            { type: "steps", items: [
              "Carefully complete the worksheet above.",
              "Identify your most obvious recurring relationship pattern.",
              "Write a prayer of renunciation and deliverance concerning negative family loyalties.",
              "Share this diagnosis with your coach or mentor to lock in your new selection criteria.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Answer these questions to check your understanding of relationship patterns.",
  quiz: [
    {
      question: "What is an “invisible loyalty” in a family context?",
      options: [
        "A notarised contract inherited from your grandparents.",
        "An unconscious commitment to repeat a family dysfunction or lack so as not to feel you are betraying your clan.",
        "A biblical obligation to obey your parents all your life without reservation.",
      ],
      answer: 1,
      explanation: "Invisible loyalty pushes us to reproduce failures or toxic postures out of unconscious solidarity with our family of origin.",
    },
    {
      question: "What is the main danger of the “Rescuer / Parentified child” role for a single adult?",
      options: [
        "They become too selfish in their choices.",
        "They are attracted only to people who need fixing or rescuing, confusing love with pity.",
        "They refuse to pray for their future spouse.",
      ],
      answer: 1,
      explanation: "Someone who had to carry their parents will unconsciously look for a dependent or wounded partner, creating an unbalanced and exhausting relationship.",
    },
    {
      question: "Why does someone used to toxic relationships sometimes find a healthy person “boring” at first?",
      options: [
        "Because healthy people lack spirituality.",
        "Because the brain has linked love with anxiety and an emotional roller coaster; the peace of safety is wrongly perceived as a lack of passion.",
        "Because healthy people don't know how to communicate.",
      ],
      answer: 1,
      explanation: "The familiarity of drama creates a false sense of intensity. Unlearning this reflex is essential to appreciating a peaceful, constructive love.",
    },
    {
      question: "What does “leaving father and mother” according to Genesis 2:24 really mean for a single adult?",
      options: [
        "Cutting off all contact and rejecting your parents.",
        "Moving to another city.",
        "Achieving your emotional and spiritual differentiation by renouncing dysfunctional models and loyalties to found your own culture in Christ.",
      ],
      answer: 2,
      explanation: "Leaving is a process of autonomy and overall maturity that frees the single person to build a home aligned with the Kingdom.",
    },
  ],
  reflection: {
    title: "Personal challenge",
    prompt: "Looking at your past relationships, which *red flag* (warning sign) have you most often ignored in the people who attracted you? What concrete decision are you making today never again to close your eyes to that sign?",
  },
};

/* ───────────────────────────── Lesson 2.4 ───────────────────────────── */

const lesson24: Lesson = {
  number: "2.4",
  slug: "2-4",
  title: "Clarifying your expectations, non-negotiable values and emotional needs",
  image: { src: PILLAR_2_POSTER.src, card: card("lecon-2-4"), alt: "A woman looks at herself in a mirror on which her strengths, needs, emotions, values and dreams are written." },
  poster: PILLAR_2_POSTER,
  pdf: `${BASE}/pdf/lecon-2-4-clarifier-ses-attentes-valeurs-et-besoins.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "The danger of illusions and confused criteria",
    blocks: [
      { type: "p", text: "One of the major causes of disappointment or failure in Christian dating is a lack of clarity about three fundamental pillars: **emotional needs, non-negotiable values and relational expectations.** Many single people approach dating with a confused mix of superficial criteria (height, style, social status) and unrealistic expectations (that the other will read their thoughts or repair their wounds), while being unable to identify their true deep emotional needs." },
      { type: "verse", text: "Through wisdom a house is built; by understanding it is established; by knowledge the rooms are filled with all rare and beautiful treasure.", ref: "Proverbs 24:3-4" },
      { type: "p", text: "Building a home does not begin with a blind romantic spark, but with a clear understanding of what makes up the spiritual and emotional structure of your life project." },
      { type: "authorQuote", text: "If you don't know exactly what you need to be fulfilled and safe in a relationship, you will accept anything for fear of being alone, or you will reject excellent partners over insignificant details.", author: "Dr. Gary Chapman, author of *The 5 Love Languages*" },
    ],
  },
  objective: "To guide you step by step in clarifying your essential emotional needs, rigorously establishing your non-negotiable values, and dismantling fantasised expectations, so you can approach the search for a spouse with sharpened discernment.",
  parts: [
    {
      heading: "Identifying and ranking your deep emotional needs",
      blocks: [
        { type: "p", text: "An emotional need is not a whim or a selfish demand; it is an emotional reservoir essential to human flourishing. Dr. Willard Harley (author of *His Needs, Her Needs*) showed that most marital conflicts arise from major emotional needs that are ignored or neglected." },
        { type: "p", text: "**The 5 great recurring emotional needs:**" },
        { type: "titledSteps", items: [
          { title: "The need for affection and tenderness", text: "Feeling surrounded, valued and reassured by gestures, kind words and an attentive presence." },
          { title: "The need for communication and emotional sharing", text: "Having a partner with whom to share deeply about your thoughts, emotions, plans and faith without fear of being judged." },
          { title: "The need for honesty and complete transparency", text: "Feeling completely safe thanks to constant truthfulness, with no secrets or grey areas." },
          { title: "The need for support and encouragement in your calling", text: "Having a spouse who believes in your gifts, supports your vision and lifts you up instead of slowing you down or competing with you." },
          { title: "The need for shared responsibility and security", text: "Being able to count on your spouse's reliability in organising daily life, running the home and, later, raising children." },
        ] },
        { type: "authorQuote", text: "Knowing your major emotional needs means knowing what fuel your heart needs to run. Claiming you need nothing is a false humility that leads to resentment.", author: "Dr. Les Parrott, psychologist and co-author of *Saving Your Marriage Before It Starts*" },
      ],
    },
    {
      heading: "Establishing your non-negotiable values",
      blocks: [
        { type: "p", text: "A non-negotiable value is a spiritual, moral or existential life principle on which no compromise is possible without damaging your conscience or your alignment with God (2 Corinthians 6:14)." },
        { type: "p", text: "**The difference between non-negotiables and secondary preferences:**" },
        {
          type: "callout", tone: "neutral", title: "Non-negotiable values — the foundations of the house",
          blocks: [{ type: "points", items: [
            { lead: "Living spiritual alignment:", text: "an active personal faith in Christ, a disciple's walk and not a mere religious label." },
            { lead: "Moral integrity and character:", text: "honesty, respect for boundaries, faithfulness and the ability to admit one's wrongs." },
            { lead: "The vision of family and marriage:", text: "agreement on marriage as an indissoluble sacred covenant, the desire for children and basic principles of upbringing." },
            { lead: "No active, unaddressed dependencies:", text: "no untreated addiction (pornography, substances, gambling, violence) hidden behind promises." },
          ] }],
        },
        {
          type: "callout", tone: "neutral", title: "Secondary preferences — the decoration of the house (flexibility)",
          blocks: [{ type: "points", items: [
            { lead: "Strict physical criteria", text: "(height, clothing style, eye colour)." },
            { lead: "Specific hobbies or pastimes", text: "(liking the same sport, the same music)." },
            { lead: "Initial income level or starting social status", text: "(which can change)." },
          ] }],
        },
        { type: "authorQuote", text: "The tragedy of many singles is that they are inflexible about their secondary preferences (looks, style) and scandalously tolerant about non-negotiable values (character, faith).", author: "Dr. Henry Cloud, author of *Boundaries in Dating*" },
      ],
    },
    {
      heading: "Unmasking and dismantling unrealistic expectations",
      blocks: [
        { type: "p", text: "It is vital to sort a legitimate need from an unrealistic fantasy. The most common toxic expectations among Christian singles:" },
        { type: "points", items: [
          { lead: "The myth of the perfect soulmate:", text: "believing there is a tailor-made person with whom there will never be any disagreement, effort or conflict." },
          { lead: "The saviour / healer spouse syndrome:", text: "expecting your spouse to fill your inner loneliness, repair the past wound of abandonment or replace a deficient parent." },
          { lead: "Relational telepathy:", text: "expecting the other to “guess” our needs automatically without our having to put them clearly into words." },
        ] },
        {
          type: "worksheet",
          title: "The relational clarification matrix",
          intro: "Complete this three-column matrix to structure your discernment rigorously.",
          sections: [
            { title: "Column 1 — My 3 major emotional needs", intro: "Which 3 needs, when unmet, leave you feeling empty or insecure in a relationship?", items: ["First need:", "Second need:", "Third need:"] },
            { title: "Column 2 — My 5 non-negotiable values", intro: "Which 5 absolute principles allow no compromise?", items: ["First value:", "Second value:", "Third value:", "Fourth value:", "Fifth value:"] },
            { title: "Column 3 — My areas of flexibility (preferences)", items: ["On which criteria (physical, cultural, secondary) are you willing to be flexible and open to God's surprise?"] },
          ],
        },
      ],
    },
    {
      heading: "Expressing your expectations clearly without imposing a straitjacket",
      blocks: [
        { type: "p", text: "Knowing what you want is one thing; knowing how to express it while dating is another." },
        { type: "titledSteps", items: [
          { title: "Communicate through observation and curiosity", text: "Instead of presenting a list of demands as in a job interview, ask open questions about faith, family, forgiveness and life plans in your conversations." },
          { title: "Weigh actions rather than statements of intent", text: "Someone can recite the exact list of your theoretical expectations. Watch their consistency over time, their behaviour under stress and the way they treat those who are weaker." },
        ] },
        {
          type: "callout", tone: "neutral", title: "The coach / mentor's role in clarifying your criteria",
          blocks: [
            { type: "p", text: "**Why debrief your list of criteria with a Garden of Alliance mentor?**" },
            { type: "points", items: [
              { lead: "Check that your expectations are realistic:", text: "helping you notice whether your list of criteria hides an unconscious fear of commitment." },
              { lead: "Arbitrate between non-negotiable and preference:", text: "helping you not to rule out a partner of great spiritual worth over a secondary detail." },
              { lead: "Help you express your needs without aggressiveness:", text: "training you to put your expectations into words from the first months of dating." },
            ] },
          ],
        },
        { type: "authorQuote", text: "Clarifying your expectations is not closing the door to grace; it is preparing the house so that it can welcome a lasting, healthy love.", author: "Dr. Tim Clinton, Christian psychologist" },
        {
          type: "callout", tone: "info", title: "Your roadmap for this lesson",
          blocks: [
            { type: "steps", items: [
              "Complete the relational clarification matrix in the worksheet.",
              "Review your current criteria and move from “absolute requirement” to “flexible preference” everything that is not spiritual or moral.",
              "Share this matrix with your Garden of Alliance mentor for confirmation.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Answer these questions to check your understanding of your criteria.",
  quiz: [
    {
      question: "What is the major difference between a non-negotiable value and a secondary preference?",
      options: [
        "A non-negotiable value concerns character, faith and indissoluble moral alignment; a preference is a detail (looks, hobbies) on which you can be flexible.",
        "Secondary preferences matter more than faith.",
        "There is no difference.",
      ],
      answer: 0,
      explanation: "Being firm on non-negotiable values and flexible on preferences is the mark of relational wisdom.",
    },
    {
      question: "Why is it dangerous to confuse a major emotional need with a whim?",
      options: [
        "Because it stops us from buying what we want.",
        "Because ignoring your deep emotional needs leads you to accept insecure relationships or to nurse resentment in the couple.",
        "Because the Bible forbids having needs.",
      ],
      answer: 1,
      explanation: "Identifying your major emotional needs lets you express what your heart needs in order to flourish calmly.",
    },
    {
      question: "What trap does the “saviour spouse myth” represent?",
      options: [
        "Wanting to marry a doctor.",
        "Expecting your spouse to heal your past wounds and fill your void of identity in God's place.",
        "Praying for your future spouse.",
      ],
      answer: 1,
      explanation: "Only Christ heals and grounds our identity; asking that of a human being creates destructive pressure.",
    },
    {
      question: "How does the Garden of Alliance coach or mentor help in clarifying your criteria?",
      options: [
        "By choosing your spouse for you.",
        "By helping you check the balance of your criteria and tell the essential from the secondary.",
        "By deleting your profile if they disagree.",
      ],
      answer: 1,
      explanation: "A mentor offers the perspective needed so you don't miss relational gems through excessive perfectionism.",
    },
  ],
  reflection: {
    title: "Personal challenge",
    prompt: "Re-reading the list of criteria you had before this lesson, which superficial criterion do you decide to let go of today to make room for God's wisdom?",
  },
};

/* ───────────────────────────── Lesson 2.5 ───────────────────────────── */

const lesson25: Lesson = {
  number: "2.5",
  slug: "2-5",
  title: "Self-esteem, emotional autonomy and a fulfilled single life",
  image: { src: POSTERS["2-5"].src, card: card("lecon-2-5"), alt: POSTERS["2-5"].alt },
  poster: POSTERS["2-5"],
  pdf: `${BASE}/pdf/lecon-2-5-estime-de-soi-et-celibat-epanoui.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "Leaving the “waiting room” mindset",
    blocks: [
      { type: "p", text: "One of the most widespread lies in Christian culture is seeing singleness as a mere “waiting room” or an incomplete parenthesis while waiting for “real life” to begin with marriage. Many singles live their daily lives with a sense of lack, urgency or inferiority, suspending their plans, their happiness and their personal growth until a spouse arrives." },
      { type: "p", text: "God's Word offers a radically different perspective. In 1 Corinthians 7:32-35, the apostle Paul presents singleness not as a punishment, but as a season of extraordinary freedom, undistracted devotion and fullness. Likewise, Psalm 139:14 reminds us that your personal worth is whole, celebrated and sealed in God today:" },
      { type: "verse", text: "I will give thanks to you, for I am fearfully and wonderfully made.", ref: "Psalm 139:14" },
      { type: "authorQuote", text: "If you are not happy and complete as a single person, you will not be as a married one either. Marriage is not the source of joy; it is the place where two joyful people share their fullness.", author: "Dr. Myles Munroe, author of *The Purpose and Power of Singleness*" },
    ],
  },
  objective: "To free you from emotional dependency, strengthen your self-esteem in Christ, and develop true emotional autonomy so that you can live a fulfilled, confident and attractive single life before committing to marriage.",
  parts: [
    {
      heading: "Strengthening self-esteem and dismantling the feeling of incompleteness",
      blocks: [
        { type: "p", text: "Self-esteem is the inner view you hold of your own worth. When it is low, singleness is experienced as a verdict of failure or social rejection." },
        { type: "p", text: "**The 3 pillars of a self-esteem anchored in Christ:**" },
        { type: "titledSteps", items: [
          { title: "The identity of an heir rather than a victim", text: "Claiming your absolute worth based on the price paid at the cross (1 Peter 1:18-19), and not on your relationship status, your age or the presence of suitors." },
          { title: "Dismantling social and church pressure", text: "Refusing misplaced shame or the feeling of being abnormal, often fed by other people's gaze or by poorly worded teaching." },
          { title: "Celebrating your achievements and gifts", text: "Recognising your skills, your inner beauty and the road you have travelled without waiting for a potential spouse's approval." },
        ] },
        { type: "authorQuote", text: "You will never find in a spouse's eyes the self-esteem you have not found in God's eyes.", author: "Dr. Neil Anderson, author of *Freedom in Christ*" },
      ],
    },
    {
      heading: "Developing emotional autonomy rather than dependency",
      blocks: [
        { type: "p", text: "Emotional autonomy is the ability to take charge of and regulate your own emotional life without depending compulsively on someone else's presence to feel good." },
        { type: "p", text: "**The emotional continuum:**" },
        { type: "titledSteps", items: [
          { title: "Emotional dependency (toxicity)", text: "*“Without you, or without a relationship, I am nothing. I am anxious, incomplete and unable to be alone.”* The person looks for a “saviour” spouse." },
          { title: "Defensive independence (isolation)", text: "*“I need nobody, I am enough for myself and I won't let anyone come close.”* It is a protection founded on the fear of being hurt." },
          { title: "Healthy emotional autonomy (maturity)", text: "*“I am at peace, fulfilled and complete in Christ (Colossians 2:10). I am able to be alone without distress, and ready to connect with a mature partner.”*" },
        ] },
        { type: "authorQuote", text: "Only an emotionally autonomous person can enter a healthy interdependence. Otherwise it is not love, it is clinging to survive.", author: "Dr. Henry Cloud, author of *Boundaries in Dating*" },
      ],
    },
    {
      heading: "Practical keys for a fulfilled and fruitful single life",
      blocks: [
        { type: "p", text: "A fulfilled single life is lived, active and intentional. Here is how to turn this season into an accelerator of your calling:" },
        { type: "points", items: [
          { lead: "Invest in your personal life vision:", text: "develop your professional, ministry, artistic or business projects without waiting for marriage to go for it." },
          { lead: "Cultivate a rich network of friends and spiritual companions:", text: "build deep, authentic, brotherly and sisterly friendships that nourish the need to belong and to share." },
          { lead: "Look after your whole well-being (body, soul, spirit):", text: "take care of your physical health, your appearance, your general knowledge and your financial balance." },
          { lead: "Practise generosity and service:", text: "enlarge your heart through community involvement and making a difference in other people's lives." },
        ] },
        {
          type: "worksheet",
          title: "Emotional autonomy check & fullness review",
          intro: "Honestly assess your level of autonomy and fulfilment in your current season.",
          sections: [
            { title: "Section 1 — Assessing your ability to be alone", items: [
              "When you spend a weekend alone with nothing particular planned, which emotion dominates? (Peace / Boredom / Anxiety / Painful loneliness / Gratitude)",
              "Do you catch yourself postponing important projects (travel, buying a home, training…) until “later, when I'm married”? Which ones?",
            ] },
            { title: "Section 2 — Giver or beggar: testing your posture", intro: "Tick the statements that apply to your current posture:", items: [
              "I am at peace with my singleness today, even though I sincerely desire marriage.",
              "I don't need a spouse to know who I am and what I am worth.",
              "I approach dating wanting to share my joy of life and my plans, not to fill a void.",
              "I have solid, fulfilling friendships I can count on day to day.",
            ] },
            { title: "Section 3 — My immediate plan for flourishing", intro: "Name 2 personal activities or goals you decide to launch this month to honour a fulfilled single life:", items: ["First activity or goal:", "Second activity or goal:"] },
          ],
        },
      ],
    },
    {
      heading: "The attractive posture of the fulfilled single person in dating",
      blocks: [
        { type: "p", text: "Nothing is more attractive and magnetic than someone who loves themselves with a healthy love, who is at peace with their present and who radiates the serenity of the Lord." },
        { type: "titledSteps", items: [
          { title: "Move from “beggar for love” to “giver of blessing”", text: "The beggar looks for a spouse to feel reassured; the giver brings a rich life, a stable identity and a contagious peace. It is the giver that mature partners are looking for." },
          { title: "No longer tolerate disrespect for fear of loneliness", text: "Emotional autonomy gives you the most precious power in dating: the ability to leave a toxic or disrespectful relationship calmly, because you know your life is already beautiful with God." },
        ] },
        {
          type: "callout", tone: "neutral", title: "The coach / mentor's role in developing autonomy",
          blocks: [
            { type: "p", text: "**How does a Garden of Alliance mentor walk with you through this stage?**" },
            { type: "points", items: [
              { lead: "Defusing the feeling of emptiness:", text: "helping you identify areas of emotional dependency and replace them with an anchoring in Christ." },
              { lead: "Encouraging you to live your dreams now:", text: "not letting you put your life on hold, but spurring you on in your personal and professional projects." },
              { lead: "Confirming your posture as a giver:", text: "helping you radiate calm confidence in your conversations on the platform." },
            ] },
          ],
        },
        { type: "authorQuote", text: "A fulfilled single life is not denying the desire for marriage; it is refusing to be put on pause while waiting for marriage to come.", author: "Dr. Gary Chapman, author and marriage counsellor" },
        {
          type: "callout", tone: "info", title: "Your roadmap for this lesson",
          blocks: [
            { type: "steps", items: [
              "Fill in the emotional autonomy check in the worksheet.",
              "This week, launch one of the actions in your immediate plan for flourishing.",
              "Repeat every morning: *“I am complete in Christ, my present is blessed and my future is in his hands.”*",
              "Debrief your progress with your Garden of Alliance mentor.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Answer these questions to check your understanding of a fulfilled single life.",
  quiz: [
    {
      question: "According to 1 Corinthians 7:32-35, what is the true nature of the season of singleness?",
      options: [
        "A painful waiting room to get out of as fast as possible.",
        "A season of freedom, undistracted devotion and fullness in God.",
        "A punishment for past wrongs.",
      ],
      answer: 1,
      explanation: "Singleness is a noble and fruitful season God gives to build your life and serve freely.",
    },
    {
      question: "What is healthy emotional autonomy, as opposed to emotional dependency?",
      options: [
        "The ability to live without friends.",
        "The ability to take charge of your emotional life and be at peace alone in Christ, without depending compulsively on a romantic presence.",
        "Rejecting every suitor.",
      ],
      answer: 1,
      explanation: "Emotional autonomy lets you love by choice and out of fullness, not out of fear of emptiness or a need to survive.",
    },
    {
      question: "Why is the giver's posture the most attractive while dating?",
      options: [
        "Because it shows you have a lot of money.",
        "Because a person at peace and complete in Christ radiates a serenity and emotional safety that are very attractive to a mature partner.",
        "Because they need nothing and no one.",
      ],
      answer: 1,
      explanation: "The giver does not smother the other; they bring a rich and inspiring presence.",
    },
    {
      question: "What does emotional autonomy make possible when facing a disrespectful or toxic relationship?",
      options: [
        "Accepting disrespect so as not to end up alone.",
        "Being able to leave the relationship calmly and without panic, knowing your worth and joy remain intact in God.",
        "Sulking for months.",
      ],
      answer: 1,
      explanation: "Emotional autonomy gives you the strength to set firm boundaries and keep the wrong profiles at a distance.",
    },
  ],
  reflection: {
    title: "Personal challenge",
    prompt: "Which project or dream had you put “on pause” while waiting for marriage, and which you decide to set in motion today with God's help?",
  },
};

/* ───────────────────────────── Lesson 2.6 ───────────────────────────── */

const lesson26: Lesson = {
  number: "2.6",
  slug: "2-6",
  title: "Handling forgiveness and making peace with your story",
  image: { src: POSTERS["2-6"].src, card: card("lecon-2-6"), alt: POSTERS["2-6"].alt },
  poster: POSTERS["2-6"],
  pdf: `${BASE}/pdf/lecon-2-6-le-pardon-et-la-reconciliation.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "Forgiveness, the keystone of relational freedom",
    blocks: [
      { type: "p", text: "No one can enter a fulfilled, healthy romantic relationship while remaining chained to the bitterness, resentment and regrets of their past. Carrying an unforgiven offence is like drinking poison and hoping the other person dies. In the context of dating and marriage, bitterness acts like an invisible toxin that contaminates our interpretations, darkens our joy and pushes us to make our current partner pay for wrongs others committed long ago." },
      { type: "p", text: "God's Word makes forgiveness the very foundation of Christian life and maturity. The apostle Paul urges:" },
      { type: "verse", text: "Let all bitterness, wrath, anger, outcry, and slander be put away from you, with all malice. And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.", ref: "Ephesians 4:31-32" },
      { type: "p", text: "Likewise, Colossians 3:13 reminds us that forgiveness is not an optional luxury, but a discipline of freedom." },
      { type: "authorQuote", text: "To forgive is to set a prisoner free and discover that the prisoner was you. As long as you refuse to forgive, you remain chained to the person who hurt you.", author: "Dr. Lewis Smedes, theologian, ethicist and author of *Forgive and Forget*" },
    ],
  },
  objective: "To give you the theological, psychological and practical keys to forgive those who have hurt you, make peace with your own story (your past choices, your failures and the time you see as “lost”), and close the door on bitterness for good so you can enter pillar 3 free and light.",
  parts: [
    {
      heading: "What forgiveness is and what it is not",
      blocks: [
        { type: "p", text: "The greatest obstacle to forgiveness lies in confusion about what it really is. Let us clear up the major misunderstandings." },
        { type: "p", text: "**What forgiveness is not:**" },
        { type: "points", items: [
          { lead: "It is not forgetting or minimising the offence:", text: "forgiving does not mean pretending nothing happened or that the injustice was not serious." },
          { lead: "It is not excusing the inexcusable:", text: "forgiving does not make the act acceptable or legitimate." },
          { lead: "It is not automatic reconciliation:", text: "forgiveness depends on you alone (a one-sided act); reconciliation requires the other's sincere repentance and change of behaviour (a two-sided act). You can forgive someone without ever letting them back into your life if they remain dangerous or toxic." },
          { lead: "It is not a vague feeling:", text: "forgiveness is a decision of the will, not a spontaneous emotion. You choose to forgive before you feel the peace of it." },
        ] },
        { type: "p", text: "**What forgiveness is:**" },
        { type: "p", text: "Forgiveness is a sovereign act by which you decide to give up the emotional debt and the right to revenge against the one who offended you, placing the final judgement in God's hands (Romans 12:19)." },
        { type: "authorQuote", text: "To forgive is to give up the hope of a different past. It is accepting what was, ceasing to wait for apologies that may never come, and deciding to build your future today.", author: "Dr. Henry Cloud, psychologist and author of *Boundaries*" },
      ],
    },
    {
      heading: "The 3 dimensions of forgiveness and making peace with your story",
      blocks: [
        { type: "p", text: "To be completely healed, the process of forgiveness must be applied in three complementary directions:" },
        { type: "titledSteps", items: [
          { title: "Forgiving your family of origin and figures of authority", text: "Forgiving your parents for their limits, their absences, their hurtful words or their inability to give you the love you needed. Releasing them from the parental debt is the condition for no longer looking for a “perfect parent” in your spouse." },
          { title: "Forgiving former partners and romantic disappointments", text: "Forgiving the betrayals, infidelity, abandonment, manipulation or *ghosting* suffered in your past relationships. Breaking the tie of bitterness keeps you from treating your future spouse as guilty of wrongs committed by others." },
          { title: "Forgiving yourself and making peace with your own journey", text: "This is often the hardest forgiveness. Forgiving yourself for bad decisions in the past, toxic relationships prolonged out of naivety, moral failures, or the feeling of having “wasted your best years”. God does not regret your story: Joel 2:25 promises that he restores the years the locusts have eaten." },
        ] },
        { type: "authorQuote", text: "You cannot embrace the future God has for you if your hands are still busy clutching the daggers of bitterness against your past.", author: "Dr. Dan Allender, specialist in healing from trauma" },
        {
          type: "worksheet",
          title: "The forgiveness protocol & the letter of release",
          intro: "Take some time apart to fill in this protocol of emotional release.",
          sections: [
            { title: "Section 1 — An inventory of unresolved offences", items: [
              "Name the person towards whom you still feel bitterness, resentment or anger (parent, ex, friend, yourself):",
              "What specific debt did the offence create? (“He stole my innocence”, “She betrayed me”, “I blame myself for losing 5 years”…)",
            ] },
            { title: "Section 2 — The declaration of debt release (an act of the will)", intro: "Complete and recite this prayer of renunciation:", items: [
              "“In the name of Jesus Christ and by a deliberate act of my will, I choose today to forgive [name of the person]. I give up my right to take revenge, I give up waiting for them to make amends, and I lay their debt at the foot of the cross. I claim the cleansing of my emotions and the complete freedom of my heart.”",
              "I have spoken this prayer of decision aloud before God.",
            ] },
            { title: "Section 3 — Making peace with my own journey", items: [
              "Write a sentence of self-compassion and forgiveness towards yourself for your past mistakes:",
            ] },
          ],
        },
      ],
    },
    {
      heading: "4 steps to keep a pure heart after forgiving",
      blocks: [
        { type: "p", text: "Forgiveness is an initial decision that must be sustained by a discipline of guarding the heart:" },
        { type: "titledSteps", items: [
          { title: "Refuse to “revisit the debt” when the memory returns", text: "When the memory of the wound resurfaces, remind your mind: *“I have already forgiven this debt at the cross. I am not reopening this file.”* Don't confuse remembering the event with the presence of resentment." },
          { title: "Pray for blessing on the offender (Matthew 5:44)", text: "This is the ultimate test of healing. Asking God to bless the person who hurt you dissolves the last traces of bitterness and releases a supernatural peace in your soul." },
          { title: "Set healthy boundaries without holding on to hatred", text: "Forgiving a former partner does not mean getting back in touch or inviting them into your daily life. You can forgive with all your heart while keeping a watertight boundary to protect your peace." },
          { title: "Celebrate the restoration of your story (Joel 2:25)", text: "Look at your past not as a heap of ruins, but as the soil in which God forged your maturity, your compassion and your discernment for your future marriage." },
        ] },
        {
          type: "callout", tone: "neutral", title: "The coach / mentor's role in completing forgiveness",
          blocks: [
            { type: "p", text: "**Why debrief this closing stage of pillar 2 with your Garden of Alliance mentor?**" },
            { type: "points", items: [
              { lead: "Acting as a kind witness:", text: "offering you a setting of complete confidentiality in which to voice the most buried wounds without fear of judgement." },
              { lead: "Defusing false feelings of guilt:", text: "helping you tell the difference between real, completed forgiveness and the natural process of emotional scarring." },
              { lead: "Confirming your final readiness for pillar 3:", text: "making sure with you that your heart is completely free, lightened and ready to welcome love without the shadow of the past." },
            ] },
          ],
        },
        { type: "authorQuote", text: "Forgiveness is the key that unlocks the door of the relational prison. Once that key is turned, you are no longer a wounded single person trying to heal, but a healed single person ready to build.", author: "Dr. John Townsend, psychologist and author" },
        {
          type: "callout", tone: "info", title: "Closing pillar 2 — Your plan for final release",
          blocks: [
            { type: "steps", items: [
              "Complete the forgiveness protocol and the letter of release above.",
              "Make a symbolic act of release (burn or tear up the sheet of past offences).",
              "Set aside a time of thanksgiving prayer to celebrate the end of pillar 2.",
              "Debrief with your Garden of Alliance mentor before opening the first lesson of pillar 3!",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Answer these questions to check your understanding of forgiveness.",
  quiz: [
    {
      question: "What is the major difference between forgiveness and reconciliation?",
      options: [
        "Forgiveness is two-sided and reconciliation is one-sided.",
        "Forgiveness is a one-sided decision to give up the debt; reconciliation requires the other's repentance and change of behaviour.",
        "There is no difference: forgiving means you must become friends again as before.",
      ],
      answer: 1,
      explanation: "You can forgive someone 100% without ever being reconciled with them if they remain toxic or disrespectful.",
    },
    {
      question: "Why is unforgiven bitterness so dangerous in a new romantic relationship?",
      options: [
        "Because it stops you from travelling.",
        "Because it acts like a toxin that makes us project onto our current partner the wrongs and betrayal of people from the past.",
        "Because it makes a person too talkative.",
      ],
      answer: 1,
      explanation: "Bitterness clouds our view and pushes us to make an innocent spouse pay for the crimes of exes or parents.",
    },
    {
      question: "What does making peace with your own story mean according to Joel 2:25?",
      options: [
        "Regretting your bad decisions every day.",
        "Forgiving yourself and believing that God is able to restore the devoured years by turning our trials into maturity.",
        "Completely forgetting your name and your family.",
      ],
      answer: 1,
      explanation: "God wastes nothing: he reuses the healing of our story to make us a blessing to our future home.",
    },
    {
      question: "How do you know you have truly forgiven someone?",
      options: [
        "When you have total amnesia of the event.",
        "When remembering the event no longer triggers a desire for revenge or hatred, and you can wish them well before God.",
        "When the other person comes to apologise on their knees.",
      ],
      answer: 1,
      explanation: "The memory may remain, but the emotional venom of the debt has been neutralised for good.",
    },
  ],
  reflection: {
    title: "Personal challenge to close pillar 2",
    prompt: "Speak this prayer of thanksgiving: *“Lord, thank you for healing my heart, for freeing me from my past and for the beauty of my worth in Christ. I am ready to enter pillar 3 free and joyful! Amen.”*",
  },
};

/* ───────────────────────────── Lesson 2.7 ───────────────────────────── */

const lesson27: Lesson = {
  number: "2.7",
  slug: "2-7",
  title: "Breaking spiritual ties: witchcraft, curses and generational covenants",
  image: { src: POSTERS["2-7"].src, card: card("lecon-2-7"), alt: POSTERS["2-7"].alt },
  poster: POSTERS["2-7"],
  pdf: `${BASE}/pdf/lecon-2-7-brisement-de-liens-spirituels.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "The reality of spiritual warfare in relational life",
    blocks: [
      { type: "p", text: "While psychology and emotional maturity bring indispensable answers for the restoration of the soul, the Bible reveals that there is also an invisible spiritual dimension that can affect one's love life, freedom and the fulfilment of marriage. Some Christian singles, despite an irreproachable lifestyle, real maturity and an ardent desire to start a family, notice systematic, abnormal or repeated blockages that look like spiritual opposition." },
      { type: "p", text: "God's Word establishes without ambiguity the total victory Jesus Christ won on the cross:" },
      { type: "verse", text: "Christ redeemed us from the curse of the law, having become a curse for us.", ref: "Galatians 3:13" },
      { type: "p", text: "Likewise, Colossians 2:14-15 affirms that he wiped out the handwriting in ordinances that was against us and stripped the principalities and powers. The prophet Balaam himself had to acknowledge:" },
      { type: "verse", text: "Surely there is no enchantment with Jacob; neither is there any divination with Israel.", ref: "Numbers 23:23" },
      { type: "authorQuote", text: "The cross of Jesus Christ has broken the power of every curse. But what Christ accomplished legally on the cross must be appropriated, proclaimed and applied by faith in the believer's life.", author: "Derek Prince, Bible teacher and author of *Blessing or Curse: You Can Choose*" },
    ],
  },
  objective: "To give you biblical discernment to identify any spiritual doors that may be open (ancestral occult practices, words of curse, generational covenants, witchcraft), and to arm you with the authority of the name of Jesus and the blood of the Covenant to proclaim your definitive freedom and enter the plan of marriage with peace.",
  parts: [
    {
      heading: "Understanding where spiritual ties and negative covenants come from",
      blocks: [
        { type: "p", text: "In the spiritual world, a covenant is a sealed agreement that creates rights or legitimate claims until it is formally broken by the blood of a higher covenant — the blood of Jesus." },
        { type: "p", text: "**The 4 main doors through which spiritual claims enter:**" },
        { type: "titledSteps", items: [
          { title: "Family occult and idolatrous practices (generational)", text: "Consulting marabouts, diviners, fetish priests or mediums, taking part in witchcraft rituals or blood pacts made by ancestors. The Bible warns about the iniquity of the fathers, which can cast its shadow over several generations if there is no repentance (Exodus 20:5)." },
          { title: "Spoken curses", text: "Words of rejection, hatred or bewitchment spoken by parents, figures of authority, jealous people or former partners (“You'll never get married”, “No man/woman will ever keep you”…)." },
          { title: "Impure soul ties and past sexual covenants", text: "The sexual act creates a spiritual and bodily union (1 Corinthians 6:16). Relationships with people involved in Satanism, the occult or perversion can transfer chains or spiritual oppression." },
          { title: "Direct attacks of witchcraft and “spirit husbands/wives”", text: "In some cultures or families, incubus/succubus spirits (occult spiritual marriages) seek to keep the single person in emotional captivity, causing suitors' sudden aversion or repeated nightmares." },
        ] },
        { type: "authorQuote", text: "Satan has no legal power over a child of God walking in the truth. But if there is an unrenounced covenant or an occult object that has not been destroyed, the enemy will use that legal right until the believer stands up with the authority of the Word.", author: "Dr. Neil Anderson, author of *The Bondage Breaker*" },
      ],
    },
    {
      heading: "Signs of abnormal spiritual claims",
      blocks: [
        { type: "p", text: "We must not fall into paranoia (blaming every character flaw on the devil), but have sharp spiritual discernment. Here are the signs of a blockage of a spiritual nature:" },
        { type: "points", items: [
          { lead: "The exact repetition of the same relational drama at the same stage:", text: "engagements that break off systematically a few weeks before the wedding for no logical reason." },
          { lead: "A sudden, irrational reaction of aversion or disgust:", text: "a suitor who is very much in love suddenly becomes distant, frightened or aggressive overnight with no prior argument." },
          { lead: "Recurring night attacks:", text: "constant dreams of sexual acts with unknown entities (night marriages), dreams of snakes, dark waters or strange customary ceremonies followed by exhaustion on waking." },
          { lead: "Simultaneous, widespread blockages:", text: "heavy spiritual oppression together with unexplained insomnia, illnesses without a clear medical diagnosis or sudden financial ruin as soon as a plan for a couple begins." },
        ] },
        {
          type: "worksheet",
          title: "Inventory and discernment of spiritual ties",
          intro: "Answer prayerfully and calmly to identify the doors to close in the name of Jesus.",
          sections: [
            { title: "Section 1 — Family history & ancestral occult doors", items: [
              "Has anyone in your family line practised witchcraft or maraboutage, consulted fetishes or fortune-tellers, or belonged to secret brotherhoods?",
              "Have you yourself, in the past (before or after your conversion), consulted fortune-tellers, astrologers or numerologists, or kept strange objects or amulets?",
            ] },
            { title: "Section 2 — Words of curse & soul ties", items: [
              "Do you remember words of bewitchment, rejection or cursing spoken against your love life by relatives or former partners?",
              "Do you feel you are still spiritually tied to a former partner with whom you shared sexuality or secret vows?",
            ] },
          ],
        },
      ],
    },
    {
      heading: "The biblical protocol for breaking ties and deliverance",
      blocks: [
        { type: "p", text: "Spiritual freedom requires neither a complex ceremony nor fear. It rests on the power of the name of Jesus, the blood that was shed and the Word proclaimed in faith." },
        { type: "titledSteps", items: [
          { title: "Identificational and personal repentance (Daniel 9)", text: "Confessing before God the sins of idolatry, witchcraft or immorality of your family line as well as your own past failures. Asking for the blood of Jesus to be applied to wipe away all guilt." },
          { title: "Formal renunciation and cancelling of covenants", text: "Proclaiming aloud with authority: *“In the name of Jesus Christ, I renounce every pact, every customary, occult or unconscious covenant sealed by my ancestors or by myself. I break their power over my love life!”*" },
          { title: "Cutting soul ties and driving out spirits of oppression", text: "Commanding in the name of Jesus every spirit of forced singleness, separation, relational misfortune or “spirit husband/wife” to leave your life for good (Matthew 18:18)." },
          { title: "Physically removing occult objects & sanctification", text: "Throwing away or burning any object, jewellery, amulet, occult book or gift linked to a past occult or toxic relationship (Acts 19:19). Consecrating your body, your soul and your future union to the Lord." },
        ] },
        {
          type: "callout", tone: "neutral", title: "The role of the spiritual mentor / pastor in breaking ties",
          blocks: [
            { type: "p", text: "**Why be accompanied in this process of prayer and deliverance?**" },
            { type: "points", items: [
              { lead: "Bringing the prayer of agreement (Matthew 18:19):", text: "two voices united in the authority of the name of Jesus silence the enemy." },
              { lead: "Offering informed, balanced discernment:", text: "preventing on the one hand any minimising of the spiritual, and on the other hand blaming the devil for what belongs to emotional maturity." },
              { lead: "Watching over a lasting walk in freedom:", text: "accompanying you in sanctification and daily prayer for protection after your release." },
            ] },
          ],
        },
        { type: "authorQuote", text: "When the Son sets you free, you are free indeed. No witchcraft, no ancestral covenant can stand against the blood of the Lamb when the believer stands in their identity in Christ.", author: "Dr. Rebecca Brown, author and missionary doctor" },
        {
          type: "callout", tone: "info", title: "Your roadmap for this lesson",
          blocks: [
            { type: "steps", items: [
              "Complete the inventory and spiritual discernment worksheet.",
              "Write a personal prayer of renunciation and of breaking covenants.",
              "Sort through your belongings to get rid of any object linked to the occult or to impure past relationships.",
              "Arrange a time of prayer for deliverance with your Garden of Alliance mentor or your spiritual shepherd.",
            ] },
          ],
        },
      ],
    },
  ],
  quizIntro: "Answer these questions to check your understanding of freedom in Christ.",
  quiz: [
    {
      question: "According to Galatians 3:13 and Numbers 23:23, what is the believer's position regarding curses and witchcraft?",
      options: [
        "The believer must live in constant fear of the witches in their family.",
        "Christ redeemed us from every curse on the cross; enchantment and divination have no legal power over those who walk in the truth.",
        "Witchcraft is more powerful than prayer.",
      ],
      answer: 1,
      explanation: "Supreme authority belongs to Christ. The believer must proclaim their deliverance by faith and in truth.",
    },
    {
      question: "What is a generational spiritual covenant?",
      options: [
        "A friendly custom between two families.",
        "An agreement or pact sealed by ancestors with spiritual entities, creating claims on the family line if it is not broken in Christ.",
        "A financial inheritance.",
      ],
      answer: 1,
      explanation: "The negative covenants of a family line must be formally repudiated and broken by the blood of the New Covenant.",
    },
    {
      question: "Why can sex outside marriage create a problematic spiritual soul tie?",
      options: [
        "Because it keeps you from sleeping.",
        "Because sexuality creates a deep bodily and spiritual union (1 Corinthians 6:16) that can transfer the other person's oppression or chains.",
        "Because it is a cultural rule.",
      ],
      answer: 1,
      explanation: "Past sexual soul ties must be severed and cut off in prayer in the name of Jesus.",
    },
    {
      question: "What is the first step of the biblical protocol for spiritual freedom?",
      options: [
        "Sprinkling holy water everywhere.",
        "Personal and identificational repentance (confessing the sins of your family line and your own) and claiming the blood of Jesus.",
        "Shouting as loudly as possible.",
      ],
      answer: 1,
      explanation: "Repentance closes the legal doors and takes away any ground of accusation from the enemy.",
    },
  ],
  reflection: {
    title: "Personal challenge",
    prompt: "Speak this prayer of authority: *“In the name of Jesus Christ, I proclaim that my love life is redeemed by the blood of the Lamb. Every curse, every covenant of witchcraft and every toxic soul tie is broken today. I walk in the freedom of the children of God! Amen.”*",
  },
};

/* ───────────────────────────── Pillar ───────────────────────────── */

export const pillar2En: Pillar = {
  number: 2,
  slug: "connaissance-de-soi",
  title: "Self-knowledge, temperaments & inner healing",
  summary: "Knowing yourself in truth — temperament, attachment style, wounds and inherited patterns — to clarify your needs and values, forgive, break the ties of the past and enter the covenant free.",
  poster: PILLAR_2_POSTER,
  card: `${BASE}/images/pilier-2-carte.webp`,
  lessons: [lesson21, lesson22, lesson23, lesson24, lesson25, lesson26, lesson27],
};
