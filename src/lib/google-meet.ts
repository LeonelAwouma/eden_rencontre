/**
 * Google Meet API Service
 *
 * Handles per-user Google OAuth authorization for Google Meet,
 * token storage, refresh, and Meet space creation via the Google Meet REST API.
 *
 * IMPORTANT: This module should ONLY be used server-side (API routes).
 * Never expose Google credentials, tokens, or client secrets to the frontend.
 */

import { getSupabaseAdmin } from "./supabase-admin";

// ─── Configuration ───────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

/** The Google OAuth scope required for creating Meet spaces */
export const GOOGLE_MEET_SCOPE =
  "https://www.googleapis.com/auth/meetings.space.created";

/** Additional scopes to include during the OAuth flow (for user info) */
const ADDITIONAL_SCOPES = ["openid", "email", "profile"];

/** Build the full scope string */
function buildScopeString(): string {
  return [...ADDITIONAL_SCOPES, GOOGLE_MEET_SCOPE].join(" ");
}

// ─── Types ───────────────────────────────────────────────────

export interface GoogleMeetCredentials {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_at: string;
  scope: string;
  google_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetSpaceResult {
  success: boolean;
  meetingUri?: string;
  meetingCode?: string;
  spaceName?: string;
  error?: string;
  errorCode?: string;
}

export interface MeetAuthStatus {
  connected: boolean;
  hasMeetScope: boolean;
  tokenExpired: boolean;
  googleEmail: string | null;
  expiresAt: string | null;
}

// ─── OAuth URL Generation ────────────────────────────────────

/**
 * Generate the Google OAuth authorization URL for Google Meet.
 * This is a direct Google OAuth flow (not through Supabase) to get
 * the `meetings.space.created` scope with offline access.
 *
 * @param redirectUri - The callback URL in this application
 * @param state - A CSRF protection state parameter
 * @returns The Google OAuth authorization URL
 */
export function generateMeetAuthUrl(redirectUri: string, state: string): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: buildScopeString(),
    access_type: "offline",
    prompt: "consent",
    state,
    include_granted_scopes: "true",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ─── Token Exchange ──────────────────────────────────────────

/**
 * Exchange an authorization code for tokens and store them for the user.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  email?: string;
  error?: string;
}> {
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json().catch(() => ({}));
      console.error("[GoogleMeet] Token exchange failed:", tokenResponse.status, errData);
      return {
        success: false,
        error: `Token exchange failed: ${errData?.error_description || tokenResponse.statusText}`,
      };
    }

    const tokenData = await tokenResponse.json();
    const {
      access_token,
      refresh_token,
      expires_in,
      scope,
      token_type,
    } = tokenData;

    if (!access_token) {
      return { success: false, error: "No access token received from Google" };
    }

    // Fetch user email from Google
    let email: string | null = null;
    try {
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        email = userInfo.email || null;
      }
    } catch {
      // Non-critical: we just won't have the email
    }

    return {
      success: true,
      accessToken: access_token,
      refreshToken: refresh_token || undefined,
      expiresIn: expires_in,
      scope,
      email: email || undefined,
    };
  } catch (err: any) {
    console.error("[GoogleMeet] Token exchange error:", err);
    return { success: false, error: err.message || "Unknown token exchange error" };
  }
}

// ─── Credential Storage ──────────────────────────────────────

/**
 * Store Google Meet credentials for a user.
 */
export async function storeCredentials(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
  scope: string,
  googleEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await db.from("google_meet_credentials").upsert(
      {
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken || null,
        token_type: "Bearer",
        expires_at: expiresAt,
        scope,
        google_email: googleEmail || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[GoogleMeet] Failed to store credentials:", error.message);
      return { success: false, error: "Failed to store credentials" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[GoogleMeet] Store credentials error:", err);
    return { success: false, error: err.message || "Unknown storage error" };
  }
}

/**
 * Retrieve stored Google Meet credentials for a user.
 */
export async function getCredentials(
  userId: string
): Promise<GoogleMeetCredentials | null> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("google_meet_credentials")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as GoogleMeetCredentials;
  } catch {
    return null;
  }
}

/**
 * Delete stored Google Meet credentials for a user (revoke access).
 */
export async function deleteCredentials(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getSupabaseAdmin();
    const { error } = await db
      .from("google_meet_credentials")
      .delete()
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ─── Token Refresh ───────────────────────────────────────────

/**
 * Refresh the Google access token using the stored refresh token.
 */
async function refreshAccessToken(
  credentials: GoogleMeetCredentials
): Promise<string | null> {
  if (!credentials.refresh_token) {
    console.error("[GoogleMeet] No refresh token available for user", credentials.user_id);
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: credentials.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("[GoogleMeet] Token refresh failed:", response.status);
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    // Update stored credentials
    const db = getSupabaseAdmin();
    await db
      .from("google_meet_credentials")
      .update({
        access_token: newAccessToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", credentials.user_id);

    return newAccessToken;
  } catch (err) {
    console.error("[GoogleMeet] Token refresh error:", err);
    return null;
  }
}

/**
 * Get a valid access token for a user. Refreshes if expired.
 * Returns null if no valid token can be obtained.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const credentials = await getCredentials(userId);
  if (!credentials) return null;

  // Check if token is still valid (with 5-minute buffer)
  const expiry = new Date(credentials.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiry.getTime() - now.getTime() > bufferMs) {
    return credentials.access_token;
  }

  // Token expired or about to expire — refresh it
  return refreshAccessToken(credentials);
}

// ─── Authorization Status ────────────────────────────────────

/**
 * Check the Google Meet authorization status for a user.
 */
export async function getMeetAuthStatus(userId: string): Promise<MeetAuthStatus> {
  const credentials = await getCredentials(userId);

  if (!credentials) {
    return {
      connected: false,
      hasMeetScope: false,
      tokenExpired: false,
      googleEmail: null,
      expiresAt: null,
    };
  }

  const hasMeetScope = credentials.scope.includes(GOOGLE_MEET_SCOPE);
  const expiry = new Date(credentials.expires_at);
  const tokenExpired = expiry.getTime() <= Date.now();

  return {
    connected: true,
    hasMeetScope,
    tokenExpired,
    googleEmail: credentials.google_email,
    expiresAt: credentials.expires_at,
  };
}

// ─── Google Meet API ─────────────────────────────────────────

/**
 * Create a Google Meet space using the Google Meet REST API v2.
 *
 * POST https://meet.googleapis.com/v2/spaces
 *
 * @returns Meeting URI, code, and space name on success.
 */
export async function createMeetSpace(
  userId: string
): Promise<MeetSpaceResult> {
  try {
    // Get a valid access token (refreshes if needed)
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return {
        success: false,
        error:
          "Google Meet authorization is required. Please connect your Google account and grant Google Meet permission.",
        errorCode: "MISSING_CREDENTIALS",
      };
    }

    // Verify the Meet scope exists
    const credentials = await getCredentials(userId);
    if (credentials && !credentials.scope.includes(GOOGLE_MEET_SCOPE)) {
      return {
        success: false,
        error:
          "Google Meet authorization is required. Please reconnect your Google account and grant Google Meet permission.",
        errorCode: "MISSING_MEET_SCOPE",
      };
    }

    // Call Google Meet API
    const response = await fetch("https://meet.googleapis.com/v2/spaces", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;
      const message = errorData?.error?.message || response.statusText;

      // Handle specific error codes
      if (status === 401) {
        // Token might be expired — try refreshing and retrying once
        if (credentials) {
          const newToken = await refreshAccessToken(credentials);
          if (newToken) {
            const retryResponse = await fetch(
              "https://meet.googleapis.com/v2/spaces",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${newToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
              }
            );

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              return extractMeetResult(retryData);
            }

            const retryError = await retryResponse.json().catch(() => ({}));
            return {
              success: false,
              error: `Google Meet API error: ${retryError?.error?.message || retryResponse.statusText}`,
              errorCode: mapGoogleErrorCode(retryResponse.status),
            };
          }
        }

        return {
          success: false,
          error: "Google authentication expired. Please reconnect your Google account.",
          errorCode: "UNAUTHENTICATED",
        };
      }

      if (status === 403) {
        return {
          success: false,
          error:
            "Google Meet authorization is required. Please reconnect your Google account and grant Google Meet permission.",
          errorCode: "PERMISSION_DENIED",
        };
      }

      return {
        success: false,
        error: `Google Meet API error: ${message}`,
        errorCode: mapGoogleErrorCode(status),
      };
    }

    const data = await response.json();
    return extractMeetResult(data);
  } catch (err: any) {
    console.error("[GoogleMeet] Create space error:", err);
    return {
      success: false,
      error: err.message || "Unknown error creating Meet space",
      errorCode: "INTERNAL",
    };
  }
}

/**
 * Verify that the user's Google credentials have the Meet scope.
 * Calls the Google tokeninfo endpoint to check granted scopes.
 */
export async function verifyMeetScope(userId: string): Promise<{
  hasMeetScope: boolean;
  grantedScopes: string[];
  error?: string;
}> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return {
      hasMeetScope: false,
      grantedScopes: [],
      error: "No valid Google credentials found",
    };
  }

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
    );

    if (!response.ok) {
      return {
        hasMeetScope: false,
        grantedScopes: [],
        error: "Could not verify token scopes",
      };
    }

    const tokenInfo = await response.json();
    const scopes: string = tokenInfo.scope || "";
    const scopeList = scopes.split(" ");
    const hasMeetScope = scopeList.includes(GOOGLE_MEET_SCOPE);

    return {
      hasMeetScope,
      grantedScopes: scopeList,
    };
  } catch {
    return {
      hasMeetScope: false,
      grantedScopes: [],
      error: "Failed to verify scopes",
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function extractMeetResult(data: Record<string, unknown>): MeetSpaceResult {
  return {
    success: true,
    meetingUri: (data.meetingUri as string) || undefined,
    meetingCode: (data.meetingCode as string) || undefined,
    spaceName: (data.name as string) || undefined,
  };
}

function mapGoogleErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "INVALID_ARGUMENT";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "PERMISSION_DENIED";
    case 404:
      return "NOT_FOUND";
    case 429:
      return "RATE_LIMITED";
    case 500:
    case 502:
    case 503:
      return "GOOGLE_SERVER_ERROR";
    default:
      return "UNKNOWN_ERROR";
  }
}

/**
 * Create a state parameter for CSRF protection.
 * The state contains the user ID, optional return path, and a timestamp.
 *
 * @param userId - The user or admin ID
 * @param returnTo - Optional path to redirect after callback (e.g. "/admin/meets")
 */
export function createOAuthState(userId: string, returnTo?: string): string {
  const payload: Record<string, unknown> = {
    userId,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15),
  };
  if (returnTo) {
    payload.returnTo = returnTo;
  }
  // Base64 encode (no encryption needed — CSRF state is validated by presence, not secrecy)
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Parse and validate the OAuth state parameter.
 * Returns the userId and optional returnTo path, or null if invalid/expired.
 * State expires after 10 minutes.
 */
export function parseOAuthState(state: string): { userId: string; returnTo: string | null } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    const payload = JSON.parse(decoded);

    if (!payload.userId || !payload.timestamp) return null;

    // State expires after 10 minutes
    const age = Date.now() - payload.timestamp;
    if (age > 10 * 60 * 1000) return null;

    return {
      userId: payload.userId,
      returnTo: payload.returnTo || null,
    };
  } catch {
    return null;
  }
}