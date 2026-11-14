import { describe, it, expect } from "vitest";
import { validateExternalMeetUrl } from "./meet-external";

describe("validateExternalMeetUrl", () => {
  it.each([
    "https://meet.google.com/abc-defg-hij",
    "https://us02web.zoom.us/j/123456789?pwd=abc",
    "https://teams.microsoft.com/l/meetup-join/xyz",
    "https://mirotalk.example.org/join/room",
  ])("accepte %s", (u) => {
    expect(validateExternalMeetUrl(u).ok).toBe(true);
  });

  it("retire le www dans l'hôte et trim", () => {
    const r = validateExternalMeetUrl("  https://www.webex.com/meet/x ");
    expect(r).toMatchObject({ ok: true, host: "webex.com" });
  });

  it.each([
    ["http://meet.google.com/abc", "not_https"],
    ["https://user:pass@meet.google.com/abc", "credentials"],
    ["https://user@meet.google.com/abc", "credentials"],
    ["pas un lien", "invalid"],
    ["javascript:alert(1)", "not_https"],
    ["https://localhost/room", "private_host"],
    ["https://192.168.1.4/room", "private_host"],
    ["", "empty"],
  ])("refuse %s", (u, reason) => {
    expect(validateExternalMeetUrl(u)).toEqual({ ok: false, reason });
  });
});
