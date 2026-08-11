"use client";

/**
 * GoogleMeetConnect
 *
 * A reusable component that allows users to connect/disconnect Google Meet.
 * Shows authorization status, handles the OAuth redirect flow, and provides
 * a test button to verify the integration works.
 *
 * Follows the UX pattern: "Activer les appels vidéo" — user explicitly opts in.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Unplug,
  ExternalLink,
} from "lucide-react";

/** Get the current Supabase access token for API calls */
async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/** Fetch wrapper that includes the Supabase Authorization header */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

interface MeetStatus {
  connected: boolean;
  hasMeetScope: boolean;
  tokenExpired: boolean;
  googleEmail: string | null;
  expiresAt: string | null;
}

interface TestResult {
  success: boolean;
  meetingUri?: string;
  meetingCode?: string;
  error?: string;
  errorCode?: string;
}

export function GoogleMeetConnect() {
  const [status, setStatus] = useState<MeetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current authorization status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await authFetch("/api/google-meet/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({
        connected: false,
        hasMeetScope: false,
        tokenExpired: false,
        googleEmail: null,
        expiresAt: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for URL params on mount (after OAuth redirect)
  useEffect(() => {
    fetchStatus();

    // Check for success/error from OAuth callback redirect
    const params = new URLSearchParams(window.location.search);
    const meetSuccess = params.get("google_meet_success");
    const meetError = params.get("google_meet_error");

    if (meetSuccess === "1") {
      setSuccessMessage("Google Meet connecté avec succès !");
      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
      // Refresh status
      setTimeout(() => fetchStatus(), 500);
    } else if (meetError) {
      setError(decodeURIComponent(meetError));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchStatus]);

  // Initiate Google Meet OAuth flow
  const handleConnect = async () => {
    setError(null);
    setSuccessMessage(null);
    setConnecting(true);

    try {
      const res = await authFetch("/api/google-meet/authorize", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la connexion.");
        setConnecting(false);
        return;
      }

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch {
      setError("Erreur de connexion au serveur.");
      setConnecting(false);
    }
  };

  // Disconnect Google Meet
  const handleDisconnect = async () => {
    setError(null);
    setSuccessMessage(null);
    setDisconnecting(true);

    try {
      const res = await authFetch("/api/google-meet/disconnect", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la déconnexion.");
      } else {
        setSuccessMessage("Google Meet déconnecté.");
        setTestResult(null);
        await fetchStatus();
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setDisconnecting(false);
    }
  };

  // Test Google Meet space creation
  const handleTest = async () => {
    setError(null);
    setTestResult(null);
    setTesting(true);

    try {
      const res = await authFetch("/api/google-meet/test", { method: "POST" });
      const data = await res.json();

      if (!res.ok && !data.success) {
        setTestResult({
          success: false,
          error: data.error || "Erreur lors du test.",
          errorCode: data.errorCode,
        });
      } else {
        setTestResult(data);
      }
    } catch {
      setTestResult({
        success: false,
        error: "Erreur de connexion au serveur.",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-2xl border border-foreground/10 bg-card">
        <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
        <span className="text-sm text-foreground/50">Vérification de l'autorisation Google Meet…</span>
      </div>
    );
  }

  const isConnected = status?.connected && status?.hasMeetScope && !status?.tokenExpired;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div
        className="rounded-2xl p-6 border"
        style={{
          borderColor: isConnected ? "#C6D4C0" : "#E8E5E0",
          background: isConnected
            ? "linear-gradient(135deg, #EEF5EC 0%, #FAF9F6 100%)"
            : "#FAF9F6",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isConnected ? "#486B46" : "#F0EDE8",
              color: isConnected ? "#FFFFFF" : "#777777",
            }}
          >
            <Video className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className="font-headline font-bold text-base"
                style={{ color: "#2F2F2F" }}
              >
                Appels vidéo Google Meet
              </h3>
              {isConnected && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#486B46", color: "#FFFFFF" }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Connecté
                </span>
              )}
              {status?.connected && status?.tokenExpired && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#C6A15B", color: "#FFFFFF" }}
                >
                  <AlertCircle className="w-3 h-3" />
                  Expiré
                </span>
              )}
            </div>

            <p className="text-sm mb-4" style={{ color: "#777777" }}>
              {isConnected
                ? `Connecté${status?.googleEmail ? ` (${status.googleEmail})` : ""}. Vous pouvez créer des espaces de réunion Google Meet pour vos appels vidéo.`
                : status?.connected && !status?.hasMeetScope
                ? "Connecté mais l'autorisation Google Meet n'a pas été accordée. Veuillez vous reconnecter."
                : "Activez les appels vidéo pour créer des réunions Google Meet directement depuis l'application."}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="h-10 font-bold rounded-xl text-sm gap-2"
                  style={{ background: "#486B46", color: "#FFFFFF" }}
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {connecting ? "Connexion…" : "Activer les appels vidéo"}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleTest}
                    disabled={testing}
                    variant="outline"
                    className="h-10 font-bold rounded-xl text-sm gap-2"
                    style={{ borderColor: "#C6D4C0", color: "#486B46" }}
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    {testing ? "Test en cours…" : "Tester Google Meet"}
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    variant="outline"
                    className="h-10 font-bold rounded-xl text-sm gap-2"
                    style={{ borderColor: "#E8E5E0", color: "#777777" }}
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unplug className="w-4 h-4" />
                    )}
                    Déconnecter
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 border animate-in fade-in slide-in-from-top-1 duration-300"
          style={{ background: "#FDF2F2", borderColor: "#FECACA" }}
        >
          <AlertCircle
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: "#DC2626" }}
          />
          <p className="text-sm" style={{ color: "#991B1B" }}>
            {error}
          </p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 border animate-in fade-in slide-in-from-top-1 duration-300"
          style={{ background: "#EEF5EC", borderColor: "#C6D4C0" }}
        >
          <CheckCircle2
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: "#486B46" }}
          />
          <p className="text-sm" style={{ color: "#2F5D2E" }}>
            {successMessage}
          </p>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div
          className="rounded-xl p-4 border"
          style={{
            background: testResult.success ? "#EEF5EC" : "#FDF2F2",
            borderColor: testResult.success ? "#C6D4C0" : "#FECACA",
          }}
        >
          {testResult.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="w-5 h-5"
                  style={{ color: "#486B46" }}
                />
                <p
                  className="font-bold text-sm"
                  style={{ color: "#2F5D2E" }}
                >
                  Espace Google Meet créé avec succès !
                </p>
              </div>
              {testResult.meetingUri && (
                <p className="text-sm pl-7" style={{ color: "#486B46" }}>
                  Lien :{" "}
                  <a
                    href={testResult.meetingUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline font-medium"
                  >
                    {testResult.meetingUri}
                  </a>
                </p>
              )}
              {testResult.meetingCode && (
                <p className="text-sm pl-7" style={{ color: "#777777" }}>
                  Code : <span className="font-mono font-medium">{testResult.meetingCode}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle
                className="w-5 h-5 shrink-0 mt-0.5"
                style={{ color: "#DC2626" }}
              />
              <p className="text-sm" style={{ color: "#991B1B" }}>
                {testResult.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}