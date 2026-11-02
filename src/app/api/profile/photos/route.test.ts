import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { folderOf } from "./route";

const FOLDER_A = "11111111-1111-1111-1111-111111111111";
const FOLDER_B = "22222222-2222-2222-2222-222222222222";
const PATH_A = `${FOLDER_A}/photo-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg`;

describe("folderOf (pure)", () => {
  test("reuses the folder of an existing conforming photo", () => {
    expect(folderOf([PATH_A])).toBe(FOLDER_A);
  });
  test("mints a fresh folder when there are no existing photos", () => {
    const folder = folderOf([]);
    expect(folder).toMatch(/^[0-9a-f-]{36}$/);
  });
  test("mints a fresh folder for legacy (non-conforming) entries, e.g. data: URIs", () => {
    const folder = folderOf(["data:image/jpeg;base64,abcd"]);
    expect(folder).toMatch(/^[0-9a-f-]{36}$/);
  });
  test("mints a fresh folder when the field isn't an array", () => {
    expect(folderOf(null)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

// ── Route-level permission tests (mocked Supabase + auth) ────────────────
let mockUser: { id: string; email: string } | null = null;
let mockProfile: { profile_photos: string[] | null } | null = { profile_photos: [] };
let mockListing: { name: string }[] = [];
let mockRpcResult: { data: string[] | null; error: { message: string } | null } = { data: null, error: null };
const removeSpy = vi.fn();
const createSignedUploadUrlSpy = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: async () => mockUser,
  clientIp: () => "test-ip",
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockProfile, error: null }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUploadUrl: createSignedUploadUrlSpy,
        list: async () => ({ data: mockListing, error: null }),
        remove: removeSpy,
      }),
    },
    rpc: async () => mockRpcResult,
  }),
}));

beforeEach(() => {
  mockUser = { id: "user-1", email: "a@b.com" };
  mockProfile = { profile_photos: [] };
  mockListing = [];
  mockRpcResult = { data: null, error: null };
  removeSpy.mockReset().mockResolvedValue({ data: null, error: null });
  createSignedUploadUrlSpy.mockReset().mockResolvedValue({ data: { token: "tok" }, error: null });
});

describe("POST /api/profile/photos (issue upload slot)", () => {
  test("rejects an unauthenticated caller", async () => {
    mockUser = null;
    const { POST } = await import("./route");
    const res = await POST(new NextRequest("http://x/api/profile/photos", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  test("refuses a 4th photo before even issuing a slot", async () => {
    mockProfile = { profile_photos: ["a", "b", "c"] };
    const { POST } = await import("./route");
    const res = await POST(new NextRequest("http://x/api/profile/photos", { method: "POST" }));
    expect(res.status).toBe(409);
  });

  test("issues a slot scoped to the caller's own existing folder", async () => {
    mockProfile = { profile_photos: [PATH_A] };
    const { POST } = await import("./route");
    const res = await POST(new NextRequest("http://x/api/profile/photos", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path.startsWith(`${FOLDER_A}/`)).toBe(true);
  });
});

describe("PUT /api/profile/photos (confirm upload)", () => {
  const putRequest = (path: unknown) =>
    new NextRequest("http://x/api/profile/photos", {
      method: "PUT",
      body: JSON.stringify({ path }),
      headers: { "Content-Type": "application/json" },
    });

  test("rejects an unauthenticated caller", async () => {
    mockUser = null;
    const { PUT } = await import("./route");
    const res = await PUT(putRequest(PATH_A));
    expect(res.status).toBe(401);
  });

  test("rejects a malformed path", async () => {
    const { PUT } = await import("./route");
    const res = await PUT(putRequest("not-a-media-path"));
    expect(res.status).toBe(400);
  });

  test("rejects a path belonging to a different folder than the caller's own photos (cross-account attempt)", async () => {
    mockProfile = { profile_photos: [PATH_A] };
    const foreignPath = `${FOLDER_B}/photo-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jpg`;
    const { PUT } = await import("./route");
    const res = await PUT(putRequest(foreignPath));
    expect(res.status).toBe(403);
  });

  test("rejects a path for a file that was never actually uploaded", async () => {
    mockProfile = { profile_photos: [] };
    mockListing = []; // la liste du dossier ne contient pas le fichier
    const { PUT } = await import("./route");
    const res = await PUT(putRequest(PATH_A));
    expect(res.status).toBe(400);
  });

  test("accepts a genuinely uploaded, correctly-scoped file and appends it atomically", async () => {
    mockProfile = { profile_photos: [] };
    mockListing = [{ name: PATH_A.split("/")[1] }];
    mockRpcResult = { data: [PATH_A], error: null };
    const { PUT } = await import("./route");
    const res = await PUT(putRequest(PATH_A));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profilePhotos).toEqual([PATH_A]);
    expect(removeSpy).not.toHaveBeenCalled();
  });

  test("when the atomic cap is already reached (concurrent request), returns 409 and cleans up the orphaned file", async () => {
    mockProfile = { profile_photos: [] };
    mockListing = [{ name: PATH_A.split("/")[1] }];
    mockRpcResult = { data: null, error: null }; // la fonction SQL renvoie null : plafond déjà atteint
    const { PUT } = await import("./route");
    const res = await PUT(putRequest(PATH_A));
    expect(res.status).toBe(409);
    expect(removeSpy).toHaveBeenCalledWith([PATH_A]);
  });
});
