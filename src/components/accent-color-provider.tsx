"use client";

import { useEffect } from "react";

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Fetches the accent color from the public settings API and applies it
 * as a CSS custom property on :root. Also injects a dynamic <style> tag
 * to override admin UI colors with the accent color.
 */
export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function fetchAccent() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const accent = data.accent_color || "#486B46";
        applyAccentColor(accent);
      } catch {
        // Silently fail — keep defaults
      }
    }
    fetchAccent();
  }, []);

  return <>{children}</>;
}

function applyAccentColor(accent: string) {
  const root = document.documentElement;

  // Set CSS custom properties
  root.style.setProperty("--accent-hex", accent);
  root.style.setProperty("--accent-hex-10", accent + "1a");
  root.style.setProperty("--accent-hex-20", accent + "33");
  root.style.setProperty("--accent-hex-50", accent + "80");

  const rgb = hexToRgb(accent);

  // Remove previous dynamic style if any
  const existing = document.getElementById("accent-dynamic-style");
  if (existing) existing.remove();

  // Inject a dynamic <style> tag with the accent color applied everywhere
  const style = document.createElement("style");
  style.id = "accent-dynamic-style";
  style.textContent = `
    /* ── Sidebar ── */
    .sidebar-nav-item.active {
      background: ${accent}1a !important;
      color: ${accent} !important;
    }
    .sidebar-nav-item.active::before {
      background: ${accent} !important;
    }
    .sidebar-nav-item:hover {
      background: ${accent}1a !important;
    }
    .eden-sidebar-active {
      background: ${accent}1a !important;
      color: ${accent} !important;
    }
    .eden-sidebar-active::before {
      background: ${accent} !important;
    }

    /* ── Buttons (green bg) ── */
    .eden-admin-body button[style*="background-color: rgb(56, 193, 114)"],
    .eden-admin-body .bg-\\[\\#38C172\\] {
      background-color: ${accent} !important;
    }

    /* ── Accent green text ── */
    .eden-admin-body .text-\\[\\#38C172\\],
    .eden-admin-body .text-\\[\\#486B46\\] {
      color: ${accent} !important;
    }

    /* ── Green backgrounds with opacity ── */
    .eden-admin-body .bg-\\[\\#38C172\\]\\/10,
    .eden-admin-body .bg-\\[\\#38C172\\]\\/5 {
      background-color: ${accent}1a !important;
    }

    /* ── Focus rings ── */
    .eden-admin-body input:focus,
    .eden-admin-body select:focus,
    .eden-admin-body textarea:focus {
      border-color: ${accent} !important;
      box-shadow: 0 0 0 2px ${accent}33 !important;
    }

    /* ── Ring on selected items ── */
    .eden-admin-body .ring-\\[\\#38C172\\] {
      --tw-ring-color: ${accent} !important;
    }
    .eden-admin-body .border-\\[\\#38C172\\] {
      border-color: ${accent} !important;
    }

    /* ── Approved badge ── */
    .eden-badge-approved {
      background: ${accent}1a !important;
      color: ${accent} !important;
      border-color: ${accent}33 !important;
    }

    /* ── Focus visible ── */
    :focus-visible {
      outline-color: ${accent};
    }

    /* ── Quick actions ── */
    .eden-quick-action:hover {
      border-color: ${accent} !important;
      background: ${accent}1a !important;
      box-shadow: 0 4px 16px ${accent}33 !important;
    }

    /* ── Loading spinner ── */
    .eden-admin-body .animate-spin {
      border-top-color: ${accent} !important;
    }

    /* ── Dashboard green text ── */
    .eden-dashboard-body .text-\\[\\#486B46\\] {
      color: ${accent} !important;
    }

    /* ── Card hover borders ── */
    .eden-card:hover {
      border-color: ${accent}33 !important;
    }

    /* ── Eden primary green variables ── */
    :root {
      --eden-primary-green: ${accent};
      --eden-dark-green: ${accent};
      --sidebar-active-text: ${accent};
      --sidebar-active-bar: ${accent};
    }
  `;
  document.head.appendChild(style);

  // Update theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", accent);
}
