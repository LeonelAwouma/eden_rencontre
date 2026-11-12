import { describe, expect, test } from "vitest";
import { TABS } from "@/components/dashboard/dashboard-types";
import {
  COACH_PROPOSAL_ANCHOR, COACH_PROPOSAL_HREF, coachNotifAction, coachNotifTextKey,
  markAllReadLocal, markReadLocal, proposalAnchorFromHash, unreadAfter, type MemberCoachNotification,
} from "./member-notifications";

const n = (id: string, kind: string, read_at: string | null = null): MemberCoachNotification =>
  ({ id, kind, title: "t", body: null, link: null, read_at, created_at: "2026-11-12T08:00:00Z" });

describe("notifications d'accompagnement côté membre", () => {
  test("le lien profond utilise un onglet RÉEL du tableau de bord (Home) et l'ancre de la carte", () => {
    const tab = new URL(COACH_PROPOSAL_HREF, "http://x").searchParams.get("tab");
    expect(TABS).toContain(tab);
    expect(COACH_PROPOSAL_HREF.endsWith(`#${COACH_PROPOSAL_ANCHOR}`)).toBe(true);
    expect(proposalAnchorFromHash(`#${COACH_PROPOSAL_ANCHOR}`)).toBe(true);
    expect(proposalAnchorFromHash("#autre")).toBe(false);
  });
  test("une proposition ouvre la carte ; une fin d'accompagnement reste dans la liste", () => {
    expect(coachNotifAction({ kind: "coach_assignment_proposed" })).toBe("open-proposal");
    expect(coachNotifAction({ kind: "assignment_ended" })).toBe("mark-read-only");
    expect(coachNotifAction({ kind: "autre" })).toBe("mark-read-only");
  });
  test("textes traduits pour les types connus, texte enregistré sinon", () => {
    expect(coachNotifTextKey("coach_assignment_proposed")).toBe("coach_assignment_proposed");
    expect(coachNotifTextKey("assignment_ended")).toBe("assignment_ended");
    expect(coachNotifTextKey("inconnu")).toBe("generic");
  });
  test("lecture individuelle : une seule ligne change ; déjà lue = inchangée", () => {
    const items = [n("a", "k"), n("b", "k"), n("c", "k", "2026-01-01T00:00:00Z")];
    const out = markReadLocal(items, "a", "NOW");
    expect(out.map((x) => x.read_at)).toEqual(["NOW", null, "2026-01-01T00:00:00Z"]);
    expect(markReadLocal(out, "c", "NOW")[2].read_at).toBe("2026-01-01T00:00:00Z");
  });
  test("lecture globale : toutes lues, dates existantes conservées", () => {
    const out = markAllReadLocal([n("a", "k"), n("c", "k", "OLD")], "NOW");
    expect(out.map((x) => x.read_at)).toEqual(["NOW", "OLD"]);
  });
  test("le compteur ne devient jamais négatif", () => {
    expect(unreadAfter(45, 1)).toBe(44);
    expect(unreadAfter(0, 1)).toBe(0);
  });
});
