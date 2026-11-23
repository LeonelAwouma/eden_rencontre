"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Map as MapIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { COUNT_THRESHOLD, type MapLevel } from "@/lib/geo/zone-counts";
import type { GeoScope } from "@/lib/geo/discovery";
import { useZoneMap } from "./use-zone-map";

// MapLibre n'est chargé qu'à l'ouverture de la carte, jamais côté serveur.
const GeoZoneMap = dynamic(() => import("./geo-zone-map"), {
  ssr: false,
  loading: () => <div className="h-[340px] rounded-2xl animate-pulse" style={{ background: "#EEF5EC" }} />,
});

const T = {
  fr: {
    open: "Voir la carte", close: "Masquer la carte",
    country: "Cameroun",
    levels: { 1: "Régions", 2: "Départements", 3: "Arrondissements" } as Record<MapLevel, string>,
    hint: "Carte administrative : cliquez une zone pour l'explorer.",
    hidden: `Moins de ${COUNT_THRESHOLD} profils`,
    count: (n: number) => `${n} profil${n > 1 ? "s" : ""}`,
    legend: "Nombre de profils",
    legendHidden: `moins de ${COUNT_THRESHOLD} (non communiqué)`,
    mine: "Ma zone",
    explore: "Explorer",
    filter: "Filtrer la liste ici",
    filtering: "Liste filtrée sur cette zone",
    note: `Les nombres concernent les profils dont la ville est connue, avant compatibilité. En dessous de ${COUNT_THRESHOLD}, aucun nombre n'est affiché.`,
    loading: "Chargement de la carte…",
    error: "La carte n'est pas disponible pour le moment. Les filtres de la liste restent utilisables.",
    mapFailed: "La carte ne peut pas s'afficher sur cet appareil : utilisez la liste des zones ci-dessous.",
    limited: "Trop de requêtes pour le moment. Réessayez dans un instant.",
    reasons: {
      viewer_no_location: "Renseignez votre localisation dans votre profil pour voir les nombres de profils par zone.",
      viewer_not_enabled: "Renseignez votre ville dans votre profil pour voir les nombres de profils par zone.",
    } as Record<string, string>,
    attribution: "Limites administratives : geoBoundaries (CC BY 4.0), simplifiées. Localités : GeoNames, geonames.org (CC BY 4.0)",
  },
  en: {
    open: "Show the map", close: "Hide the map",
    country: "Cameroon",
    levels: { 1: "Regions", 2: "Departments", 3: "Districts" } as Record<MapLevel, string>,
    hint: "Administrative map: click an area to explore it.",
    hidden: `Fewer than ${COUNT_THRESHOLD} profiles`,
    count: (n: number) => `${n} profile${n > 1 ? "s" : ""}`,
    legend: "Number of profiles",
    legendHidden: `fewer than ${COUNT_THRESHOLD} (not disclosed)`,
    mine: "My area",
    explore: "Explore",
    filter: "Filter the list here",
    filtering: "List filtered on this area",
    note: `Numbers refer to profiles whose city is known, before compatibility. Below ${COUNT_THRESHOLD}, no number is shown.`,
    loading: "Loading the map…",
    error: "The map isn't available right now. The list filters still work.",
    mapFailed: "The map can't be displayed on this device: use the list of areas below.",
    limited: "Too many requests right now. Try again in a moment.",
    reasons: {
      viewer_no_location: "Add your location in your profile to see profile counts by area.",
      viewer_not_enabled: "Add your city in your profile to see profile counts by area.",
    } as Record<string, string>,
    attribution: "Administrative boundaries: geoBoundaries (CC BY 4.0), simplified. Places: GeoNames, geonames.org (CC BY 4.0)",
  },
} as const;

const LEVEL_SCOPE: Record<MapLevel, GeoScope> = { 1: "region", 2: "department", 3: "arrondissement" };
const LEGEND = [
  { c: "#C6D4C0", l: "5–9" }, { c: "#9DB896", l: "10–24" }, { c: "#6F9468", l: "25–59" }, { c: "#486B46", l: "60+" },
];

export function GeoMapSection({ geo }: { geo: { scope: GeoScope; setScope: (s: GeoScope) => void } }) {
  const { locale } = useI18n();
  const tx = locale === "en" ? T.en : T.fr;
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-bold transition-colors"
        style={{ background: open ? "#486B46" : "#EEF5EC", color: open ? "#FFFFFF" : "#486B46", border: "1px solid #C6D4C0" }}
      >
        <MapIcon className="w-4 h-4" /> {open ? tx.close : tx.open}
      </button>
      {open && <MapPanel geo={geo} tx={tx} />}
    </div>
  );
}

function MapPanel({ geo, tx }: { geo: { scope: GeoScope; setScope: (s: GeoScope) => void }; tx: typeof T.fr | typeof T.en }) {
  const z = useZoneMap();
  const mineIds = useMemo(
    () => new Set([z.mine.regionId, z.mine.departmentId, z.mine.arrondissementId].filter((x): x is string => !!x)),
    [z.mine],
  );
  const myIdAtLevel = z.level === 1 ? z.mine.regionId : z.level === 2 ? z.mine.departmentId : z.mine.arrondissementId;
  const reasonText = z.reason ? tx.reasons[z.reason] : null;
  const showMap = !!z.geojson && !z.mapFailed;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
      {/* fil d'Ariane */}
      <nav aria-label="Zones" className="flex flex-wrap items-center gap-1 text-sm">
        <button type="button" onClick={() => z.goTo(0)} className="font-bold underline-offset-2 hover:underline" style={{ color: "#486B46" }}>
          {tx.country}
        </button>
        {z.path.map((c, i) => (
          <span key={c.id} className="inline-flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6B746E" }} />
            <button type="button" onClick={() => z.goTo(i + 1)} disabled={i === z.path.length - 1}
              className="font-bold underline-offset-2 hover:underline disabled:no-underline" style={{ color: i === z.path.length - 1 ? "#2F2F2F" : "#486B46" }}>
              {c.name}
            </button>
          </span>
        ))}
        <span className="ml-2 text-xs font-bold uppercase tracking-wider" style={{ color: "#6B746E" }}>{tx.levels[z.level]}</span>
      </nav>

      {z.status === "loading" && (
        <p className="flex items-center gap-2 text-sm" style={{ color: "#486B46" }}>
          <Loader2 className="w-4 h-4 animate-spin" /> {tx.loading}
        </p>
      )}
      {z.status === "error" && <p className="text-sm" style={{ color: "#B3402F" }}>{tx.error}</p>}
      {z.status === "limited" && <p className="text-sm" style={{ color: "#B3402F" }}>{tx.limited}</p>}
      {z.geojson && z.mapFailed && <p className="text-sm" style={{ color: "#6B746E" }}>{tx.mapFailed}</p>}

      {showMap && (
        <GeoZoneMap
          geojson={z.geojson!}
          counts={z.counts}
          mineIds={mineIds}
          hint={tx.hint}
          hiddenText={tx.hidden}
          countText={tx.count}
          onZoneClick={(zone) => {
            if (z.level < 3) z.drill(zone);
            else if (zone.id === myIdAtLevel) geo.setScope(LEVEL_SCOPE[z.level]);
          }}
          onFail={() => z.setMapFailed(true)}
        />
      )}

      {showMap && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "#6B746E" }} aria-label={tx.legend}>
          <span className="font-bold uppercase tracking-wider">{tx.legend}</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded-sm" style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }} />{tx.legendHidden}</span>
          {LEGEND.map((l) => (
            <span key={l.l} className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded-sm" style={{ background: l.c }} />{l.l}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded-sm" style={{ border: "2px solid #2F4A2E" }} />{tx.mine}</span>
        </div>
      )}

      {reasonText && <p className="text-sm rounded-xl p-3" style={{ background: "#EEF5EC", border: "1px solid #C6D4C0", color: "#2F2F2F" }}>{reasonText}</p>}

      {/* Liste des zones : alternative textuelle accessible, et repli complet si la carte est indisponible. */}
      {z.rows.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {z.rows.map((r) => {
            const isMine = r.id === myIdAtLevel;
            const scope = LEVEL_SCOPE[z.level];
            const filtering = isMine && geo.scope === scope;
            return (
              <li key={r.id} className="rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
                style={{ background: "#FAF9F6", border: isMine ? "2px solid #486B46" : "1px solid #E8E5E0" }}>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "#2F2F2F" }}>
                    {r.name}{isMine && <span className="ml-2 text-[11px] font-bold uppercase" style={{ color: "#486B46" }}>{tx.mine}</span>}
                  </div>
                  <div className="text-xs" style={{ color: "#6B746E" }}>{r.count === null ? tx.hidden : tx.count(r.count)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {z.level < 3 && (
                    <button type="button" onClick={() => z.drill(r)} className="text-xs font-bold underline underline-offset-2" style={{ color: "#486B46" }}>
                      {tx.explore}
                    </button>
                  )}
                  {isMine && (
                    <button type="button" onClick={() => geo.setScope(filtering ? "none" : scope)} aria-pressed={filtering}
                      className="h-8 px-3 rounded-lg text-xs font-bold"
                      style={filtering ? { background: "#486B46", color: "#FFFFFF" } : { background: "#EEF5EC", color: "#486B46", border: "1px solid #C6D4C0" }}>
                      {filtering ? tx.filtering : tx.filter}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-relaxed" style={{ color: "#6B746E" }}>{tx.note}</p>
      <p className="text-[11px]" style={{ color: "#6B746E" }}>{tx.attribution}</p>
    </div>
  );
}
