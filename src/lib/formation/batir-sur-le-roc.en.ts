// "Build on the Rock" — English version of the Garden of Alliance marriage
// preparation course (source: batir-sur-le-roc.ts, transcribed from the team's
// French PDF lessons).
//
// PARITY RULE: this file must mirror batir-sur-le-roc.ts exactly — same
// lessons, same slugs and numbers, same number of quiz questions and options,
// same `answer` indices, same `right` case-study responses. Progress (completed
// lessons, quiz answers, reading position) is stored by slug and index and is
// shared between both languages.
//
// Scripture: World English Bible (public domain), with "the LORD".
import type { Formation, Lesson, Pillar } from "./types";

const BASE = "/formation/batir-sur-le-roc";
const img = (n: string) => ({ src: `${BASE}/images/lecon-${n}.webp`, card: `${BASE}/images/lecon-${n}-carte.webp` });

/* ───────────────────────────── Pillar 1 ───────────────────────────── */

const lesson11: Lesson = {
  number: "1.1",
  slug: "1-1",
  title: "Between praise and reality",
  image: { ...img("1-1"), alt: "A bride and groom side by side during the ceremony, the bride holding a bouquet of pale roses." },
  pdf: `${BASE}/pdf/lecon-1-1-entre-eloge-et-realite.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "The lens through which we look at love",
    blocks: [
      { type: "p", text: "Welcome to this first pillar of our journey. Before learning how to choose the right person or how to communicate, it is vital to know what we are trying to build. Everything begins with vision." },
      { type: "p", text: "We all approach marriage wearing invisible glasses, shaped by culture, by our experiences and by what we have observed. The problem? These glasses usually distort. They tend to push us towards two destructive extremes: **naive idealisation** or **bitter cynicism**. As long as these two illusions are not taken apart, even the best of spouses will seem inadequate or threatening to us." },
    ],
  },
  objective: "To take off our distorting glasses and embrace the clear, powerful and sacred vision God has for marriage.",
  parts: [
    {
      heading: "The intoxication of idealisation (the myth of ease)",
      blocks: [
        { type: "p", text: "Modern culture, from romantic films to social media, has sold us a distorted version of love. It is the idea that \"love is enough\", that the right person will come and fill every existential void, and that once you have found your famous \"soulmate\", everything will flow naturally, without effort." },
        { type: "p", text: "This is what we call naive idealisation. In this vision, love is a consumer product based on pure emotion. We expect the other person to be perfect, to read our minds and never to frustrate us." },
        { type: "p", text: "The deadly danger of this vision? **Intolerance of reality.** At the first serious conflict, or the first emotional dry spell, the idealist panics and concludes: \"I chose the wrong person, love has gone.\" Yet love does not disappear in the face of conflict; it is simply tested, so that it can move from emotion to covenant." },
      ],
    },
    {
      heading: "The armour of cynicism (a wound disguised as wisdom)",
      blocks: [
        { type: "p", text: "At the opposite end from idealisation lies cynicism. Someone who has watched marriages collapse around them, or who has suffered painful betrayals, ends up adopting a defensive posture. The cynic declares: \"True love doesn't exist, it always ends badly, men/women are all the same.\"" },
        { type: "p", text: "It is crucial to understand that **cynicism is nothing other than wounded idealism**. It is a protective mechanism. By expecting the worst, the cynic makes sure never to be disappointed again." },
        { type: "p", text: "But this posture comes at a steep price. By building a wall to keep pain out, we also keep true love from settling in. A cynical single will unconsciously sabotage every healthy relationship, because their mind will constantly look for proof that \"the other person will end up betraying me\"." },
        { type: "verse", text: "Keep your heart with all diligence, for out of it is the wellspring of life.", ref: "Proverbs 4:23" },
        { type: "p", text: "Keeping your heart does not mean walling it in, but protecting it from being contaminated by despair." },
      ],
    },
    {
      heading: "The third way: the reality of the sacred Covenant",
      blocks: [
        { type: "p", text: "Between the Hollywood fairy tale and modern pessimism stands the biblical vision of marriage: **the Covenant**." },
        { type: "p", text: "A covenant is neither a consumer contract (where I stay as long as it suits me) nor a prison. It is a sacred, voluntary and mature commitment between two imperfect people who decide to unite under the gaze of a perfect God." },
        { type: "p", text: "In the sacred vision of marriage:" },
        {
          type: "points",
          items: [
            { lead: "The goal is not comfort, but growth.", text: "Marriage will not make you happy every second, but it will make you holy. It will act as a mirror that helps you grow." },
            { lead: "Love is a decision, not just an emotion.", text: "When the butterflies of the beginning settle down, the intentional choice to love takes over. It is a love that rolls up its sleeves." },
            { lead: "Imperfection is expected.", text: "Because the vision is clear, we do not fall apart when our spouse shows their limits. We lean on God's grace to forgive and move forward." },
          ],
        },
      ],
    },
  ],
  caseStudy: {
    title: "Marc's story — from virtual to real",
    context: "Marc is chatting with someone who shares his faith. On a practical matter, she voices a different opinion and a hint of impatience.",
    responses: [
      { label: "The idealist reflex", text: "\"She is impatient, she is not my soulmate. Everything should flow.\"" },
      { label: "The cynical reflex", text: "\"Another unstable person — they all show their true colours eventually.\"" },
      { label: "The Covenant attitude", text: "Marc tells himself: \"Love is not the absence of imperfection, but the ability to talk things through in grace. Let's see how we handle what comes next by talking calmly.\"", right: true },
    ],
  },
  compass: {
    title: "The key for your single life today",
    blocks: [
      { type: "p", text: "As you browse Garden of Alliance, reject both the demand for perfection (idealisation) and systematic suspicion (cynicism). Look for a partner not to fill a void or to play a part in a perfect script, but to **build a real covenant, rooted in reality and carried by grace**." },
    ],
  },
  quizIntro: "Answer these questions to check your understanding of the vision of the covenant.",
  quiz: [
    {
      question: "What is the main danger of \"naive idealisation\" in a relationship?",
      options: [
        "It keeps you from feeling real emotions.",
        "It makes you intolerant of reality and of the other person's inevitable imperfections.",
        "It pushes you to choose someone too different from yourself.",
      ],
      answer: 1,
      explanation: "By demanding perfection and ease, idealisation makes us run at the first obstacle, mistaking \"conflict\" for \"miscasting\".",
    },
    {
      question: "How does the lesson define cynicism?",
      options: [
        "As great wisdom gained through experience.",
        "As the clear-sightedness needed not to be fooled.",
        "As wounded idealism that uses pessimism as a shield.",
      ],
      answer: 2,
      explanation: "The cynic wants to be protected. The problem is that the armour that shields them from pain also cuts them off from true love.",
    },
    {
      question: "What is the major difference between love as sold by culture and the love of the biblical \"covenant\"?",
      options: [
        "Cultural love is an emotion to be consumed; the covenant is a decision and a sacred commitment.",
        "Covenant love is necessarily free of conflict.",
        "Cultural love demands more sacrifice.",
      ],
      answer: 0,
      explanation: "The covenant endures long after the intense emotion of the beginning has settled, because it rests on a daily choice.",
    },
    {
      question: "According to the sacred vision, what is one of the deep purposes of marriage?",
      options: [
        "To guarantee permanent emotional comfort.",
        "To be a tool for spiritual growth and holiness.",
        "To make sure you never feel lonely again.",
      ],
      answer: 1,
      explanation: "Our spouse often acts as a mirror that reveals our own limits, pushing us to grow and to become more like Christ.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "In all honesty, which of these two extremes do you naturally lean towards today? Do you tend to look for the \"perfect soulmate\" who will never disappoint you (idealisation), or do you approach profiles with suspicion, telling yourself that \"people let you down anyway\" (cynicism)? Entrust this tendency to God today, so you can embrace the clear vision of the Covenant.",
  },
};

const lesson12: Lesson = {
  number: "1.2",
  slug: "1-2",
  title: "Marriage as a sanctuary",
  image: { ...img("1-2"), alt: "A church aisle decorated with white and green flowers; at the far end, the bride and groom stand before the altar." },
  pdf: `${BASE}/pdf/lecon-1-2-le-mariage-comme-sanctuaire.pdf`,
  readingMinutes: 8,
  intro: {
    heading: "An oasis in a world of performance",
    blocks: [
      { type: "p", text: "In the previous lesson, we took apart our illusions in order to adopt the vision of the Covenant. Let us now explore the deep nature of this covenant. What is a Christian home supposed to look like from the inside?" },
      { type: "p", text: "We live in an exhausting world. Society is a place of competition, constant evaluation and performance. On a dating platform, you can sometimes feel that same pressure: the sense that you have to prove your worth, hide your flaws and always present your \"best profile\"." },
      { type: "p", text: "But according to God's heart, the marital home is meant to be the exact opposite of the world's frenzy. It is not designed to be an extension of the battlefield outside, but **a sanctuary**. This word is not a romantic figure of speech; it is a fundamental spiritual reality that should guide your vision of the couple." },
    ],
  },
  parts: [
    {
      heading: "The theology of refuge (the courage to disarm)",
      blocks: [
        { type: "p", text: "Throughout Scripture, God constantly reveals himself as a refuge, a high tower, a safe shelter from the storm (Psalm 46). Biblical marriage is called to be the earthly embodiment of that divine refuge. It is a sacred space where grace replaces judgement, and where each spouse can, quite literally, take off their armour." },
        { type: "p", text: "Before the fall, in the garden of Eden, the man and the woman \"were both naked… and were not ashamed\" (Genesis 2:25). They had nothing to hide and nothing to prove. Christian marriage is an invitation to recreate this small piece of Eden. It is the one place in the world where you should be able to say \"I'm tired, I've failed, I'm afraid\", knowing that you are completely safe." },
      ],
    },
    {
      heading: "The two opposites of the sanctuary",
      blocks: [
        { type: "p", text: "To understand what a sanctuary is, we need to identify what it is not. Without a clear vision, many couples turn their home into one of these two toxic places:" },
        {
          type: "points",
          items: [
            { lead: "The boxing ring.", text: "This is a relationship dominated by ego. The home becomes a place of confrontation where points are counted and each tries to be right at all costs. But in the arithmetic of the covenant, if one crushes the other to win the match, the whole couple loses. The sanctuary is destroyed." },
            { lead: "The theatre stage.", text: "This is a relationship of appearances. Out of terror of not measuring up or of being rejected, each plays a role — the strong husband who never doubts, the perfect wife who always smiles. But perfection is an illusion that kills true intimacy. No one ever really rests on a theatre stage." },
          ],
        },
      ],
    },
    {
      heading: "The vital condition: emotional safety",
      blocks: [
        { type: "p", text: "We often wrongly associate the security of a home with financial or material success. In reality, **the most painful poverty in a couple is emotional insecurity**." },
        { type: "p", text: "Vulnerability — that extraordinary ability to entrust your scars and doubts to someone else — is completely impossible without a framework of emotional safety. A couple that does not establish this unconditional peace will spend its life in \"survival mode\"." },
        { type: "p", text: "The sanctuary is that unique place governed by a covenant of grace: \"I know your flaws, I see your limits, and I choose to love you and protect you anyway.\" It is the certainty that your weaknesses will never be used as weapons against you. (In the next pillars, we will see very concretely how to build this safety through communication and conflict management.)" },
      ],
    },
  ],
  caseStudy: {
    title: "Sarah's story — handling a moment of vulnerability",
    context: "Sarah admits: \"I had a burnout two years ago and I'm still sometimes afraid I won't measure up.\"",
    responses: [
      { label: "On the theatre stage", text: "The other person skims over the subject and boasts about their own successes to look strong." },
      { label: "In the boxing ring", text: "The other person brings it up later: \"You react like that because you're too fragile.\"" },
      { label: "In the sanctuary", text: "The other person welcomes it: \"Thank you for trusting me and for being genuine. You don't need to play a perfect role with me.\"", right: true },
    ],
  },
  compass: {
    title: "The key for your single life today",
    blocks: [
      { type: "p", text: "During your time of meeting people on Garden of Alliance, don't just look for someone who gives you \"butterflies\" or who ticks the boxes of success. Measure your conversations against this sacred vision: \"Does my heart feel at peace with this person? Do I have to play a role to please them, or can I lower my guard?\" **Inner peace is often the early sign of a future sanctuary.**" },
    ],
  },
  quizIntro: "Answer these questions to check your understanding of marriage as a sanctuary.",
  quiz: [
    {
      question: "What is the theological meaning of \"the home as a sanctuary\"?",
      options: [
        "A place where you cut yourself off completely from the outside world and society.",
        "A place that reflects God's nature as a \"refuge\", where you can lower your guard without shame or fear.",
        "A space devoted only to silent prayer.",
      ],
      answer: 1,
      explanation: "Christian marriage is called to be an earthly demonstration of the security and rest offered by Christ.",
    },
    {
      question: "What is the main danger of turning your relationship into a \"theatre stage\"?",
      options: [
        "It costs too much social energy.",
        "Keeping up a mask of perfection prevents true intimacy and real rest.",
        "It creates too many open conflicts.",
      ],
      answer: 1,
      explanation: "If you wear a mask for fear of being rejected for your flaws, the relationship stays superficial and you never feel truly safe.",
    },
    {
      question: "Why does vulnerability require \"emotional safety\"?",
      options: [
        "Because showing yourself as you are requires the assurance that your flaws won't be used against you.",
        "Because you have to be strong to cry.",
        "Because vulnerability is a sign of weakness that must be hidden.",
      ],
      answer: 0,
      explanation: "No one takes off their armour if they feel threatened. Grace and freedom from condemnation are the preconditions of all true intimacy.",
    },
    {
      question: "In the \"boxing ring\" analogy, what happens when one spouse tries to \"win\" an argument at all costs?",
      options: [
        "The couple comes out stronger because the truth comes out.",
        "If one wins by crushing the other, the whole covenant (the couple) loses.",
        "The winner earns the right to run the sanctuary.",
      ],
      answer: 1,
      explanation: "In a covenant there is no opponent. A victory that destroys your spouse is a defeat for the marriage.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "In your recent interactions with potential partners, did you try to dazzle the other person with a performance (theatre stage), did you try to get the upper hand in your discussions (boxing ring), or did you create a climate of authenticity and welcome? Keep in mind that tomorrow's sanctuary begins with the authenticity of today's conversations.",
  },
};

const lesson13: Lesson = {
  number: "1.3",
  slug: "1-3",
  title: "Marriage as the answer to a purpose",
  image: { ...img("1-3"), alt: "Two gold wedding rings resting on a dictionary page, at the entry \"marriage\"." },
  pdf: `${BASE}/pdf/lecon-1-3-le-mariage-comme-reponse-a-un-but.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "Love is not a destination",
    blocks: [
      { type: "p", text: "One of the great modern tragedies is to see marriage as a finish line. We fight to find \"the right person\", we organise the ceremony, we exchange vows, and then… we sit down. We imagine that the purpose of love is love itself." },
      { type: "p", text: "This is a fundamental error of vision. **Biblical marriage is not a destination; it is a vehicle.** If two people get into a car without knowing where they are going, however comfortable the interior may be, they will end up driving in circles, getting bored, and inevitably arguing about the music or the air-conditioning." },
    ],
  },
  objective: "To discover why a marriage that exists only for itself ends up suffocating, and how the vision of a \"shared destiny\" radically turns the covenant into a formidable force.",
  parts: [
    {
      heading: "The myth of love in a closed bubble",
      blocks: [
        { type: "p", text: "Popular culture paints romantic love as two people gazing into each other's eyes forever, cut off from the rest of the world. But a couple that only ever looks at itself ends up collapsing under its own weight." },
        { type: "p", text: "The prophet Amos asks a question of striking common sense:" },
        { type: "verse", text: "Do two walk together, unless they have agreed?", ref: "Amos 3:3" },
        { type: "p", text: "Marriage as God designed it is not about looking at each other, but about looking together in the same direction. God does not unite you simply to solve your loneliness or to split the bills. He unites two lives to answer a mandate, to accomplish a mission that neither could have accomplished alone with the same power." },
      ],
    },
    {
      heading: "The arithmetic of the Kingdom (the destiny accelerator)",
      blocks: [
        { type: "p", text: "Scripture contains a fascinating spiritual principle about covenant:" },
        { type: "verse", text: "How could one chase a thousand, and two put ten thousand to flight?", ref: "Deuteronomy 32:30" },
        { type: "p", text: "Mathematically, if one chases a thousand, two should chase two thousand. But in the arithmetic of God's Kingdom, covenant produces exponential synergy. The union of two people aligned on the same spiritual purpose does not simply add their strengths: **it multiplies them**. This is the accelerating effect of destiny." },
        { type: "p", text: "A blessed, purpose-driven marriage will propel you further, higher and deeper into your spiritual, professional or ministry calling than you would ever have imagined by staying alone. Your spouse becomes your greatest ally in your destiny." },
      ],
    },
    {
      heading: "The sequence of Eden and the strength of the Ezer Kenegdo",
      blocks: [
        { type: "p", text: "Let us look at the very first marriage in human history, in the book of Genesis. It is a perfect model. Notice carefully the order of events:" },
        {
          type: "steps",
          items: [
            "God creates the man and places him in the garden.",
            "God gives him a purpose and a task: to cultivate and keep the garden (Genesis 2:15).",
            "Only then does God observe that the man cannot fulfil this mandate alone in the best way, and declares: \"It is not good for the man to be alone. I will make him a helper comparable to him\" (Genesis 2:18).",
          ],
        },
        { type: "p", text: "The first lesson is staggering: **purpose comes before the relationship**. It is very hard to know who should walk with you if you have no idea where you are going." },
        { type: "p", text: "But let us pause on the words God uses for this \"helper\". In the original Hebrew text, the expression is *Ezer Kenegdo*. Historically, this term has often been misunderstood or reduced to the image of a mere subordinate assistant. That is a huge theological mistake." },
        { type: "p", text: "The word *Ezer* literally means \"vital help\" or \"rescuing strength\". It is in fact the very same word used in the Psalms to describe God coming to Israel's rescue in battle (Psalm 121:2: \"My help [Ezer] comes from the LORD\"). As for *Kenegdo*, it means \"face to face\", \"corresponding to him\", or \"his mirror strength\"." },
        { type: "p", text: "In the sacred covenant, the wife is not a passive or secondary figure: she is spiritually described as a fellow warrior, an essential mirror strength for fulfilling the destiny of the home. **The spouse God truly gives you never comes to diminish or stifle your destiny — they amplify it.**" },
      ],
    },
  ],
  caseStudy: {
    title: "David and Leah's story — the direction of their plans",
    context: "David is passionate about social action; Leah is mainly looking for comfort and escape.",
    responses: [
      { label: "Love in a closed bubble", text: "They talk about hobbies without ever discussing the impact they hope to have in five years." },
      { label: "The Ezer Kenegdo approach", text: "David asks: \"What cause matters to you so much that you'd pour your energy into it?\" If they realise their callings cancel each other out, the vehicle will go nowhere.", right: true },
    ],
  },
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "When you browse profiles on Garden of Alliance and start conversations, don't stop at surface questions (\"What are your hobbies?\", \"What's your favourite dish?\"). **Look for the direction of the car!** Ask: \"What are you passionate about? Where do you see God using you in five years?\" Look for a partner whose calling resonates with your own heart. Look for your *Ezer Kenegdo*: the spiritual co-pilot able to accelerate the vision God has placed in you." },
    ],
  },
  quizIntro: "Answer these questions to anchor this powerful vision of the covenant.",
  quiz: [
    {
      question: "According to this lesson, what is the fundamental error of modern romantic culture?",
      options: [
        "Seeing love as a difficult starting point.",
        "Seeing marriage as a finish line and an end in itself (love in a closed bubble).",
        "Giving too much importance to spirituality in the couple.",
      ],
      answer: 1,
      explanation: "Marriage is not the final destination; it is the vehicle that makes it possible to fulfil a greater purpose.",
    },
    {
      question: "What does the Hebrew expression \"Ezer Kenegdo\" used in Genesis mean?",
      options: [
        "An assistant meant to serve and obey.",
        "A mirror strength, a vital help and a fellow warrior in destiny.",
        "Someone in charge only of household chores.",
      ],
      answer: 1,
      explanation: "The word \"Ezer\" is used to describe God coming to rescue his people in battle. It is a term of extraordinary strength, far from any notion of inferiority.",
    },
    {
      question: "In the Genesis account, what does God give the man before giving him a wife?",
      options: [
        "A house and money.",
        "Friends and a community.",
        "A vision, work and a purpose (cultivating the garden).",
      ],
      answer: 2,
      explanation: "The biblical sequence is clear: identity and purpose come before the marriage covenant. The Ezer Kenegdo is given so that the vision can be fulfilled together.",
    },
    {
      question: "What does a couple risk if they marry without a shared direction or purpose?",
      options: [
        "Getting bored and suffocating under the weight of routine, because they only look at each other.",
        "Becoming better friends.",
        "Living very peacefully, without conflict.",
      ],
      answer: 0,
      explanation: "Like passengers in a car with no destination, the lack of a shared purpose breeds dissatisfaction and surface-level conflicts.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "Take a moment to pause. If you had to describe the \"purpose\" or general direction of your life today (even if it isn't perfect yet), what would it be? And above all, are you inwardly certain that you are ready to act as a \"rescuing strength\" (Ezer) to amplify the other person's destiny, rather than using them only for your own comfort?",
  },
};

const lesson14: Lesson = {
  number: "1.4",
  slug: "1-4",
  title: "Theological and spiritual alignment",
  image: { ...img("1-4"), alt: "A bride and groom hand in hand in front of a brick church topped with a white cross, surrounded by their wedding party.", position: "center 45%" },
  pdf: `${BASE}/pdf/lecon-1-4-alignement-theologique-et-spirituel.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "The weight of words",
    blocks: [
      { type: "p", text: "We often use the word \"covenant\" very lightly. In everyday language, the French word for it, *alliance*, even names the ring worn on the finger, or a marriage of convenience. But in God's vocabulary, it is one of the heaviest, bloodiest and most magnificent words there is." },
      { type: "p", text: "The major confusion of our time is to treat biblical marriage (a **Covenant**) with the mindset of a human transaction (a **Contract**). This miscalibration is responsible for the collapse of thousands of homes, Christian ones included." },
    ],
  },
  objective: "To understand the theological gulf between a contract and a covenant, and to realise why deep spiritual alignment is the only guarantee that this covenant will stand in the storms.",
  parts: [
    {
      heading: "The conceptual gulf (contract or covenant)",
      blocks: [
        { type: "p", text: "It is vital to examine the posture of our heart. Are we navigating our single life with the mindset of a contractor or of an ally?" },
        {
          type: "points",
          items: [
            { lead: "The logic of the contract.", text: "A contract is founded on mistrust. Its purpose is to protect my rights and limit my risks. The golden rule is: \"I give you 50%, you give me 50%. If you don't do your part, I withdraw mine and the contract is void.\" It is a conditional, consumerist logic." },
            { lead: "The logic of the covenant.", text: "A biblical covenant (*Berit* in Hebrew) is founded on the gift of self. Its purpose is not to protect my rights, but to give myself entirely to the other. The golden rule is: \"I give you 100%, even on the days you can only give 10%.\" Giving 100% does not mean enduring abuse, but becoming an unconditional support, an arm that carries and an encouragement that helps the other get back up and give their best again at their own pace. The covenant is unconditional. It is *agape* love and grace in action." },
          ],
        },
        { type: "p", text: "Whoever approaches marriage as a contract will inevitably be disappointed, because a human spouse will always fail at some point. **Only the structure of the covenant can absorb the shock of human imperfection.**" },
      ],
    },
    {
      heading: "The seal of sacrifice and of the cross",
      blocks: [
        { type: "p", text: "In the Old Testament, a covenant was not \"concluded\"; literally, it was \"cut\" (Genesis 15). The parties passed between sacrificed animals, which symbolically meant: \"May I be torn apart like these animals if I break my commitment to you.\" A covenant is a matter of life and death; it involves dying to oneself." },
        { type: "p", text: "The New Testament takes this reality to its height. Christ sealed the New Covenant not with the blood of animals, but with his own blood. The apostle Paul draws a breathtaking parallel:" },
        { type: "verse", text: "Husbands, love your wives, even as Christ also loved the church, and gave himself up for it.", ref: "Ephesians 5:25" },
        { type: "p", text: "Marriage is meant to be a mini-Gospel. It preaches to the invisible and visible world God's sacrificial faithfulness to his people. That is why divorce or betrayal hurt so much: they tear a fabric that was sewn with divine thread." },
      ],
    },
    {
      heading: "The deadly danger of being \"unequally yoked\"",
      blocks: [
        { type: "p", text: "Because the covenant demands such a level of self-giving and sacrifice, God gives us a categorical warning:" },
        { type: "verse", text: "Don't be unequally yoked with unbelievers.", ref: "2 Corinthians 6:14" },
        { type: "p", text: "The \"yoke\" is the wooden beam that joins two oxen to plough a field (which brings us back to the notion of \"purpose\" from the previous lesson). If one ox wants to go right (towards the Kingdom) and the other left (towards the values of the world), or if one is much taller than the other, the yoke will choke them and the field will never be ploughed." },
        { type: "p", text: "Theological and spiritual alignment is not a matter of religious labels (attending the same denomination). **It is a matter of Lordship.** In the heart of the storm, when your marriage is shaken, to what ultimate authority will you turn? If one submits to the Word of God and the other to their own emotional or societal truth, the foundation will crack." },
      ],
    },
  ],
  caseStudy: {
    title: "Samuel and Rachel's story — facing hardship",
    context: "Samuel is going through prolonged unemployment and intense moral exhaustion.",
    responses: [
      { label: "The logic of the contract", text: "Rachel withdraws: \"You're no longer doing your part, financially or emotionally.\"" },
      { label: "The logic of the covenant", text: "Rachel supports her spouse: \"The covenant doesn't depend on how productive you are. Today you're weakened, so I'll carry the load, we'll pray, and I'll help you get back on your feet.\"", right: true },
    ],
  },
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "On Garden of Alliance, \"spiritual alignment\" does not mean holding a theological debate from the very first message. It is about observing: does this person fear God more than the opinion of others? Does their life show the fruit of the Spirit? Does their definition of commitment look like a contract or like a Christ-centred covenant? **Choosing a spouse who is not spiritually aligned is like tying your boat to a sinking ship.**" },
    ],
  },
  quizIntro: "Answer these questions to anchor your understanding of the Covenant.",
  quiz: [
    {
      question: "What is the fundamental difference between a contract and a biblical covenant?",
      options: [
        "A contract is spoken; a covenant must be written.",
        "A contract protects my rights and is conditional; a covenant is unconditional and involves the total gift of self.",
        "There is no difference — they are two words for the same thing.",
      ],
      answer: 1,
      explanation: "A contract says \"I'll protect you if you satisfy me\"; a covenant says \"I love you even when you disappoint me\".",
    },
    {
      question: "What spiritual mystery is the marriage covenant meant to reflect on earth?",
      options: [
        "The perfection of human nature.",
        "Christ's sacrificial, faithful and unconditional love for his Church.",
        "Strict equality (50/50) between men and women.",
      ],
      answer: 1,
      explanation: "This is the deep teaching of Ephesians 5. Marriage is a living parable of the Gospel.",
    },
    {
      question: "Biblically, what does the expression \"cutting a covenant\" mean in the Old Testament?",
      options: [
        "Sharing a wedding cake.",
        "Cancelling a contract that no longer works.",
        "A blood commitment signifying death to oneself and faithfulness at the risk of one's own life.",
      ],
      answer: 2,
      explanation: "The gravity of this symbol shows how sacred the commitment of marriage is in God's eyes.",
    },
    {
      question: "The biblical warning against being \"unequally yoked\" (2 Corinthians 6:14) teaches us that:",
      options: [
        "Uniting with someone who is not submitted to the Lordship of Christ will end up choking the destiny of the home.",
        "You should never marry someone who earns less money than you.",
        "You absolutely must belong to exactly the same local denomination.",
      ],
      answer: 0,
      explanation: "The unequal yoke is about ultimate authority. If both spouses don't submit to the same Master, they will pull in opposite directions.",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "When you experienced romantic betrayals in the past, or watched relationships fail around you, would you say those relationships were built on the logic of a contract or on the logic of a covenant? Today, how can you adjust your own expectations to look for a partner ready to enter a sacrificial covenant rather than a mere agreement of mutual interests?",
  },
};

const lesson15: Lesson = {
  number: "1.5",
  slug: "1-5",
  title: "Self-denial and mutual service",
  image: { ...img("1-5"), alt: "A man and a woman back to back, arms crossed, faces closed: the image of withdrawal into oneself that this lesson invites us to move beyond.", position: "center 30%" },
  pdf: `${BASE}/pdf/lecon-1-5-le-renoncement-et-le-service-mutuel.pdf`,
  readingMinutes: 10,
  intro: {
    heading: "Love's counter-cultural revolution",
    blocks: [
      { type: "p", text: "The world in which we look for love is governed by a dominant philosophy: **personal fulfilment**. It constantly whispers that our happiness is the absolute priority, that we must first \"love ourselves\", and that any relationship that no longer \"gives\" us something should be abandoned." },
      { type: "p", text: "This philosophy is not entirely wrong — but it becomes deadly when applied to Christian marriage. A love centred on what the other can offer me is a seasonal love: it blossoms when all is well, and withers as soon as the spouse goes through a dark night." },
      { type: "p", text: "The biblical vision of marriage sets out a radically counter-cultural revolution: true fulfilment does not come from what you receive, but from what you choose to give." },
    ],
  },
  objective: "To embrace the beauty of self-denial and mutual service not as a constraint, but as the most powerful engine of a lasting covenant.",
  parts: [
    {
      heading: "Self-denial — the death that gives life",
      blocks: [
        { type: "p", text: "The word \"self-denial\" is frightening. It suggests deprivation, loss of freedom, a cramped life in someone else's shadow. That is precisely what modern culture has taught us to fear." },
        { type: "p", text: "But Jesus turns this logic upside down with a sentence of unsettling power:" },
        { type: "verse", text: "If anyone desires to come after me, let him deny himself, take up his cross, and follow me. For whoever desires to save his life will lose it, and whoever will lose his life for my sake will find it.", ref: "Matthew 16:24-25" },
        { type: "p", text: "This paradox of Christ unfolds fully in the marriage covenant. Denying yourself in marriage does not mean erasing yourself, cancelling yourself out or blindly submitting to abuse. It means choosing, deliberately and every day, to leave your ego at the door of the home. It means putting the other person's needs on the scales, even — and especially — when it is not convenient." },
        { type: "p", text: "Self-denial within the covenant is the paradoxical act through which you discover a version of yourself that is greater, more generous and freer than you could ever have imagined by living only for yourself." },
      ],
    },
    {
      heading: "The crucial nuance — sacrifice is not self-destruction",
      blocks: [
        { type: "p", text: "It is essential to set a theological and human safeguard here. The self-denial Christ speaks of is not a call to chronic exhaustion or to the disappearance of the self. There is a dangerous counterfeit of self-giving: **emotional martyrdom**. It is the posture of someone who empties themselves to the bone, sacrifices themselves to breaking point, and ends up presenting their own destruction as proof of love." },
        { type: "p", text: "This confusion wounds twice: it damages the one who gives to the point of exhaustion, and it places a crushing guilt on the spouse's shoulders — the weight of someone who has immolated themselves for them." },
        { type: "p", text: "Biblical agape love cannot be bought. You do not earn the other person's love by destroying yourself for them. **Service within the covenant always springs from abundance, never from emptiness.** Christ himself, who gives us the supreme example of sacrifice, never stopped withdrawing to pray and to be renewed in communion with the Father. His self-giving was fed by an inexhaustible source, not by a reserve that weariness would eventually drain." },
        { type: "p", text: "In practice, this means that a spouse who looks after their spiritual, emotional and physical health is not lacking in generosity — they are keeping themselves able to give. They keep their own flame burning so they can warm the home. Healthy self-denial is a choice made from a place of freedom and inner fullness, never the ransom paid to buy love or to avoid being abandoned." },
      ],
    },
    {
      heading: "Mutual service — the washing of feet as a model",
      blocks: [
        { type: "p", text: "On the night Jesus was to be betrayed and led to the cross, the Bible tells us that he rose from the table, laid aside his outer garment, took a towel and began to wash his disciples' feet (John 13:4-5). It was the humblest act in the culture of the time, reserved for the lowest-ranking servants. And it was the King of the universe who performed it." },
        { type: "p", text: "Jesus concluded this prophetic gesture with a foundational statement:" },
        { type: "verse", text: "If I then, the Lord and the Teacher, have washed your feet, you also ought to wash one another's feet.", ref: "John 13:14" },
        { type: "p", text: "This washing of feet is the model for Christian marriage. Mutual service is the inner disposition that says: **\"The other is not here to serve me — I am here for them.\"** And since both spouses share this same posture, neither is ever exploited. On the contrary, each finds themselves fulfilled by the love they give and receive in return." },
      ],
    },
    {
      heading: "Self-denial sets free, service amplifies",
      blocks: [
        { type: "p", text: "The deep counter-intuition of Christian marriage can be put this way: it is by ceasing to serve yourself that you become fully yourself. The apostle Paul sums it up in a phrase of striking theological density:" },
        { type: "verse", text: "Doing nothing through rivalry or through conceit, but in humility, each counting others better than himself; each of you not just looking to his own things, but each of you also to the things of others.", ref: "Philippians 2:3-4" },
        { type: "p", text: "In a couple's daily life, this shows up in everyday acts that seem trivial but that build, brick by brick, the greatness of a home: making the meal when the other is exhausted, giving up your favourite evening to support your spouse's project, choosing to stay quiet and listen rather than imposing your own analysis. These unseen gestures are the founding acts of the covenant." },
      ],
    },
  ],
  caseStudy: {
    title: "Inès's story — everyday trade-offs",
    context: "Inès has planned some time to rest on her own. Her fiancé calls her, very stressed about an urgent decision.",
    responses: [
      { label: "Selfishness", text: "\"This is my time — deal with your problems on your own.\"" },
      { label: "Emotional martyrdom", text: "Inès cancels herself out, stays up all night to the point of exhaustion and builds up resentment." },
      { label: "Healthy service", text: "Inès listens and prays with him for 45 minutes, then calmly sets a limit: \"I'm with you with all my heart. I'm going to rest so I'm fresh tomorrow, but my heart is with you.\"", right: true },
    ],
  },
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "In your conversations on Garden of Alliance, pay attention to the other person's fundamental posture: are they someone who talks *about themselves* or someone interested *in you*? Someone whose questions turn towards the other, whose suggestions take your reality into account, and whose general attitude shows a natural disposition to serve, is a strong sign of real relational maturity. **Service doesn't wait for marriage to show itself — it is revealed from the very first words you exchange.**" },
    ],
  },
  quizIntro: "Answer these questions to anchor the vision of self-denial and service.",
  quiz: [
    {
      question: "According to the lesson, why is the cultural philosophy of \"personal fulfilment\" insufficient as a foundation for marriage?",
      options: [
        "Because it completely ignores financial matters.",
        "Because it creates a conditional love centred on personal satisfaction, unable to get through difficult seasons.",
        "Because it encourages too much independence between spouses.",
      ],
      answer: 1,
      explanation: "A love that lasts only as long as the other \"fulfils\" me is as fragile as glass. The biblical vision is the exact opposite: it is in giving that we receive.",
    },
    {
      question: "In the context of the marriage covenant, what is the difference between healthy self-denial and emotional martyrdom?",
      options: [
        "Emotional martyrdom is a Christian virtue to be encouraged.",
        "There is no difference: forgetting yourself completely is always an act of love.",
        "Healthy self-denial springs from abundance and inner freedom; emotional martyrdom comes from emptiness and tries to buy love through self-destruction.",
      ],
      answer: 2,
      explanation: "An exhausted, drained spouse can no longer love or serve fully. Biblical service is renewed in communion with God, just as Christ himself withdrew to pray before giving.",
    },
    {
      question: "Which gesture of Christ at the Last Supper is the model of mutual service in marriage?",
      options: [
        "The multiplication of the loaves.",
        "The washing of his disciples' feet, performed by the King himself.",
        "Turning water into wine at Cana.",
      ],
      answer: 1,
      explanation: "This gesture overturns every hierarchy of pride. In the covenant, no spouse is above serving the other.",
    },
    {
      question: "What spiritual paradox does a life of service within the covenant reveal?",
      options: [
        "By dominating the other, you flourish more.",
        "By serving yourself first, you protect the couple.",
        "It is by ceasing to serve yourself that you become fully yourself, because the other adopts the same posture and gives back in return.",
      ],
      answer: 2,
      explanation: "It is the paradox of the cross applied to married intimacy: whoever loses their life will find it (Matthew 16:25).",
    },
  ],
  reflection: {
    title: "Personal reflection",
    prompt: "With radical honesty, ask yourself this question: in your search for a spouse today, what is your dominant posture? Are you looking above all for someone to serve you, understand you and meet your expectations — or are you ready to ask yourself, right now, how you could be a partner who joyfully commits to serving the other? The answer says a great deal about how ready you are for the covenant.",
  },
};

const lesson16: Lesson = {
  number: "1.6",
  slug: "1-6",
  title: "The family altar and the presence of God",
  image: { ...img("1-6"), alt: "Silhouette of a family — a couple and two children holding hands — facing the setting sun.", position: "center 60%" },
  pdf: `${BASE}/pdf/lecon-1-6-l-autel-familial-et-la-presence-de-dieu.pdf`,
  readingMinutes: 9,
  intro: {
    heading: "The home: a little church or simply living together?",
    blocks: [
      { type: "p", text: "We have reached the final lesson of this first pillar, and we must address the question that crowns everything we have built together: **who reigns at the centre of your home?**" },
      { type: "p", text: "You can have a clear vision of marriage (lesson 1.1), see your home as a sanctuary (lesson 1.2), share a common destiny (lesson 1.3), understand the depth of the covenant (lesson 1.4) and embrace mutual service (lesson 1.5) — and despite all this, build a home that looks like a fine human partnership rather than a dwelling that God inhabits." },
      { type: "p", text: "The difference between these two realities is not a detail. It is absolutely decisive." },
    ],
  },
  objective: "To understand why God's presence is not an optional extra in a Christian marriage, but the foundation without which everything else rests on sand.",
  parts: [
    {
      heading: "God's dwelling at the heart of History",
      blocks: [
        { type: "p", text: "From the dawn of Scripture, God shows a constant and ardent desire: **to dwell among his people**. He is not content to guide them from afar — he wants to pitch his tent among his own." },
        { type: "p", text: "First the Tabernacle, then Solomon's Temple, then the Incarnation of Christ — \"The Word became flesh, and lived among us\" (John 1:14) — and finally the believer's body become a temple of the Holy Spirit (1 Corinthians 6:19): the whole of biblical history is the story of a God who draws near, who comes down, who chooses to dwell where his people live." },
        { type: "p", text: "The Christian marital home stands in this same prophetic and theological line. It is the most intimate version of this \"temple\" on earth: **the place where God chooses to reveal his glory through the covenant of two people who belong to him**. The family altar is not a ritual for show — it is the act of sovereignty by which a couple declares: \"In this house, Christ reigns.\"" },
      ],
    },
    {
      heading: "A home without God — the empty house",
      blocks: [
        { type: "p", text: "In Matthew 12:44, Jesus describes a house swept and put in order, but empty. And it is precisely because it is empty that it becomes vulnerable to every force that seeks to live there in place of its rightful Master." },
        { type: "p", text: "A home without God's presence at its centre can be beautiful, well organised, financially stable and admired from the outside. But in the storms every couple inevitably goes through — crisis, grief, betrayal, infertility, unemployment, illness — no human anchor holds. Two people alone in the face of adversity, however strong they are, find themselves drawing on reserves that run dry." },
        { type: "p", text: "This is where the promise of Matthew 18:20 takes on its full meaning for marriage:" },
        { type: "verse", text: "For where two or three are gathered together in my name, there I am in the middle of them.", ref: "Matthew 18:20" },
        { type: "p", text: "This verse is not only about the church. It is about marriage. Two people gathered *in his name* benefit from a third presence, invisible but real, stronger than any outside difficulty." },
      ],
    },
    {
      heading: "The threefold cord — the vision of Ecclesiastes",
      blocks: [
        { type: "p", text: "Solomon, the wisest man of the Old Testament, expresses this reality with an image of remarkable depth:" },
        { type: "verse", text: "A threefold cord is not quickly broken.", ref: "Ecclesiastes 4:12" },
        { type: "p", text: "In the sacred vision of Christian marriage, the couple is never a duo — it is a trio. The two spouses form two strands of this cord. But it is the third strand — **the presence of God** — that turns an ordinary rope into an unbreakable cable. Each of the first two strands can weaken in turn, go through its own nights and its own failings, because the third strand holds everything together." },
        { type: "p", text: "This vision changes everything about how we approach life together. Seasons of coldness, deep misunderstandings and human dead ends no longer mean the end of the covenant, because there is a third resource, inexhaustible and always available, that both spouses can draw on together or separately: the grace of God." },
      ],
    },
  ],
  caseStudy: {
    title: "Thomas and Julie's story — resolving a conflict",
    context: "A tense financial disagreement breaks out over savings.",
    responses: [
      { label: "A home without an altar", text: "Each withdraws into their pride and lets bitterness set in." },
      { label: "A home with an altar", text: "Thomas or Julie takes the initiative: \"We're annoyed, but let's not let the enemy divide us. Let's sit down and pray together to ask for God's wisdom.\" The divine presence softens their hearts.", right: true },
    ],
  },
  compass: {
    title: "The compass for your single life",
    blocks: [
      { type: "p", text: "On Garden of Alliance, the question of the family altar arises long before marriage. It arises today, in your single life. Ask yourself honestly: am I looking for a life partner, or am I looking for a partner *in faith*? These two profiles are not the same. A partner in faith is someone you can pray with, confess your vulnerabilities to before God, and actively invite his presence into the decisions of your life together. **The home you will build will resemble the spiritual life you are building today.**" },
    ],
  },
  quizIntro: "These questions close the whole of pillar 1. They are an opportunity to anchor the sacred vision of marriage in all its coherence.",
  quiz: [
    {
      question: "According to biblical history, what constant desire does God show towards his people?",
      options: [
        "To guide them from a distance with laws and commandments.",
        "To dwell among his people, in ever-growing closeness.",
        "To test his people's faith through successive trials.",
      ],
      answer: 1,
      explanation: "From the Tabernacle to the Incarnation, and on to the Spirit dwelling in the believer, God is the God of Emmanuel — \"God with us\". The Christian home is the most intimate extension of this reality.",
    },
    {
      question: "Why is God's presence at the centre of the home a necessity and not merely a spiritual luxury?",
      options: [
        "Because Christian neighbours expect it of the couple.",
        "Because a home without this presence is structurally vulnerable to life's storms, which two people alone cannot absorb indefinitely.",
        "Because it improves communication between spouses.",
      ],
      answer: 1,
      explanation: "Human resources run out. God's presence is the only truly inexhaustible reserve in a home in crisis.",
    },
    {
      question: "What does the \"threefold cord\" of Ecclesiastes 4:12 symbolise when applied to Christian marriage?",
      options: [
        "The three ideal children the couple should have.",
        "The three financial pillars of a stable home.",
        "The unbreakable union of two spouses and God himself, forming a covenant that cannot easily be broken.",
      ],
      answer: 2,
      explanation: "It is not a duo but a trio. When one of the spouses goes through a night, the third strand — God — holds the cord and prevents it from breaking.",
    },
    {
      question: "What is the difference between a \"clean and orderly\" home and a home that God truly inhabits?",
      options: [
        "Material wealth and lifestyle.",
        "The number of church meetings the couple attends each week.",
        "The active and sovereign presence of God at the centre, which turns a fine human partnership into a living sanctuary.",
      ],
      answer: 2,
      explanation: "The empty house of Matthew 12 is a powerful warning. Outward order offers no protection without the Master's presence inside.",
    },
  ],
  reflection: {
    title: "Closing reflection for pillar 1",
    prompt: "At the end of these six lessons, ask yourself this foundational question: if you imagined your future home as a building, which pillars would it really rest on today? The vision of the covenant (1.1), the culture of the sanctuary (1.2), the clarity of a shared purpose (1.3), the depth of commitment (1.4), mutual service without emotional martyrdom (1.5) and God's presence at the heart (1.6) — which of these pillars are already solid in you, and which still need work before you even welcome a spouse?",
  },
};

/* ───────────────────────────── Course ───────────────────────────── */

const pillar1: Pillar = {
  number: 1,
  slug: "vision-sacree",
  title: "The sacred vision of marriage",
  summary: "Laying down our illusions to embrace God's vision of the covenant: a sanctuary, a shared purpose, a commitment with no way back, mutual service and God's presence at the centre.",
  lessons: [lesson11, lesson12, lesson13, lesson14, lesson15, lesson16],
};

// Pillars 2 to 6 are still being written: they are shown as "in preparation".
const upcoming = (n: number): Pillar => ({ number: n, slug: `pilier-${n}`, title: `Pillar ${n}`, lessons: [] });

export const BATIR_SUR_LE_ROC_EN: Formation = {
  slug: "batir-sur-le-roc",
  title: "Build on the Rock",
  tagline: "Garden of Alliance's marriage preparation course, in six pillars.",
  verse: {
    text: "Everyone therefore who hears these words of mine and does them, I will liken him to a wise man who built his house on a rock.",
    ref: "Matthew 7:24",
  },
  coverImage: {
    src: `${BASE}/images/module-cover.webp`,
    card: `${BASE}/images/module-cover-carte.webp`,
    alt: "Hands placing a stone on top of a cairn of stacked stones.",
    position: "center 30%",
  },
  pillars: [pillar1, upcoming(2), upcoming(3), upcoming(4), upcoming(5), upcoming(6)],
};
