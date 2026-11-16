"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_LEVELS, type DisplayLevel } from "@/lib/geo/public-label";

/** Choix de localisation structurée du Cameroun (identifiants stables du référentiel, jamais des noms seuls). */
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
  verified: boolean;
  arrondissement: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  region: { id: string; name: string } | null;
}
interface Unit { id: string; name_fr: string }

const TEXT = {
  fr: {
    search: "Tapez votre ville (ex. Yaoundé)…",
    zone: "Choisir par région",
    back: "Revenir à la recherche",
    region: "Région", department: "Département", arrondissement: "Arrondissement", place: "Localité",
    choose: "Choisir…",
    notListed: "Ma localité n'est pas listée",
    manual: "Nom de votre localité",
    confirm: "Confirmer",
    change: "Modifier",
    unverified: "Localisation non vérifiée : l'équipe pourra la corriger.",
    display: "Afficher ma localisation sur mon profil",
    displayHint: "Votre ville exacte n'est jamais montrée sans votre accord. Cela n'empêche pas de découvrir des profils.",
    levels: { none: "Ne pas afficher", country: "Le pays seulement", region: "La région", department: "Le département", arrondissement: "L'arrondissement", city: "La ville" },
  },
  en: {
    search: "Type your city (e.g. Yaoundé)…",
    zone: "Pick by region",
    back: "Back to search",
    region: "Region", department: "Department", arrondissement: "District", place: "Locality",
    choose: "Choose…",
    notListed: "My locality is not listed",
    manual: "Your locality name",
    confirm: "Confirm",
    change: "Change",
    unverified: "Unverified location: the team may correct it.",
    display: "Show my location on my profile",
    displayHint: "Your exact city is never shown without your consent. This does not stop you from discovering profiles.",
    levels: { none: "Don't show", country: "Country only", region: "Region", department: "Department", arrondissement: "District", city: "City" },
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

/** Niveau d'affichage de la localisation sur le profil (jamais présélectionné au-delà de « ne pas afficher »). */
export function DisplayLevelSelect({
  value,
  onChange,
  levels = DISPLAY_LEVELS,
}: {
  value: DisplayLevel;
  onChange: (l: DisplayLevel) => void;
  levels?: readonly DisplayLevel[];
}) {
  const { locale } = useI18n();
  const T = locale === "en" ? TEXT.en : TEXT.fr;
  return (
    <div className="space-y-1.5 pt-1">
      <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{T.display}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DisplayLevel)}
        className="h-12 w-full rounded-xl border border-foreground/10 bg-card px-3 text-sm text-foreground"
      >
        {levels.map((l) => <option key={l} value={l}>{T.levels[l]}</option>)}
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

  const [mode, setMode] = useState<"search" | "zone" | "manual">("search");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [manual, setManual] = useState("");
  const [context, setContext] = useState<string>("");
  const [unverified, setUnverified] = useState(false);

  // Zone
  const [regions, setRegions] = useState<Unit[]>([]);
  const [depts, setDepts] = useState<Unit[]>([]);
  const [arrs, setArrs] = useState<Unit[]>([]);
  const [localities, setLocalities] = useState<{ id: string; name: string }[]>([]);
  const [sel, setSel] = useState({ region: "", dept: "", arr: "" });
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

  useEffect(() => {
    if (mode !== "zone" || regions.length) return;
    getJson<{ units: Unit[]; unavailable?: boolean }>("/api/geo/units?level=1").then((d) => {
      if (!d || d.unavailable) setUnavailable(true); else setRegions(d.units);
    });
  }, [mode, regions.length]);

  const pickRegion = async (id: string) => {
    setSel({ region: id, dept: "", arr: "" }); setDepts([]); setArrs([]); setLocalities([]);
    if (id) setDepts((await getJson<{ units: Unit[] }>(`/api/geo/units?parent=${id}`))?.units ?? []);
  };
  const pickDept = async (id: string) => {
    setSel((s) => ({ ...s, dept: id, arr: "" })); setArrs([]); setLocalities([]);
    if (id) setArrs((await getJson<{ units: Unit[] }>(`/api/geo/units?parent=${id}`))?.units ?? []);
  };
  const pickArr = async (id: string) => {
    setSel((s) => ({ ...s, arr: id })); setLocalities([]);
    if (id) setLocalities((await getJson<{ places: { id: string; name: string }[] }>(`/api/geo/units?parent=${id}&places=1`))?.places ?? []);
  };

  const choose = (name: string, loc: Omit<LocationChoice, "displayLevel">, ctx: string, isUnverified = false) => {
    setContext(ctx); setUnverified(isUnverified);
    onChange(name, { ...loc, displayLevel: display });
  };
  const reset = () => { onChange("", null); setQ(""); setHits([]); setContext(""); setMode("search"); };

  // Référentiel absent : on garde l'ancien parcours (liste statique + saisie libre).
  if (unavailable && !city) return <>{fallback()}</>;

  const levelSelect = (
    <DisplayLevelSelect
      value={display}
      onChange={(l) => onChange(city, { ...(location ?? {}), displayLevel: l })}
    />
  );

  if (city) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-bold text-foreground"><MapPin className="w-4 h-4 shrink-0" /> {city}</span>
            {context && <span className="block text-xs text-foreground/60 truncate">{context}</span>}
          </span>
          <button type="button" onClick={reset} className="text-xs font-semibold text-primary underline underline-offset-2 shrink-0 ml-3">{T.change}</button>
        </div>
        {unverified && <p className="text-xs text-foreground/50">{T.unverified}</p>}
        {levelSelect}
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="space-y-3">
        <Input autoFocus placeholder={T.manual} value={manual} onChange={(e) => setManual(e.target.value)}
          className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20" />
        <Button type="button" variant="outline" disabled={!manual.trim()}
          onClick={() => choose(manual.trim(), {}, "", true)}
          className="w-full h-12 rounded-xl border-primary/50 text-primary font-bold disabled:opacity-40">{T.confirm}</Button>
      </div>
    );
  }

  if (mode === "zone") {
    const Sel = ({ label, value, items, onPick, disabled }: { label: string; value: string; items: { id: string; name: string }[]; onPick: (id: string) => void; disabled?: boolean }) => (
      <label className="block space-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-foreground/60">{label}</span>
        <select value={value} disabled={disabled} onChange={(e) => onPick(e.target.value)}
          className="h-12 w-full rounded-xl border border-foreground/10 bg-card px-3 text-sm text-foreground disabled:opacity-40">
          <option value="">{T.choose}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </label>
    );
    const nameOf = (list: Unit[], id: string) => list.find((u) => u.id === id)?.name_fr ?? "";
    return (
      <div className="space-y-3">
        <Sel label={T.region} value={sel.region} items={regions.map((r) => ({ id: r.id, name: r.name_fr }))} onPick={pickRegion} />
        <Sel label={T.department} value={sel.dept} items={depts.map((r) => ({ id: r.id, name: r.name_fr }))} onPick={pickDept} disabled={!sel.region} />
        <Sel label={T.arrondissement} value={sel.arr} items={arrs.map((r) => ({ id: r.id, name: r.name_fr }))} onPick={pickArr} disabled={!sel.dept} />
        <Sel label={T.place} value="" items={localities} disabled={!sel.arr}
          onPick={(id) => {
            const p = localities.find((l) => l.id === id);
            if (!p) return;
            choose(p.name, { regionId: sel.region, departmentId: sel.dept, arrondissementId: sel.arr, placeId: p.id },
              [nameOf(arrs, sel.arr), nameOf(depts, sel.dept), nameOf(regions, sel.region)].filter(Boolean).join(" · "));
          }} />
        <button type="button" onClick={() => setMode("search")} className="text-xs font-semibold text-primary underline underline-offset-2">{T.back}</button>
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
        {hits.map((h) => {
          const ctx = [h.arrondissement?.name, h.department?.name, h.region?.name].filter(Boolean).join(" · ");
          return (
            <Button key={h.id} type="button" variant="outline"
              onClick={() => choose(h.name,
                { regionId: h.region?.id, departmentId: h.department?.id, arrondissementId: h.arrondissement?.id, placeId: h.id },
                ctx, !h.verified)}
              className="h-auto min-h-12 py-2 rounded-xl text-left justify-start px-4 border-foreground/5 bg-card hover:border-primary/50">
              <MapPin className="w-4 h-4 mr-2 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground/80 truncate">{h.name}</span>
                {ctx && <span className="block text-xs font-normal text-foreground/50 truncate">{ctx}</span>}
              </span>
            </Button>
          );
        })}
        <Button type="button" variant="outline" onClick={() => setMode("zone")}
          className="h-12 rounded-xl text-sm font-bold justify-start px-4 border-foreground/5 bg-card text-foreground/60">
          <MapPin className="w-4 h-4 mr-2 shrink-0" /> {T.zone}
        </Button>
        <Button type="button" variant="outline" onClick={() => setMode("manual")}
          className="h-12 rounded-xl text-sm font-bold justify-start px-4 italic border-foreground/5 bg-card text-foreground/40">
          <Plus className="w-4 h-4 mr-2 shrink-0" /> {T.notListed}
        </Button>
      </div>
    </div>
  );
}
