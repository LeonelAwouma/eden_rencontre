"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { bboxOf, enrichFeatures, type ZoneCollection } from "@/lib/geo/geojson";
import type { ZoneCount } from "@/lib/geo/zone-counts";

/**
 * Carte SANS fond de tuiles : uniquement les polygones administratifs sur la couleur crème d'Eden.
 * Aucun marqueur individuel, aucune position de membre. Les étiquettes passent par des infobulles HTML
 * (pas de police distante, aucun service tiers).
 */
const STYLE = {
  version: 8 as const,
  sources: {},
  layers: [{ id: "bg", type: "background" as const, paint: { "background-color": "#FAF9F6" } }],
};

export default function GeoZoneMap({
  geojson, counts, mineIds, hint, hiddenText, countText, onZoneClick, onFail,
}: {
  geojson: ZoneCollection;
  counts: ZoneCount[];
  mineIds: ReadonlySet<string>;
  /** « Cliquez pour explorer » (traduit par l'appelant). */
  hint: string;
  hiddenText: string;
  countText: (n: number) => string;
  onZoneClick: (z: { id: string; name: string }) => void;
  onFail: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const dataRef = useRef<ZoneCollection>(geojson);
  const handlers = useRef({ onZoneClick, onFail, hint, hiddenText, countText });
  handlers.current = { onZoneClick, onFail, hint, hiddenText, countText };

  // Création unique de la carte.
  useEffect(() => {
    if (!box.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: box.current,
        style: STYLE,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true, // ne capture pas le défilement de la page sur mobile
        renderWorldCopies: false,
      });
    } catch {
      handlers.current.onFail();
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.on("error", () => { if (!readyRef.current) handlers.current.onFail(); });

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
    map.on("load", () => {
      readyRef.current = true;
      map.addSource("zones", { type: "geojson", data: dataRef.current as never });
      map.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": ["get", "fill"], "fill-opacity": 0.95 } });
      map.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": "#FFFFFF", "line-width": 1.2 } });
      map.addLayer({
        id: "zones-mine", type: "line", source: "zones", filter: ["==", ["get", "mine"], 1],
        paint: { "line-color": "#2F4A2E", "line-width": 2.5 },
      });
      const bb = bboxOf(dataRef.current);
      if (bb) map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 24, duration: 0 });

      map.on("mousemove", "zones-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const p = f.properties as { name: string; count: number | string | null };
        const n = p.count === null || p.count === "null" || p.count === undefined ? null : Number(p.count);
        const h = handlers.current;
        const el = document.createElement("div");
        el.style.cssText = "font:600 12px system-ui;color:#2F2F2F";
        const t1 = document.createElement("div"); t1.textContent = p.name;
        const t2 = document.createElement("div"); t2.style.cssText = "font-weight:500;color:#6B746E"; t2.textContent = n === null ? h.hiddenText : h.countText(n);
        el.append(t1, t2);
        popup.setLngLat(e.lngLat).setDOMContent(el).addTo(map);
      });
      map.on("mouseleave", "zones-fill", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
      map.on("click", "zones-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { id: string; name: string };
        handlers.current.onZoneClick({ id: p.id, name: p.name });
      });
    });

    return () => { popup.remove(); map.remove(); mapRef.current = null; readyRef.current = false; };
  }, []);

  // Mise à jour des limites / comptes sans recréer la carte.
  useEffect(() => {
    const enriched = enrichFeatures(geojson, counts, mineIds);
    dataRef.current = enriched;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("zones") as maplibregl.GeoJSONSource | undefined)?.setData(enriched as never);
    const bb = bboxOf(enriched);
    if (bb) map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 24, duration: 400 });
  }, [geojson, counts, mineIds]);

  return (
    <div
      ref={box}
      role="img"
      aria-label={hint}
      className="w-full rounded-2xl overflow-hidden"
      style={{ height: 340, background: "#FAF9F6", border: "1px solid #E8E5E0" }}
    />
  );
}
