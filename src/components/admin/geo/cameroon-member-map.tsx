"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Layers, MapPin, AlertTriangle } from "lucide-react";
import { Card, EmptyBlock, ErrorState, StatTile } from "@/components/admin/admin-ui";
import type { ZoneCollection } from "@/lib/geo/geojson";
import type { MapLevel } from "@/lib/geo/zone-counts";
import { classBreaks, colorFor, legendFor, type AdminMapScope, type CameroonMapResponse, type MemberSummary } from "@/lib/geo/admin-map";
import { Breadcrumbs, FocusFigure, MapLegend, MapSkeleton, MapUnavailable, ZoneList, type ZoneRowData } from "./map-parts";

const AdminChoropleth = dynamic(() => import("./admin-choropleth"), { ssr: false, loading: () => <MapSkeleton /> });

interface Crumb { id: string; name: string }
interface Geometry { geojson: ZoneCollection | null; names: Map<string, string> }

const LEVEL_NOUN: Record<MapLevel, { plural: string; unattached: string }> = {
  1: { plural: "Régions", unattached: "Sans région" },
  2: { plural: "Départements", unattached: "Sans département" },
  3: { plural: "Arrondissements", unattached: "Sans arrondissement" },
};

/**
 * Cameroun : régions → départements → arrondissements. Trois chargements indépendants :
 * contours (public, en cache, gardés en mémoire), noms (public), effectifs (admin, sans cache, rechargés
 * seuls quand le filtre de statut change). Les réponses périmées sont ignorées.
 */
export function CameroonMemberMap({ scope, onSummary }: { scope: AdminMapScope; onSummary: (s: MemberSummary) => void }) {
  const [path, setPath] = useState<Crumb[]>([]);
  const level = (path.length + 1) as MapLevel;
  const parent = path.length ? path[path.length - 1].id : null;
  const key = `${level}:${parent ?? ""}`;

  const geoCache = useRef(new Map<string, Geometry>());
  const [geo, setGeo] = useState<{ key: string; value: Geometry } | null>(null);
  const [geoError, setGeoError] = useState(false);

  const [data, setData] = useState<{ key: string; value: CameroonMapResponse } | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const geoReq = useRef(0);
  const dataReq = useRef(0);

  // Contours + noms (ne dépendent pas du filtre de statut).
  useEffect(() => {
    const cached = geoCache.current.get(key);
    if (cached) { setGeo({ key, value: cached }); setGeoError(false); return; }
    const id = ++geoReq.current;
    setGeoError(false);
    const q = parent ? `level=${level}&parent=${parent}` : `level=${level}`;
    (async () => {
      const [unitsRes, geoRes] = await Promise.allSettled([
        fetch(parent ? `/api/geo/units?parent=${parent}` : `/api/geo/units?level=${level}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`/api/geo/geojson?${q}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      ]);
      if (id !== geoReq.current) return;
      const units: Array<{ id: string; name_fr: string }> = unitsRes.status === "fulfilled" ? unitsRes.value.units ?? [] : [];
      const gj: ZoneCollection | null = geoRes.status === "fulfilled" && geoRes.value?.features?.length ? geoRes.value : null;
      const names = new Map<string, string>(units.map((u) => [u.id, u.name_fr]));
      if (gj) for (const f of gj.features) if (!names.has(f.properties.id)) names.set(f.properties.id, f.properties.name);
      if (unitsRes.status === "rejected" && geoRes.status === "rejected") { setGeoError(true); return; }
      const value = { geojson: gj, names };
      geoCache.current.set(key, value);
      setGeo({ key, value });
    })();
  }, [key, level, parent, retry]);

  // Effectifs (admin) : rechargés au changement de niveau ou de filtre.
  useEffect(() => {
    const id = ++dataReq.current;
    setDataError(null);
    const p = new URLSearchParams({ level: String(level), scope });
    if (parent) p.set("parent", parent);
    (async () => {
      try {
        const r = await fetch(`/api/admin/geography/map?${p}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (id !== dataReq.current) return;
        if (r.status === 401) { setDataError("Session d'administration expirée : reconnectez-vous."); return; }
        if (!r.ok) { setDataError(j.error || "Impossible de charger les effectifs."); return; }
        setData({ key: `${key}|${scope}`, value: j as CameroonMapResponse });
        onSummary((j as CameroonMapResponse).summary);
      } catch {
        if (id === dataReq.current) setDataError("Connexion impossible. Vérifiez le réseau puis réessayez.");
      }
    })();
  }, [key, level, parent, scope, retry, onSummary]);

  const g = geo?.key === key ? geo.value : null;
  const d = data?.key === `${key}|${scope}` ? data.value : null;

  const values = useMemo(() => new Map((d?.counts ?? []).map((c) => [c.unitId, c.count])), [d]);
  const classes = useMemo(() => classBreaks(values.values()), [values]);
  const legend = useMemo(() => legendFor(classes, { noData: !!g?.geojson && g.geojson.features.some((f) => d && !values.has(f.properties.id)) }), [classes, g, d, values]);

  const rows: ZoneRowData[] = useMemo(() => {
    if (!g) return [];
    const ids = new Set([...g.names.keys(), ...values.keys()]);
    return [...ids]
      .map((id) => {
        const count = values.get(id) ?? 0;
        return { id, name: g.names.get(id) ?? "Zone sans nom", count, color: colorFor(count, classes) };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
  }, [g, values, classes]);

  const drillOrSelect = useCallback((z: { id: string; name: string }) => {
    if (path.length >= 2) { setSelected(z.id); return; }
    setSelected(null);
    setPath((p) => [...p, { id: z.id, name: z.name }]);
  }, [path.length]);
  const goTo = (depth: number) => { setSelected(null); setPath((p) => p.slice(0, depth)); };

  const noun = LEVEL_NOUN[level];
  const perimeterTotal = d ? d.counts.reduce((s, c) => s + c.count, 0) + d.unattached + d.inconsistent : null;
  const where = path.length ? path[path.length - 1].name : "au Cameroun";
  const selectedRow = selected ? rows.find((r) => r.id === selected) ?? null : null;

  if (geoError) return <ErrorState title="Contours indisponibles" description="Le référentiel géographique n'a pas pu être lu." onRetry={() => setRetry((n) => n + 1)} />;
  if (g && g.names.size === 0 && !g.geojson) {
    return <EmptyBlock icon={Layers} title="Référentiel non importé" description="Lancez l'import du référentiel du Cameroun (scripts/geo/import-cameroon.mjs) pour afficher la carte." />;
  }

  return (
    <div className="space-y-4">
      {d && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <StatTile icon={MapPin} label="Localisés au Cameroun" value={d.summary.cameroon} />
          <StatTile icon={Layers} label="Rattachés à une région" value={d.summary.cameroonWithRegion} />
          <StatTile icon={AlertTriangle} tone={d.summary.cameroonWithoutRegion ? "amber" : "green"} label="Au Cameroun, sans région" value={d.summary.cameroonWithoutRegion} />
        </div>
      )}

      <Breadcrumbs items={["Cameroun", ...path.map((c) => c.name)]} onGo={goTo} />

      {dataError && <ErrorState title="Effectifs indisponibles" description={dataError} onRetry={() => setRetry((n) => n + 1)} />}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {!g ? <MapSkeleton /> : mapFailed || !g.geojson ? (
            <MapUnavailable text={!g.geojson ? "Les contours de ce niveau ne sont pas disponibles : la liste ci-contre reste exacte." : "La carte ne peut pas s'afficher sur cet appareil : consultez la liste des zones."} />
          ) : (
            <AdminChoropleth
              geojson={g.geojson}
              values={values}
              classes={classes}
              idProp="id"
              nameProp="name"
              selectedId={selected}
              ariaLabel={`Carte des membres par ${noun.plural.toLowerCase()} ${path.length ? `— ${where}` : "du Cameroun"}. La liste des zones présente les mêmes effectifs.`}
              onSelect={drillOrSelect}
              onFail={() => setMapFailed(true)}
            />
          )}
          <p className="mt-2 text-[12px] text-[#6B746E]">
            {path.length < 2 ? `Cliquez sur une zone pour afficher ses ${path.length === 0 ? "départements" : "arrondissements"}.` : "Niveau le plus fin : cliquez sur un arrondissement pour le mettre en évidence."}
          </p>
        </div>

        <Card className="lg:col-span-4 space-y-5 p-4">
          {selectedRow ? (
            <FocusFigure label={selectedRow.name} value={selectedRow.count} sub="membres dans cet arrondissement" />
          ) : (
            <FocusFigure
              label={path.length ? `Membres — ${where}` : "Membres localisés au Cameroun"}
              value={perimeterTotal}
              sub={d && d.unattached ? `dont ${d.unattached.toLocaleString("fr-FR")} ${noun.unattached.toLowerCase()}` : undefined}
            />
          )}
          <MapLegend items={legend} />
          <ZoneList
            caption={`${noun.plural} (${rows.length})`}
            rows={rows}
            selectedId={selected}
            onPick={(r) => drillOrSelect({ id: r.id, name: r.name })}
            emptyText="Aucune zone dans ce périmètre."
            footer={d && (d.unattached > 0 || d.inconsistent > 0) ? (
              <ul className="mt-2 space-y-1 text-[12.5px]">
                {d.unattached > 0 && (
                  <li className="flex justify-between gap-3 rounded-lg bg-[#FFF8EC] px-3 py-2 text-[#8A4F05]">
                    <span>{noun.unattached} (localisation à compléter)</span>
                    <span className="tabular-nums font-semibold">{d.unattached.toLocaleString("fr-FR")}</span>
                  </li>
                )}
                {d.inconsistent > 0 && (
                  <li className="flex justify-between gap-3 rounded-lg bg-[#FDF0F0] px-3 py-2 text-[#B83333]">
                    <span>Rattachement incohérent avec {path.length === 0 ? "le référentiel" : path.length === 1 ? "la région" : "le département"}</span>
                    <span className="tabular-nums font-semibold">{d.inconsistent.toLocaleString("fr-FR")}</span>
                  </li>
                )}
              </ul>
            ) : null}
          />
        </Card>
      </div>
    </div>
  );
}
