"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filterCities } from "@/lib/geo";
import { groupHitsByName, visibleSuggestions, type CitySuggestion, type PlaceHit } from "@/lib/geo/city-suggestions";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Champ ville : ce qui est tapé EST la ville (le bouton « Continuer » s'active sans clic). Les suggestions
 * corrigent l'orthographe ; au Cameroun elles viennent du référentiel (/api/geo/places), ailleurs ou si le
 * référentiel est indisponible, de la liste statique du pays. Le serveur retrouve la ville à partir du nom.
 */
export function CityTypeahead({
  value,
  onChange,
  country,
  useReferential,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (city: string, placeId: string | null) => void;
  /** Nom du pays (« Cameroun »…) pour la liste statique. */
  country: string;
  /** Vrai : suggestions du référentiel géographique (Cameroun). */
  useReferential: boolean;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [apiHits, setApiHits] = useState<PlaceHit[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const reqId = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const api = useReferential && !unavailable;

  // Suggestions du référentiel (débouncées, annulables).
  useEffect(() => {
    const q = value.trim();
    if (!api || !open || q.length < 2) { setApiHits([]); return; }
    const ctl = new AbortController();
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      const data = await getJson<{ places: PlaceHit[]; unavailable?: boolean }>(
        `/api/geo/places?q=${encodeURIComponent(q)}&country=CM`, ctl.signal);
      if (id !== reqId.current) return;
      if (!data || data.unavailable) { setUnavailable(true); return; }
      setApiHits(data.places);
    }, 250);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [value, api, open]);

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [open]);

  const all: CitySuggestion[] = api
    ? groupHitsByName(apiHits)
    : filterCities(country, value.trim()).map((name) => ({ name, placeId: null }));
  const shown = open ? visibleSuggestions(value, all) : [];

  return (
    <div ref={box} className="relative">
      <Search className="absolute left-4 top-[28px] -translate-y-1/2 text-foreground/20 w-5 h-5" />
      <Input
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value, null); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        className="pl-12 h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20"
      />
      {shown.length > 0 && (
        <div role="listbox" className="mt-2 grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-1">
          {shown.map((s) => (
            <button
              key={s.name}
              type="button"
              role="option"
              aria-selected={false}
              // mousedown : la sélection passe avant la perte de focus du champ
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(s.name, s.placeId); setOpen(false); }}
              className="flex h-12 items-center rounded-xl border border-foreground/5 bg-card px-4 text-left text-sm font-bold text-foreground/80 hover:border-primary/50"
            >
              <MapPin className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
