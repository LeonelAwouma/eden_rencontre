import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeAuditMetadata } from "@/lib/coach/audit";
import { COACH_DESTS } from "@/lib/coach-nav";

/** Contrôles STATIQUES du lot 3 (séances, notes privées, comptes rendus partagés, actions). */
const root = process.cwd();
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const read = (p: string) => readFileSync(join(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}
const rel = (f: string) => f.slice(root.length + 1).replaceAll("\\", "/");

const LOT3_FILES = [
  "src/lib/coach/time-zone.ts", "src/lib/coach/sessions-model.ts", "src/lib/coach/notes-model.ts", "src/lib/coach/sessions-dto.ts",
  "src/lib/coach/notes-dto.ts", "src/lib/coach/content-dto.ts", "src/lib/coach/sessions-data.ts", "src/lib/coach/notes-data.ts",
  "src/lib/coach/content-data.ts", "src/lib/coach/lot3-api.ts",
  "src/components/coach/session-ui.tsx", "src/components/coach/member-followup.tsx", "src/components/dashboard/coach-follow-up-card.tsx",
  "src/app/coach/sessions/page.tsx", "src/app/coach/sessions/[id]/page.tsx", "src/app/coach/reports/page.tsx",
  ...[
    "src/app/api/coach/sessions", "src/app/api/coach/notes", "src/app/api/coach/reports", "src/app/api/coach/actions",
    "src/app/api/coach/members/[id]/notes", "src/app/api/coach/members/[id]/reports",
    "src/app/api/member/coach/sessions", "src/app/api/member/coach/reports", "src/app/api/member/coach/actions",
  ].flatMap((d) => walk(join(root, d)).map(rel)),
];

describe("périmètre du lot 3", () => {
  it("couvre bien les fichiers visés", () => {
    expect(LOT3_FILES.length).toBeGreaterThan(25);
    expect(LOT3_FILES).toContain("src/app/api/coach/sessions/route.ts");
    expect(LOT3_FILES).toContain("src/app/api/member/coach/actions/[id]/route.ts");
  });
  it.each(LOT3_FILES)("%s : aucune messagerie Coach-Membre, aucun lien de visioconférence, aucune séance de couple", (file) => {
    const code = strip(read(file));
    expect(code, "messagerie").not.toMatch(/\/api\/chat|conversation|messagerie|send_message|chat_messages/i);
    expect(code, "visio").not.toMatch(/google-meet|google-calendar|meeting_url|meet_url|meetingUri|createGoogleMeetEvent/);
    expect(code, "couple").not.toMatch(/\bcouple\b|member_ids|second_member|partner_id/i);
  });
  it("aucun rendu de HTML brut : le texte des notes, comptes rendus et actions est échappé par React", () => {
    for (const f of LOT3_FILES.filter((x) => x.endsWith(".tsx"))) expect(strip(read(f)), f).not.toMatch(/dangerouslySetInnerHTML|innerHTML\s*=/);
  });
  it("la navigation Coach n'a aucune entrée de messagerie, de ressources ou de couple", () => {
    for (const id of Object.keys(COACH_DESTS)) expect(id).not.toMatch(/message|chat|resource|couple/i);
    expect(Object.keys(COACH_DESTS)).toEqual(expect.arrayContaining(["sessions", "reports"]));
  });
});

describe("routes du lot 3 : garde et lecture", () => {
  const coachRoutes = LOT3_FILES.filter((f) => f.startsWith("src/app/api/coach/") && f.endsWith("route.ts"));
  it.each(coachRoutes)("%s : enveloppe `withActiveCoach` (coach actif exigé, no-store, erreurs génériques)", (file) => {
    expect(strip(read(file))).toContain("withActiveCoach(");
  });
  const memberRoutes = LOT3_FILES.filter((f) => f.startsWith("src/app/api/member/coach/") && f.endsWith("route.ts") && /(sessions|reports|actions)/.test(f));
  it.each(memberRoutes)("%s : membre approuvé exigé, identité = session, aucun paramètre ne désigne un autre membre", (file) => {
    const code = strip(read(file));
    expect(code).toContain("requireApprovedMember(");
    expect(code).not.toMatch(/searchParams\.get\(["'](member_id|user_id|id)["']\)/);
    expect(code).toContain("private, no-store");
  });
  it("les routes Coach de création/édition revérifient l'accès à CHAQUE opération (assertCoachMemberAccess)", () => {
    for (const f of ["src/app/api/coach/sessions/route.ts", "src/app/api/coach/sessions/[id]/route.ts", "src/app/api/coach/members/[id]/notes/route.ts",
      "src/app/api/coach/notes/[id]/route.ts", "src/app/api/coach/members/[id]/reports/route.ts", "src/app/api/coach/reports/[id]/route.ts",
      "src/app/api/coach/actions/route.ts", "src/app/api/coach/actions/[id]/route.ts"]) {
      expect(strip(read(f)), f).toContain("assertCoachMemberAccess(");
    }
  });
  it("aucune route n'écrit scheduled_at, duration_minutes ou status d'une séance par un UPDATE direct", () => {
    for (const f of ["src/app/api/coach/sessions/route.ts", "src/app/api/coach/sessions/[id]/route.ts"]) {
      const code = strip(read(f));
      expect(code, f).not.toMatch(/\.update\(\s*\{[^}]*\b(scheduled_at|duration_minutes|status|rescheduled_to|completed_at|cancelled_at)\b/);
    }
    const patch = strip(read("src/app/api/coach/sessions/[id]/route.ts"));
    expect(patch).toContain("coach_reschedule_session");
    expect(patch).toContain("coach_postpone_session");
    expect(patch).toContain("coach_transition_session");
  });
  it("le statut d'une action ne s'écrit que par la fonction SQL (jamais d'update direct de status / completed_at)", () => {
    for (const f of ["src/app/api/coach/actions/route.ts", "src/app/api/coach/actions/[id]/route.ts", "src/app/api/member/coach/actions/[id]/route.ts"]) {
      expect(strip(read(f)), f).not.toMatch(/\.update\(\s*\{[^}]*\b(status|completed_at)\b/);
    }
    expect(strip(read("src/app/api/member/coach/actions/[id]/route.ts"))).toContain("coach_update_action_status");
    expect(strip(read("src/app/api/coach/actions/[id]/route.ts"))).toContain("coach_update_action_status");
  });
  it("les identifiants viennent de la session : aucune route ne lit coach_id ou member_id (propriétaire) dans le corps", () => {
    for (const f of LOT3_FILES.filter((x) => x.includes("src/app/api/") && x.endsWith("route.ts"))) {
      const code = strip(read(f));
      expect(code, f).not.toMatch(/body\.(coach_id|actor_id|user_id)\b/);
    }
  });
});

describe("audit : jamais de contenu de notes, de comptes rendus ni d'actions", () => {
  it("les métadonnées opérationnelles du lot 3 sont conservées (identifiants, statuts, horodatages)", () => {
    const meta = sanitizeAuditMetadata({ member_id: "m", type: "individual", status: "scheduled", from_at: "2026-06-01T10:00:00Z", to_at: "2026-06-02T10:00:00Z", has_session: true, owner: "member", from: "todo", to: "done", new_session_id: "s", coach_id: "c" });
    expect(Object.keys(meta).sort()).toEqual(["coach_id", "from", "from_at", "has_session", "member_id", "new_session_id", "owner", "status", "to", "to_at", "type"]);
  });
  it("les champs de contenu sont écartés : titre, description, résumé, objectifs, sujets, observations, prochaines étapes, notes", () => {
    const meta = sanitizeAuditMetadata({
      title: "TITRE-SECRET", description: "DESC-SECRETE", summary: "RESUME-SECRET", objectives: "OBJ", topics: "SUJETS", observations: "OBS",
      next_steps: "ETAPES", points_to_support: "POINTS", note: "N", notes: "NN", content: "C", body: "B", member_id: "m",
    });
    expect(Object.keys(meta)).toEqual(["member_id"]);
    expect(JSON.stringify(meta)).not.toMatch(/SECRET|OBJ|SUJETS|OBS|ETAPES/);
  });
  it("aucune route du lot 3 ne passe de texte libre dans les métadonnées d'audit", () => {
    for (const f of LOT3_FILES.filter((x) => x.includes("src/app/api/") && x.endsWith("route.ts"))) {
      const code = strip(read(f));
      for (const m of code.matchAll(/(?:auditCoach|writeCoachAudit)\([^;]*?\{([^{}]*)\}\s*\)/g)) {
        expect(m[1], `${f} : ${m[0].slice(0, 80)}`).not.toMatch(/\b(title|description|summary|topic|objectives|observations|next_steps|points_to_support|\.title|\.summary|\.description)\b/);
      }
    }
  });
});
