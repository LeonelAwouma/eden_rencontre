"use client";

import { useEffect } from "react";

/**
 * Fetches the accent color from the public settings API and applies it
 * as a CSS custom property on :root. Runs on every page load.
 */
export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function fetchAccent() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const accent = data.accent_color || "#486B46";
        document.documentElement.style.setProperty("--accent-hex", accent);

        // Also generate a lighter variant (10% opacity)
        document.documentElement.style.setProperty("--accent-hex-10", accent + "1a");
        // 20% opacity
        document.documentElement.style.setProperty("--accent-hex-20", accent + "33");
        // 50% opacity
        document.documentElement.style.setProperty("--accent-hex-50", accent + "80");

        // Update favicon color / theme-color meta tag if exists
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", accent);
      } catch {
        // Silently fail — keep defaults
      }
    }
    fetchAccent();
  }, []);

  return <>{children}</>;
}