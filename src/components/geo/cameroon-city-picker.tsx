"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { normalizePlaceName } from "@/lib/geo/normalize";
import type { DisplayLevel } from "@/lib/geo/public-label";

/**
 * Choix de la ville au Cameroun. Le membre ne saisit QUE sa ville : l'arrondissement, le département et la région
 * sont déduits en silence par le serveur (saveMemberLocation) et ne sont jamais affichés ici.
 */
export interface LocationChoice {
  regionId?: string | null;
  departmentId?: string | null;
  arrondissementId?: string | null;
  placeId?: string | null;
  displayLevel: DisplayLevel;
}

interface PlaceHit {
  id: string;
  name: string;
}

/** Niveaux d'affichage proposés au membre. */
export const MEMBER_DISPLAY_LEVELS: readonly DisplayLevel[] = ["none", "city"];

const TEXT = {
  fr: {
    search: "Tapez votre ville (ex. Yaoundé)…",
    notListed: "Ma ville n'est pas listée",
    manual: "Nom de votre ville",
    confirm: "Confirmer",
    change: "Modifier",
    display: "Localisation affichée sur mon profil",
    displayHint: "Votre ville sert à vous proposer des profils compatibles de la même ville. Elle n'est affichée sur votre profil que si vous le choisissez.",
    levels: { none: "Ne pas afficher", city: "Afficher ma ville" } as Partial<Record<DisplayLevel, string>>,
  },
  en: {
    search: "Type your city (e.g. Yaoundé)…",
    notListed: "My city is not listed",
    manual: "Your city name",
    confirm: "Confirm",
    change: "Change",
    display: "Location shown on my profile",
    displayHint: "Your city is used to suggest compatible profiles from the same city. It only appears on your profile if you choose so.",
    levels: { none: "Don't show", city: "Show my city" } as Partial<Record<DisplayLevel, string>>,
  },
} as const;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Suggestions : un seul nom par ville. Plusieurs localités au même nom sont regroupées en une entrée sans
 * identifiant : c'est le serveur qui décide (et laisse la ville en texte libre si le nom est ambigu).
 */
export function groupHitsByName(hits: readonly PlaceHit[]): Array<{ name: string; placeId: string | null }> {
  const groups = new Map<string, { name: string; ids: Set<string> }>();
  for (const h of hits) {
    const key = normalizePlaceName(h.name);
    const g = groups.get(key) ?? { name: h.name, ids: new Set<string>() };
    g.ids.add(h.id);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ name: g.name, placeId: g.ids.size === 1 ? [...g.ids][0] : null }));
}

/** Niveau d'affichage de la localisation sur le profil (« Ne pas afficher » par défaut). */
export function DisplayLevelSelect({
  value,
  onChange,
  levels = MEMBER_DISPLAY_LEVELS,
}: {
  value: DisplayLevel;
  onChange: (l: DisplayLevel) => void;
  levels?: readonly DisplayLevel[];
}) {
  const { locale } = useI18n();
  const T = locale === "en" ? TEXT.en : TEXT.fr;
  // Un ancien niveau (région, département…) s'affiche comme « Ne pas afficher » : c'est ce que le serveur applique.
  const current = levels.includes(value) ? value : "none";
  return (
    <div className="space-y-1.5 pt-1">
      <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{T.display}</label>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as DisplayLevel)}
        className="h-12 w-full rounded-xl border border-foreground/10 bg-card px-3 text-sm text-foreground"
      >
        {levels.map((l) => <option key={l} value={l}>{T.levels[l] ?? l}</option>)}
      </select>
      <p className="text-xs text-foreground/50">{T.displayHint}</p>
    </div>
  );
}

export function CameroonCityPicker({
  city,
  location,
  onChange,
  fallback,
}: {
  city: string;
  location: LocationChoice | null;
  onChange: (city: string, location: LocationChoice | null) => void;
  /** Rendu de repli (liste statique existante) si le référentiel n'est pas installé / injoignable. */
  fallback: () => React.ReactNode;
}) {
  const { locale } = useI18n();
  const T = locale === "en" ? TEXT.en : TEXT.fr;
  const display: DisplayLevel = location?.displayLevel ?? "none";

  const [mode, setMode] = useState<"search" | "manual">("search");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [manual, setManual] = useState("");
  const reqId = useRef(0);

  // Autocomplétion (débouncée, annulable)
  useEffect(() => {
    if (mode !== "search" || city || q.trim().length < 2) { setHits([]); return; }
    const ctl = new AbortController();
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      const data = await getJson<{ places: PlaceHit[]; unavailable?: boolean }>(
        `/api/geo/places?q=${encodeURIComponent(q.trim())}&country=CM`, ctl.signal);
      if (id !== reqId.current) return;
      if (!data || data.unavailable) { setUnavailable(true); return; }
      setHits(data.places);
    }, 250);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [q, mode, city]);

  // Seule la ville (et éventuellement son identifiant) part au serveur : il déduit le reste.
  const choose = (name: string, placeId: string | null) => onChange(name, { placeId, displayLevel: display });
  const reset = () => { onChange("", null); setQ(""); setHits([]); setManual(""); setMode("search"); };

  // Référentiel absent : on garde l'ancien parcours (liste statique + saisie libre).
  if (unavailable && !city) return <>{fallback()}</>;

  if (city) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 font-bold text-foreground"><MapPin className="w-4 h-4 shrink-0" /> <span className="truncate">{city}</span></span>
          <button type="button" onClick={reset} className="text-xs font-semibold text-primary underline underline-offset-2 shrink-0 ml-3">{T.change}</button>
        </div>
        <DisplayLevelSelect value={display} onChange={(l) => onChange(city, { ...(location ?? {}), displayLevel: l })} />
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="space-y-3">
        <Input autoFocus placeholder={T.manual} value={manual} onChange={(e) => setManual(e.target.value)}
          className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20" />
        <Button type="button" variant="outline" disabled={!manual.trim()}
          onClick={() => choose(manual.trim(), null)}
          className="w-full h-12 rounded-xl border-primary/50 text-primary font-bold disabled:opacity-40">{T.confirm}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 w-5 h-5" />
        <Input placeholder={T.search} value={q} onChange={(e) => setQ(e.target.value)}
          className="pl-12 h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20" />
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-1">
        {groupHitsByName(hits).map((h) => (
          <Button key={h.name} type="button" variant="outline" onClick={() => choose(h.name, h.placeId)}
            className="h-12 rounded-xl text-left justify-start px-4 border-foreground/5 bg-card hover:border-primary/50">
            <MapPin className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate text-sm font-bold text-foreground/80">{h.name}</span>
          </Button>
        ))}
        <Button type="button" variant="outline" onClick={() => setMode("manual")}
          className="h-12 rounded-xl text-sm font-bold justify-start px-4 italic border-foreground/5 bg-card text-foreground/40">
          <Plus className="w-4 h-4 mr-2 shrink-0" /> {T.notListed}
        </Button>
      </div>
    </div>
  );
}
