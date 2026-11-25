"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { bboxOf, type ZoneCollection } from "@/lib/geo/geojson";
import { MAP_COLORS, colorFor, membersLabel, type ColorClass } from "@/lib/geo/admin-map";

/**
 * Choroplèthe d'administration (Cameroun et International) — même mécanique MapLibre que la carte membre
 * (geo-zone-map.tsx, laissée intacte), sans notion de « ma zone ». Polygones colorés par effectif EXACT ;
 * aucune position individuelle, aucun marqueur. Fond : style MapLibre fourni (MapTiler) ou crème uni.
 */
const PLAIN_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [{ id: "bg", type: "background" as const, paint: { "background-color": MAP_COLORS.noData } }],
};

type Bbox = [number, number, number, number];

export interface ChoroplethProps {
  geojson: ZoneCollection;
  /** identifiant de zone → effectif exact ; absent = pas de données. */
  values: ReadonlyMap<string, number>;
  classes: ColorClass[];
  /** Propriété de feature portant l'identifiant (« id » pour le Cameroun, « iso2 » pour le monde). */
  idProp: string;
  nameProp: string;
  selectedId: string | null;
  /** Emprise à cadrer ; défaut : toute la collection. */
  fitTo?: Bbox | null;
  basemapStyleUrl?: string | null;
  ariaLabel: string;
  onSelect: (z: { id: string; name: string }) => void;
  onFail: () => void;
}

function enrich(fc: ZoneCollection, values: ReadonlyMap<string, number>, classes: ColorClass[], idProp: string): ZoneCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => {
      const id = String(f.properties[idProp] ?? "");
      const v = values.has(id) ? values.get(id)! : null;
      return { ...f, properties: { ...f.properties, _fill: colorFor(v, classes), _count: v === null ? -1 : v } };
    }),
  };
}

export default function AdminChoropleth(props: ChoroplethProps) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const latest = useRef(props);
  latest.current = props;
  const hoverId = useRef<string | number | null>(null);

  // Création unique (le fond ne change pas pendant la vie du composant).
  useEffect(() => {
    if (!box.current) return;
    const { basemapStyleUrl, idProp } = latest.current;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: box.current,
        style: basemapStyleUrl || PLAIN_STYLE,
        attributionControl: false, // attributions affichées sous la carte, en clair
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true,
        renderWorldCopies: false,
        minZoom: 0.6,
      });
    } catch {
      latest.current.onFail();
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", () => { if (!readyRef.current) latest.current.onFail(); });

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

    map.on("load", () => {
      readyRef.current = true;
      const p = latest.current;
      map.addSource("zones", { type: "geojson", data: enrich(p.geojson, p.values, p.classes, idProp) as never, promoteId: idProp });
      // Sous les libellés du fond (villes, pays) pour qu'ils restent lisibles.
      const firstSymbol = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
      const opacity = basemapStyleUrl ? 0.78 : 0.95;
      map.addLayer({
        id: "zones-fill", type: "fill", source: "zones",
        paint: {
          "fill-color": ["get", "_fill"],
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], Math.min(1, opacity + 0.15), opacity],
        },
      }, firstSymbol);
      map.addLayer({
        id: "zones-line", type: "line", source: "zones",
        paint: { "line-color": "#FFFFFF", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0.8] },
      }, firstSymbol);
      map.addLayer({
        id: "zones-selected", type: "line", source: "zones",
        filter: ["==", ["to-string", ["get", idProp]], p.selectedId ?? "__none__"],
        paint: { "line-color": MAP_COLORS.selected, "line-width": 3 },
      }, firstSymbol);
      fit(map, p, false);

      map.on("mousemove", "zones-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        if (hoverId.current !== null && hoverId.current !== f.id) map.setFeatureState({ source: "zones", id: hoverId.current }, { hover: false });
        if (f.id !== undefined) { hoverId.current = f.id; map.setFeatureState({ source: "zones", id: f.id }, { hover: true }); }
        const props = f.properties as Record<string, unknown>;
        const count = Number(props._count);
        const el = document.createElement("div");
        el.style.cssText = "font:600 12.5px system-ui;color:#1F2A23;line-height:1.35";
        const t1 = document.createElement("div"); t1.textContent = String(props[latest.current.nameProp] ?? "");
        const t2 = document.createElement("div"); t2.style.cssText = "font-weight:500;color:#56615A";
        t2.textContent = count < 0 ? "Pas de données" : membersLabel(count);
        el.append(t1, t2);
        popup.setLngLat(e.lngLat).setDOMContent(el).addTo(map);
      });
      map.on("mouseleave", "zones-fill", () => {
        map.getCanvas().style.cursor = "";
        if (hoverId.current !== null) map.setFeatureState({ source: "zones", id: hoverId.current }, { hover: false });
        hoverId.current = null;
        popup.remove();
      });
      map.on("click", "zones-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, unknown>;
        latest.current.onSelect({ id: String(props[latest.current.idProp]), name: String(props[latest.current.nameProp] ?? "") });
      });
    });

    return () => { popup.remove(); map.remove(); mapRef.current = null; readyRef.current = false; };
  }, []);

  // Données / couleurs.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("zones") as maplibregl.GeoJSONSource | undefined)?.setData(enrich(props.geojson, props.values, props.classes, props.idProp) as never);
  }, [props.geojson, props.values, props.classes, props.idProp]);

  // Sélection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.setFilter("zones-selected", ["==", ["to-string", ["get", props.idProp]], props.selectedId ?? "__none__"]);
  }, [props.selectedId, props.idProp]);

  // Cadrage : au changement de niveau (nouvelle collection) ou d'emprise demandée.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    fit(map, latest.current, true);
  }, [props.geojson, props.fitTo]);

  return (
    <div
      ref={box}
      role="img"
      aria-label={props.ariaLabel}
      className="w-full overflow-hidden rounded-2xl border border-[#E8E5E0]"
      style={{ height: "clamp(360px, 60vh, 620px)", background: MAP_COLORS.noData }}
    />
  );
}

function fit(map: maplibregl.Map, p: ChoroplethProps, animate: boolean) {
  const bb = p.fitTo ?? bboxOf(p.geojson);
  if (!bb) return;
  map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 28, duration: animate ? 450 : 0, maxZoom: 9 });
}
