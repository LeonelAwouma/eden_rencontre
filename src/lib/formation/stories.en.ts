// English version of the Academy stories. Mirrors stories.ts: same slugs, same
// chapters and same number of takeaways (checked in development by ui.ts).
import type { Story } from "./types";

// Covers: public/formation/histoires/<slug>.en.webp (English artwork).
const cover = (file: string, width: number, height: number, title: string) =>
  ({ src: `/formation/histoires/${file}.webp`, width, height, alt: `Cover of the story “${title}”` });

const whenLoveRollsUpItsSleeves: Story = {
  slug: "quand-l-amour-retrousse-ses-manches",
  title: "When Love Rolls Up Its Sleeves",
  cover: cover("quand-l-amour-retrousse-ses-manches.en", 900, 1152, "When Love Rolls Up Its Sleeves"),
  summary: "Nathalie, 26, lives in the dream of romantic love where passion must be effortless, natural, and fluid. When she meets Éric, a passionate and dedicated young engineer, everything seems perfect during their first few months together. But when the first challenges of daily life arise—extreme fatigue, family obligations, and diverging priorities—Nathalie panics, interpreting these frictions as the end of love. Through the teachings of the *Build on the Rock* course and Éric's maturity, she discovers that true covenant love doesn't end when emotions fade: on the contrary, that is the exact moment it rolls up its sleeves to build.",
  lessons: ["1-1", "1-5"],
  chapters: [
    {
      title: "The Trap of Butterflies in the Stomach",
      blocks: [
        { type: "p", text: "For Nathalie, love had always been a matter of instant chemistry. Raised on romantic comedies and idealized social media portrayals, she was convinced that when you find \"the one,\" everything ought to flow smoothly without the slightest hitch." },
        { type: "p", text: "When she begins courting Éric on **Garden of Alliance**, she is captivated. Éric is attentive, brilliant, active in his community, and deeply rooted in faith. The first few weeks are idyllic: hours-long phone calls, shared laughter, and a unified vision of the Kingdom. Nathalie is persuaded that she has finally found perfection." },
        { type: "p", text: "But two months later, reality catches up with the couple. Éric enters an extremely intense season: his company undergoes major restructuring, and his father suddenly falls ill. Exhausted and less available, Éric is occasionally preoccupied during their conversations and misses a scheduled date due to urgent family matters." },
        { type: "p", text: "For Nathalie, it is a shock. The freshness of the beginning fades, replaced by the weight of daily life. Overcome with panic, she confides in a friend:" },
        { type: "quote", text: "The feelings aren't the same as in the beginning. I don't feel those butterflies in my stomach anymore. If it's already this hard now, it's probably proof that he isn't the right person." },
      ],
    },
    {
      title: "The Edict of Emotion vs. The Decision of the Covenant",
      blocks: [
        { type: "p", text: "Instead of trying to understand the season Éric is going through, Nathalie begins to withdraw emotionally. She adopts the posture of a spectator, waiting for Éric to \"fix things\" and bring back the feelings of the early days." },
        { type: "p", text: "One Saturday afternoon, as they meet to talk, Nathalie expresses her doubts:" },
        { type: "quote", text: "Éric, I feel like the love is fading. The magic from the beginning is gone, and I don't want to force a relationship that isn't coming naturally." },
        { type: "p", text: "Éric looks at her with remarkable maturity and surprising calm. Taking a gentle breath, he says:" },
        { type: "quote", text: "Nathalie, what you are describing are early emotions. They are wonderful, but they are only the wrapping paper. If love depended solely on butterflies in the stomach, what would we do on days of fatigue, illness, or grief? The love God demonstrates to us on the cross is not a passive emotion waiting to receive; it is an active decision to bless. Love doesn't disappear when difficulties arise: that is the moment it rolls up its sleeves." },
        { type: "p", text: "Muted yet deeply shaken by his response, Nathalie accepts Éric's suggestion: to pause their doubts and walk through **Pillar 1 of the Build on the Rock course** together." },
      ],
    },
    {
      title: "The Revelation of Foot Washing",
      blocks: [
        { type: "p", text: "As she goes through the lessons of Pillar 1, Nathalie undergoes a true inner alignment:" },
        {
          type: "points",
          items: [
            { lead: "Deconstructing Idealization (Lesson 1.1):", text: "She realizes she expected Éric to play the role of a perfect man, incapable of faltering or being tired." },
            { lead: "Mutual Service (Lesson 1.5):", text: "She discovers the model of Christ washing His disciples' feet (John 13). She understands that the greatness of a couple is not measured by the intensity of felt emotions, but by the capacity to serve one another when it costs something." },
          ],
        },
        { type: "p", text: "The turning point occurs during a shared prayer session. Nathalie realizes with humility that she had been acting as a **consumer of love** rather than an **ally in destiny**. While Éric was carrying the heavy load of his family and career, she was demanding emotional performance from him." },
        { type: "p", text: "She decides to roll up her own sleeves." },
      ],
    },
    {
      title: "From Theory to Practice",
      blocks: [
        { type: "p", text: "The following weekend, instead of waiting for Éric to plan a perfect date, Nathalie takes the initiative. She prepares a simple meal, stops by Éric's place after his hospital visit with his father, and simply offers to sit with him so he can rest without having to carry a conversation." },
        { type: "p", text: "For several weeks, she becomes a genuine support, a source of encouragement (*Ezer Kenegdo*), and a haven of peace for him." },
        { type: "p", text: "One evening, as they clean up the kitchen together after dinner, Éric looks at her with emotion in his eyes:" },
        { type: "quote", text: "Nathalie, during the first few months, I loved the way you made my heart race. Today, I love the way you know how to stand by my side in the storm. That is where I see the difference between a passing romance and a sacred covenant." },
        { type: "p", text: "Nathalie then realizes a profound truth: the intense joy and closeness she feels that evening are a hundred times deeper than the simple \"butterflies\" of the first day. It is the mature joy of two hearts that have chosen to build together." },
      ],
    },
    {
      title: "Anchored on the Rock",
      epilogue: true,
      blocks: [
        { type: "p", text: "A year later, before their loved ones and the community on Garden of Alliance, Nathalie and Éric enter into the bonds of marriage." },
        { type: "p", text: "In her vows, Nathalie speaks with a touched smile:" },
        { type: "quote", text: "For a long time, I searched for a perfect love that would make me happy without effort. Thanks to God and our journey, I understood that true love isn't found ready-made: it is built. Love is not a feeling that happens to us; it is a covenant that rolls up its sleeves every day to turn a home into a sanctuary." },
      ],
    },
  ],
  takeaways: [
    { lead: "Moving Beyond the \"Automatic Feeling\" Myth:", text: "Emotion is the starting point of a meeting, but it is the decision to love that ensures the longevity of the couple." },
    { lead: "Love as Concrete Service:", text: "To love is to know how to put your comfort aside to support your partner during their seasons of exhaustion or trial." },
    { lead: "The Transformation to Maturity:", text: "Transitioning from a consumer mindset (\"what can you make me feel?\") to an ally posture (\"how can I help you carry your burden?\")." },
  ],
};

const thePassportToTheCovenant: Story = {
  slug: "le-passeport-pour-l-alliance",
  title: "The Passport to the Covenant",
  cover: cover("le-passeport-pour-l-alliance.en", 900, 932, "The Passport to the Covenant"),
  summary: "Kevin, 30, lives with an obsession to leave his home country in search of a \"better future\" abroad. Viewing marriage as a mere means of transportation and a ticket out, he joins online platforms in hopes of finding a partner living in Europe or America. As he begins chatting with Grace, a young woman living abroad who is deeply rooted in her faith, his motives are shaken. Grace refuses to play the role of a \"relational passport\" and invites him to take the *Build on the Rock* training course on **Garden of Alliance**. This journey radically transforms Kevin's vision: from a seeker of opportunities, he becomes a man of vision and covenant, ready to build a solid sanctuary on the Rock of Christ.",
  lessons: ["1-3", "1-4"],
  chapters: [
    {
      title: "The Mirage of the Plane Ticket",
      blocks: [
        { type: "p", text: "Every evening in his small room, Kevin looks at photos of his former classmates who have settled abroad. For him, the solution to all his financial and professional difficulties boils down to one word: *Leave*." },
        { type: "p", text: "Urged on by friends who suggest that \"marrying a sister from the diaspora is the fastest way out,\" Kevin begins browsing social media and dating sites. He approaches every conversation with a single goal: finding a woman well-established abroad who can get him a visa." },
        { type: "p", text: "To Kevin, marriage is not a response to a divine mandate or a sacred covenant; it is a **contract of convenience**, a transaction where love is instrumentalized in the service of an emigration project." },
      ],
    },
    {
      title: "The Unsettling Conversation",
      blocks: [
        { type: "p", text: "It is on the **Garden of Alliance** platform that Kevin connects with Grace, a 26-year-old Christian professional living in Canada. Grace is warm, intelligent, and passionate about the Lord." },
        { type: "p", text: "Very quickly during their initial chats, Kevin subtly turns the conversation toward life in Canada, the ease of obtaining papers, and his relocation plans. But Grace, gifted with deep spiritual discernment, immediately perceives the underlying motive." },
        { type: "p", text: "Instead of getting angry, she asks him a direct question that freezes him in his tracks:" },
        { type: "quote", text: "Kevin, if tomorrow I decided to leave Canada to come and settle permanently in your country, would you still want to get to know me? Or is it my postal address that you are marrying?" },
        { type: "p", text: "Trapped by his own hypocrisy, Kevin stammers. Grace continues with gentleness yet firmness:" },
        { type: "quote", text: "I am not looking for a man who wants to use me as a passport. I am looking for a partner in faith with whom to build a sanctuary. Marriage is not an escape vehicle; it is an accelerator of destiny. If you want us to continue talking, I invite you to first take the **Build on the Rock** course available on the platform." },
      ],
    },
    {
      title: "The Revolution of Mindsets",
      blocks: [
        { type: "p", text: "Stung in his pride yet intrigued by Grace's maturity, Kevin decides to enroll in the *Build on the Rock* course." },
        { type: "p", text: "From **Pillar 1 (The Sacred Vision of Marriage)**, he experiences a complete paradigm shift:" },
        {
          type: "points",
          items: [
            { lead: "", text: "He discovers the difference between a **consumer contract** (\"what can you bring me?\") and a **sacrificial covenant** (\"what can I give?\")." },
            { lead: "", text: "He realizes the fatal dangers of marrying a material situation rather than a spiritually aligned person." },
            { lead: "", text: "He comes to understand that a home built on self-interest or escape is a house built on sand, doomed to collapse during the first storm or as soon as papers are secured." },
          ],
        },
        { type: "p", text: "As the lessons progress, the Holy Spirit works on his heart. Kevin realizes that his obsession with leaving masked a lack of trust in God's ability to bless him right where he is. He asks God for forgiveness for attempting to instrumentalize marriage and faith for selfish gain." },
      ],
    },
    {
      title: "From Transaction to Covenant",
      blocks: [
        { type: "p", text: "Transformed by the training, Kevin reaches back out to Grace a few months later with a completely different posture. He no longer talks about plane tickets or visas. He speaks of Lordship, emotional maturity, mutual service, and the family altar." },
        { type: "quote", text: "Grace, I want to thank you. You refused to be my opportunity so that I would be forced to become a man after God's own heart. Today, whether God calls me to stay here or go elsewhere, my priority is no longer to run away, but to fulfill His plan. I am no longer looking for a ride; I am looking for my Ezer Kenegdo." },
        { type: "p", text: "Touched by the sincerity of his repentance and the reality of his transformation, Grace agrees to let their relationship mature. They learn to know each other on healthy foundations: shared prayer, alignment of life visions, and emotional safety." },
      ],
    },
    {
      title: "Built on the Rock",
      epilogue: true,
      blocks: [
        { type: "p", text: "Two years later, Kevin and Grace are united before God. Whether their future unfolds on one side of the ocean or the other no longer carries primary importance: they have understood that their true homeland and ultimate security are in Christ." },
        { type: "p", text: "Looking at his wife, Kevin realizes the trap he escaped. He intended to use a woman to change countries; God used that woman to transform his heart and build with her an indestructible covenant, anchored on the Rock." },
      ],
    },
  ],
  takeaways: [
    { lead: "Dismantling the \"Passport Marriage\" Trap:", text: "Using marriage or a partner as a means of emigration or social promotion is a dangerous illusion that destroys the covenant before it even begins." },
    { lead: "The Power of Premarital Education:", text: "The truth of God's Word and structured teaching like *Build on the Rock* have the power to purify wrong motives and transform a self-interested heart into the heart of a true ally." },
    { lead: "Discernment in Online Encounters:", text: "Asking the right questions and requiring spiritual alignment and prior preparation help avoid the traps of relationships based on material interest." },
    { lead: "The True Blessing of the Ezer Kenegdo:", text: "A godly spouse does not come to fulfill your selfish ambitions, but to align you with God's will for His glory." },
  ],
};

const theEchoOfTheSanctuary: Story = {
  slug: "l-echo-du-sanctuaire",
  title: "The Echo of the Sanctuary",
  cover: cover("l-echo-du-sanctuaire.en", 900, 1350, "The Echo of the Sanctuary"),
  summary: "Two close friends, David and Christian, embark on courtship journeys. David, an impulsive and dynamic young man, meets Johanna, a composed, thoughtful, and deeply attentive woman. Despite their personality differences, they learn to build a space of emotional safety where shields are dropped. On the other hand, Christian and Héléna are nearly identical in every way and share the same love for social life, but their relationship is built on performance and entertainment. Faced with their first storm and the weariness of daily life, their two perspectives collide: one turns the trial into a refuge of grace, while the other destroys the covenant on the battleground of disappointment.",
  lessons: ["1-2", "1-1"],
  chapters: [
    {
      title: "The Weight of the Day and the Need for Rest",
      blocks: [
        { type: "p", text: "It is 7:30 PM. After an exhausting day filled with tense meetings and professional pressure, David and Christian meet at a tea shop to catch up." },
        { type: "p", text: "Christian collapses into his chair, his face drawn with tension:" },
        { type: "quote", text: "Brother, I'm drained. Today at the office was absolute chaos. I couldn't wait to see Héléna tonight to unwind and party like we love to do. But at the very first disagreement about where to go, everything blew up. We yelled at each other. I came home even more exhausted than when I left work." },
        { type: "p", text: "David looks at him with compassion. He, too, has just had a grueling day, but his face reflects a different kind of peace:" },
        { type: "quote", text: "I hear you, Christian. My day was just as heavy. But when I called Johanna earlier, the first thing she did was listen to me in silence. I'm a reactive, spontaneous person, while she's calm and composed. Yet, talking with her instantly brought me peace. Her welcoming heart gave me a fresh breath of air." },
        { type: "p", text: "David then reminds him of a key principle learned in their preparation course:" },
        { type: "quote", text: "Society evaluates us constantly. We always have to prove our worth and wear heavy armor. If our relationship or future home becomes an extension of the battlefield outside, where will we ever find rest? A relationship is meant to be a sanctuary, not a boxing ring." },
      ],
    },
    {
      title: "The Two Mirrors (The Boxing Ring vs. The Refuge)",
      blocks: [
        { type: "scene", text: "Scene A: At Christian and Héléna's (The Stage vs. The Ring)" },
        { type: "p", text: "Meanwhile, Héléna is on the phone with Johanna, venting in anger:" },
        { type: "quote", text: "Christian and I love to go out and have fun; we get along so well when everything is great! But the moment a problem arises, he raises his voice and questions everything. Honestly, I'm starting to think all men are the same. As soon as you remove the entertainment, there's nothing left." },
        { type: "p", text: "On his end, Christian confides in David:" },
        { type: "quote", text: "Ah, I knew it! She's not the right person for me. Proof is, we can't even agree during our first conflict. If she were the one, everything would be smooth without any effort." },
        { type: "p", text: "Christian was falling right back into the traps of **cynicism** and **naive idealization**: expecting an unrealistic ease and giving up the moment the mask of perfection cracks." },
        { type: "scene", text: "Scene B: Between David and Johanna (Cultivating the Sanctuary)" },
        { type: "p", text: "At the exact same time, a slight tension arises between David and Johanna over a weekend scheduling conflict. David, true to his impulsive nature, reacts sharply and raises his tone slightly." },
        { type: "p", text: "Instead of retaliating or stepping onto the boxing ring, Johanna takes a deep breath, remains composed, and speaks softly:" },
        { type: "quote", text: "David, I can see you are worn out from your day. I refuse to engage with you in tension. Let's take a few minutes to calm down, and then we can talk through this peacefully." },
        { type: "p", text: "A few minutes later, David sits down, realizes his outburst, and says to Johanna:" },
        { type: "quote", text: "Forgive me. I let the fatigue of my day spill over into our conversation. Thank you for not using my frustration as ammunition against me." },
        { type: "p", text: "Johanna smiles gently at him:" },
        { type: "quote", text: "A sanctuary isn't the absence of fatigue or imperfection. It's knowing that your weaknesses today will never be used as weapons in our next argument." },
      ],
    },
    {
      title: "The Revelation — The Sanctuary Begins Today",
      blocks: [
        { type: "p", text: "The following evening, the two friends meet again. Christian listens to David's story, stunned by the maturity of their interaction." },
        { type: "quote", text: "But David… you two are so completely different! You're a bundle of energy, and she is calm and quiet. How do you manage not to tear each other apart?" },
        { type: "p", text: "David answers clearly:" },
        { type: "quote", text: "Because we didn't look for a carbon copy of our hobbies; we looked for an **alignment of our hearts**. Héléna and you look alike when it comes to fun and partying, but you are playing roles on a theater stage. As soon as the curtain falls, you clash. With Johanna, our differences complete us. Her calm tempers my impetuousness, and my spontaneity encourages her. But above all, we chose to make our relationship an **oasis of emotional safety**." },
        { type: "p", text: "David continues, sharing the core of the message:" },
        { type: "quote", text: "The sanctuary doesn't start on the wedding day under the altar blessing. It begins during courtship and engagement. It's how you speak to a woman when you're exhausted. It's the assurance you give her that she can say 'I failed' or 'I am overwhelmed' without fearing judgment or contempt." },
      ],
    },
    {
      title: "Taking Off the Armor",
      epilogue: true,
      blocks: [
        { type: "p", text: "Deeply moved by this truth, Christian realizes he had been approaching relationships with a **consumer contract** mindset: \"As long as you entertain me, I stay; as soon as you frustrate me, I leave.\"" },
        { type: "p", text: "He decides to call Héléna—not to accuse her, but to ask for forgiveness and have a genuine, authentic conversation without masks or pretense." },
        { type: "p", text: "Meanwhile, David meets up with Johanna. Sitting beside her after another long day, he lets out a peaceful sigh. He doesn't need to put on a show. He sets his bag down, takes Johanna's hand, and prays with her for a few moments. They aren't married yet, but beneath their future roof, the atmosphere of the sanctuary is already alive: a space of grace, rest, and unshakable peace." },
      ],
    },
  ],
  takeaways: [
    { lead: "The Nature of the Sanctuary:", text: "A relationship and future home are designed to be a refuge where you can drop your armor, not an extension of the external battlefield." },
    { lead: "Personality Compatibility vs. Heart Alignment:", text: "Surface-level similarities (like enjoying the same parties or hobbies) do not guarantee peace. True stability is built on emotional safety, grace, and spiritual maturity." },
    { lead: "Conflict Resolution:", text: "On a boxing ring, if one partner crushes the other to win an argument, the entire covenant loses. In a sanctuary, both sit down to protect the relationship rather than their own ego." },
    { lead: "Early Preparation:", text: "The atmosphere of your future home is cultivated from the very first conversations during courtship. Finding inner peace with someone is often the early sign of a future sanctuary." },
  ],
};

const beyondTheParallels: Story = {
  slug: "au-dela-des-paralleles",
  title: "Beyond the Parallels",
  cover: cover("au-dela-des-paralleles.en", 848, 1264, "Beyond the Parallels"),
  summary: "Grace, 25, has just earned her degree in civil engineering. As she searches for her first job, her life becomes the stage for a dilemma: on one side, wealthy suitors with no genuine faith offer her a comfortable material future; on the other, David, an ambitious and brilliant young brother in Christ who currently lacks major opportunities, embodies a shared vision. By discovering the true meaning of *Ezer Kenegdo*, Grace comes to understand that marriage is not about current financial status, but about a shared destiny.",
  lessons: ["1-3", "1-4"],
  chapters: [
    {
      title: "The Weight of the Degree and the Silence of Offers",
      blocks: [
        { type: "p", text: "Grace contemplates her engineering degree sitting on her desk. After five years of intense study, the real world opens up before her, but responses to her job applications are slow to arrive. In addition to this professional pressure, another expectation weighs on her heart: building a home according to God's heart." },
        { type: "p", text: "Around her, suitors are not lacking. Marc, an influential young businessman she met at a career fair, pursues her intently. He promises her security, a professional network, and a life free from financial worry. The problem? Marc does not share her faith. To him, the church is merely a cultural tradition, not a living relationship with Christ." },
        { type: "p", text: "Grace remembers the lesson from **Pillar 1: The Sacred Vision of Marriage**: *A contract seeks immediate comfort, but a Covenant seeks the alignment of destiny.*" },
      ],
    },
    {
      title: "The Eclipse and the Light",
      blocks: [
        { type: "p", text: "In her local church, Grace serves in the youth ministry alongside David, 26, a computer science graduate. David is a brilliant, visionary mind, gifted with an unwavering faith. He designs high-impact tech projects, but so far, doors remain closed and investors hesitate." },
        { type: "p", text: "Despite these trials, David does not murmur. He serves the Lord with contagious joy, convinced that God is preparing his time. When Grace talks with him, she does not see a man limited by his present circumstances, but a man inhabited by a clear vision of the Kingdom." },
        { type: "p", text: "One evening, her family and some friends say to her:" },
        { type: "quote", text: "Grace, be realistic. Marc can offer you a queen's life today. Why waste your time waiting for a godly young man who has no great means to succeed?" },
        { type: "p", text: "Grace finds herself at a crossroads: choosing the **security of a partner without God** or **shared faith with a man of destiny**." },
      ],
    },
    {
      title: "The Revelation of the Ezer Kenegdo",
      blocks: [
        { type: "p", text: "One Sunday afternoon, while meditating on Genesis, Grace re-studies the concept of *Ezer Kenegdo* (Genesis 2:18). She realizes that this Hebrew term does not mean a passive assistant, but a **\"mirror strength\"**, a **\"vital rescue\"**, and a **\"co-warrior\"**." },
        { type: "p", text: "An illuminating thought strikes her mind:" },
        { type: "quote", text: "An Ezer Kenegdo is not called to sit down in a pre-made life where God is absent. She is called to unite with a man of vision to build together what God has ordained." },
        { type: "p", text: "She understands that Marc does not need an *Ezer* to fulfill God's plan; he is simply looking for a trophy partner. In contrast, David's vision requires a spiritual and intellectual synergy that she alone, by God's grace, feels the burden to support." },
      ],
    },
    {
      title: "The First Stone of the Sanctuary",
      blocks: [
        { type: "p", text: "Grace makes the decision to politely close the door to Marc's proposals and those of other non-believing suitors. She chooses to trust the Lord and not compromise her covenant." },
        { type: "p", text: "A few weeks later, as she finally lands her first job as a junior engineer, she sits down with David to discuss their life visions. David shares a project for a social impact application he has been developing for months, but which lacks strategic organization and infrastructure management." },
        { type: "p", text: "This is where their skills intersect: Grace's analytical engineering mind and David's technological vision fit together perfectly. Praying together, they realize that their union will not be a simple addition of two people, but a multiplication of strengths—Kingdom arithmetic where *two put ten thousand to flight*." },
      ],
    },
    {
      title: "Built on the Rock",
      epilogue: true,
      blocks: [
        { type: "p", text: "Two years later. Grace and David stand before the altar. David has seen his projects take off—not by passive magic, but because they traversed the planting season together, relying on prayer and hard work." },
        { type: "p", text: "Looking at David, Grace smiles. She did not marry a financial situation; she married a man after God's own heart. They built their home not on the sand of passing wealth, but on the Rock of the Covenant." },
      ],
    },
  ],
  takeaways: [
    { lead: "Facade vs. Foundation:", text: "Material wealth without the Lordship of Christ is slippery ground for a home." },
    { lead: "The True Meaning of *Ezer Kenegdo*:", text: "A wife is not a consumer of her husband's success, but a strategic and spiritual partner in his destiny." },
    { lead: "The Principle of Divine Timing:", text: "God does not only look at what a man possesses today, but at the seed of vision and faith he carries for tomorrow." },
  ],
};

export const STORIES_EN: Story[] = [
  whenLoveRollsUpItsSleeves,
  thePassportToTheCovenant,
  theEchoOfTheSanctuary,
  beyondTheParallels,
];
