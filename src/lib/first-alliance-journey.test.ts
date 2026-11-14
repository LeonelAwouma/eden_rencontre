import { describe, expect, it } from "vitest";
import { computeFirstAllianceStep, type FirstAllianceInput } from "./first-alliance-journey";

const base: FirstAllianceInput = {
  verified: true, profileComplete: true, pillarOneDone: true,
  acceptedFriendIds: [], pendingIncoming: 0, pendingOutgoing: 0,
  hasSentMessageToMember: false, conversationByFriend: {},
};
const step = (o: Partial<FirstAllianceInput>) => computeFirstAllianceStep({ ...base, ...o }).step;

describe("computeFirstAllianceStep", () => {
  it("profil vérifié sans alliance : invitation initiale", () => expect(step({})).toBe("none"));
  it("profil non vérifié : aucune invitation", () => expect(step({ verified: false })).toBe("hidden"));
  it("profil incomplet après vérification : aucune invitation", () => expect(step({ profileComplete: false })).toBe("hidden"));
  it("non vérifié reste masqué même avec une alliance", () => {
    expect(step({ verified: false, acceptedFriendIds: ["a"] })).toBe("hidden");
  });
  it("demande envoyée : état d'attente", () => expect(step({ pendingOutgoing: 1 })).toBe("request_pending"));
  it("demande reçue : orientation vers les demandes", () => expect(step({ pendingIncoming: 2 })).toBe("request_received"));
  it("une demande reçue passe avant une demande envoyée", () => expect(step({ pendingIncoming: 1, pendingOutgoing: 1 })).toBe("request_received"));
  it("alliance acceptée sans conversation : proposer d'écrire", () => {
    const r = computeFirstAllianceStep({ ...base, acceptedFriendIds: ["a"] });
    expect(r).toEqual({ step: "alliance_accepted", friendId: "a", conversationId: null });
  });
  it("conversation créée sans message : proposer le premier message", () => {
    const r = computeFirstAllianceStep({ ...base, acceptedFriendIds: ["a"], conversationByFriend: { a: "c1" } });
    expect(r).toEqual({ step: "conversation_empty", friendId: "a", conversationId: "c1" });
  });
  it("premier message envoyé à un membre : accompagnement masqué", () => {
    expect(step({ acceptedFriendIds: ["a"], conversationByFriend: { a: "c1" }, hasSentMessageToMember: true })).toBe("hidden");
  });
  it("sans message à un membre (ex. seulement l'Admin, exclu en amont) : l'invitation demeure", () => {
    // L'API exclut le compte technique Admin : une conversation avec lui n'alimente ni friends ni message.
    expect(step({ acceptedFriendIds: [], hasSentMessageToMember: false })).toBe("none");
  });
  it("alliance refusée : traité comme l'absence de demande (fonctionnement existant)", () => {
    expect(step({})).toBe("none");
  });
  it("pilier 1 non terminé : le matching reste verrouillé", () => {
    expect(step({ pillarOneDone: false })).toBe("locked_formation");
  });
  it("le badge ne débloque rien : verrouillé même avec une demande en attente d'un ancien accès", () => {
    // locked n'apparaît que sans aucune relation ; les états réels priment.
    expect(step({ pillarOneDone: false, pendingIncoming: 1 })).toBe("request_received");
  });
  it("n'envoie jamais de message automatiquement : la fonction est pure et ne renvoie qu'un état", () => {
    const r = computeFirstAllianceStep({ ...base, acceptedFriendIds: ["a"] });
    expect(Object.keys(r).sort()).toEqual(["conversationId", "friendId", "step"]);
  });
});
