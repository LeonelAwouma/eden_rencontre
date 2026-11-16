"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ZoneCollection } from "@/lib/geo/geojson";
import type { MapLevel, ZoneCount } from "@/lib/geo/zone-counts";
import type { MyZones } from "@/lib/geo/zone-counts-server";

export interface Crumb { level: MapLevel; id: string; name: string }
export interface ZoneRow { id: string; name: string; count: number | null }
export type MapStatus = "loading" | "ready" | "error" | "limited";

const NO_ZONES: MyZones = { regionId: null, departmentId: null, arrondissementId: null };

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const t = data.session?.access_token;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * Navigation région → département → arrondissement. Trois sources indépendantes :
 *  - noms des zones (publics, mis en cache) ;
 *  - limites GeoJSON (publiques, pour la carte seulement) ;
 *  - comptes (authentifiés, jamais mis en cache, déjà masqués sous 5 par le serveur).
 * Si le GeoJSON échoue, la liste textuelle reste utilisable (repli).
 */
export function useZoneMap() {
  const [path, setPath] = useState<Crumb[]>([]);
  const level = (path.length + 1) as MapLevel;
  const parent = path.length ? path[path.length - 1].id : null;

  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [geojson, setGeojson] = useState<ZoneCollection | null>(null);
  const [counts, setCounts] = useState<ZoneCount[]>([]);
  const [mine, setMine] = useState<MyZones>(NO_ZONES);
  const [reason, setReason] = useState<string | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [mapFailed, setMapFailed] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setStatus("loading");
    setGeojson(null);
    setCounts([]);
    const q = parent ? `level=${level}&parent=${parent}` : `level=${level}`;
    (async () => {
      const [unitsRes, geoRes, countsRes] = await Promise.allSettled([
        fetch(parent ? `/api/geo/units?parent=${parent}` : `/api/geo/units?level=${level}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`/api/geo/geojson?${q}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        (async () => {
          const r = await fetch(`/api/geo/zone-counts?${q}`, { cache: "no-store", headers: await authHeaders() });
          if (r.status === 429) throw Object.assign(new Error("limited"), { code: "limited" });
          if (!r.ok) throw new Error("error");
          return r.json();
        })(),
      ]);
      if (id !== reqId.current) return;

      const units: Array<{ id: string; name_fr: string }> = unitsRes.status === "fulfilled" ? unitsRes.value.units ?? [] : [];
      const gj: ZoneCollection | null = geoRes.status === "fulfilled" && geoRes.value?.features?.length ? geoRes.value : null;
      const cs: ZoneCount[] = countsRes.status === "fulfilled" ? countsRes.value.counts ?? [] : [];

      // noms : référentiel public, sinon noms portés par le GeoJSON
      const names = new Map<string, string>(units.map((u) => [u.id, u.name_fr]));
      if (gj) for (const f of gj.features) if (!names.has(f.properties.id)) names.set(f.properties.id, f.properties.name);
      const byCount = new Map(cs.map((c) => [c.unitId, c.count]));
      setRows([...names.entries()].map(([zid, name]) => ({ id: zid, name, count: byCount.get(zid) ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setGeojson(gj);
      setCounts(cs);
      if (countsRes.status === "fulfilled") {
        setMine(countsRes.value.mine ?? NO_ZONES);
        setReason(countsRes.value.reason ?? null);
      } else {
        setReason(null);
      }
      const limited = countsRes.status === "rejected" && (countsRes.reason as { code?: string })?.code === "limited";
      setStatus(limited ? "limited" : names.size === 0 ? "error" : "ready");
    })();
    return () => { reqId.current++; };
  }, [level, parent]);

  const drill = useCallback((z: { id: string; name: string }) => {
    setPath((p) => (p.length >= 2 ? p : [...p, { level: (p.length + 1) as MapLevel, id: z.id, name: z.name }]));
  }, []);
  const goTo = useCallback((depth: number) => setPath((p) => p.slice(0, depth)), []);

  return { path, level, rows, geojson, counts, mine, reason, status, mapFailed, setMapFailed, drill, goTo };
}
