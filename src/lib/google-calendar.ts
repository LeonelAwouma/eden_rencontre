/**
 * Google Calendar API Service
 * 
 * Handles all Google Calendar / Meet interactions.
 * Uses a service account or OAuth2 credentials stored in platform_settings.
 * 
 * IMPORTANT: This module should ONLY be used server-side (API routes / Edge Functions).
 * Never expose Google credentials to the frontend.
 */

import { getSupabaseAdmin } from "./supabase-admin";

interface GoogleCalendarEvent {
  id: string;
  htmlLink: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
    conferenceSolution?: {
      name: string;
    };
  };
}

interface CreateMeetingParams {
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  attendeeEmails: string[];
  organizerEmail: string;
}

interface GoogleCredentials {
  access_token: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  token_expiry?: string;
}

/**
 * Retrieve stored Google OAuth credentials from platform_settings
 */
async function getGoogleCredentials(): Promise<GoogleCredentials | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("category", "general")
      .eq("key", "google_calendar_credentials")
      .maybeSingle();

    if (error || !data?.value || data.value === null) {
      console.error("[GoogleCalendar] No credentials found in platform_settings");
      return null;
    }

    return data.value as GoogleCredentials;
  } catch (err) {
    console.error("[GoogleCalendar] Failed to retrieve credentials:", err);
    return null;
  }
}

/**
 * Get the organizer email from platform_settings
 */
async function getOrganizerEmail(): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("category", "general")
      .eq("key", "google_organizer_email")
      .maybeSingle();

    return (data?.value as string) || "leonelawouma65@gmail.com";
  } catch {
    return "leonelawouma65@gmail.com";
  }
}

/**
 * Refresh the Google OAuth access token using the refresh token
 */
async function refreshAccessToken(credentials: GoogleCredentials): Promise<string | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("[GoogleCalendar] Token refresh failed:", response.status);
      return null;
    }

    const data = await response.json();

    // Update stored credentials with new access token
    const supabase = getSupabaseAdmin();
    const updatedCreds = {
      ...credentials,
      access_token: data.access_token,
      token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
    await supabase
      .from("platform_settings")
      .update({ value: updatedCreds, updated_at: new Date().toISOString() })
      .eq("category", "general")
      .eq("key", "google_calendar_credentials");

    return data.access_token;
  } catch (err) {
    console.error("[GoogleCalendar] Token refresh error:", err);
    return null;
  }
}

/**
 * Get a valid access token (refreshes if expired)
 */
async function getValidAccessToken(): Promise<string | null> {
  const credentials = await getGoogleCredentials();
  if (!credentials) return null;

  // Check if token is expired or about to expire (within 5 minutes)
  if (credentials.token_expiry) {
    const expiry = new Date(credentials.token_expiry);
    const now = new Date();
    if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
      return credentials.access_token;
    }
  }

  // Token expired or about to expire, refresh it
  return refreshAccessToken(credentials);
}

/**
 * Create a Google Calendar event with Google Meet conference
 */
export async function createGoogleMeetEvent(params: CreateMeetingParams): Promise<{
  success: boolean;
  eventId?: string;
  meetUrl?: string;
  calendarLink?: string;
  error?: string;
}> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return {
        success: false,
        error: "Google Calendar credentials not configured. Please add OAuth credentials in Settings > General > Google Calendar Credentials.",
      };
    }

    const organizerEmail = params.organizerEmail || await getOrganizerEmail();

    const event = {
      summary: params.title,
      description: params.description || "",
      start: {
        dateTime: params.startTime,
        timeZone: "Africa/Douala",
      },
      end: {
        dateTime: params.endTime,
        timeZone: "Africa/Douala",
      },
      attendees: [
        { email: organizerEmail, organizer: true },
        ...params.attendeeEmails.map((email) => ({ email })),
      ],
      conferenceData: {
        createRequest: {
          requestId: `eden-meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(organizerEmail)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[GoogleCalendar] Event creation failed:", response.status, errorData);
      
      // If unauthorized, try refreshing token once
      if (response.status === 401) {
        const credentials = await getGoogleCredentials();
        if (credentials) {
          const newToken = await refreshAccessToken(credentials);
          if (newToken) {
            const retryResponse = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(organizerEmail)}/events?conferenceDataVersion=1`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${newToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
              }
            );
            
            if (retryResponse.ok) {
              const retryData: GoogleCalendarEvent = await retryResponse.json();
              return extractEventResult(retryData);
            }
          }
        }
      }
      
      return {
        success: false,
        error: `Google Calendar API error: ${errorData?.error?.message || response.statusText}`,
      };
    }

    const data: GoogleCalendarEvent = await response.json();
    return extractEventResult(data);
  } catch (err: any) {
    console.error("[GoogleCalendar] Unexpected error:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Update an existing Google Calendar event
 */
export async function updateGoogleMeetEvent(
  googleEventId: string,
  params: Partial<CreateMeetingParams>
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: "Google Calendar credentials not configured" };
    }

    const organizerEmail = await getOrganizerEmail();

    const eventUpdate: Record<string, unknown> = {};
    if (params.title) eventUpdate.summary = params.title;
    if (params.description !== undefined) eventUpdate.description = params.description;
    if (params.startTime) {
      eventUpdate.start = { dateTime: params.startTime, timeZone: "Africa/Douala" };
    }
    if (params.endTime) {
      eventUpdate.end = { dateTime: params.endTime, timeZone: "Africa/Douala" };
    }
    if (params.attendeeEmails) {
      eventUpdate.attendees = [
        { email: organizerEmail, organizer: true },
        ...params.attendeeEmails.map((email) => ({ email })),
      ];
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(organizerEmail)}/events/${googleEventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventUpdate),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error?.message || response.statusText };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" };
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteGoogleMeetEvent(
  googleEventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return { success: false, error: "Google Calendar credentials not configured" };
    }

    const organizerEmail = await getOrganizerEmail();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(organizerEmail)}/events/${googleEventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 410) {
      return { success: false, error: `Delete failed: ${response.statusText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" };
  }
}

function extractEventResult(data: GoogleCalendarEvent) {
  const meetUrl =
    data.hangoutLink ||
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
    undefined;

  return {
    success: true,
    eventId: data.id,
    meetUrl,
    calendarLink: data.htmlLink,
  };
}