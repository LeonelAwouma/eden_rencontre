"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Flag, Globe2, MapPinOff, Trophy } from "lucide-react";
import { Card, EmptyBlock, ErrorState, StatTile } from "@/components/admin/admin-ui";
import { bboxOf, type ZoneCollection } from "@/lib/geo/geojson";
import {
  classBreaks, colorFor, countriesWithoutGeometry, legendFor, membersLabel,
  type AdminMapScope, type CountryStat, type InternationalMapResponse, type MemberSummary,
} from "@/lib/geo/admin-map";
import { BASEMAP_ATTRIBUTIONS, BORDERS_ATTRIBUTION, getBasemap } from "@/lib/geo/basemap";
import { FocusFigure, MapLegend, MapSkeleton, MapUnavailable, ZoneList, type ZoneRowData } from "./map-parts";

const AdminChoropleth = dynamic(() => import("./admin-choropleth"), { ssr: false, loading: () => <MapSkeleton /> });

type Bbox = [number, number, number, number];
/** Vue mondiale par défaut (sans les pôles, pour garder les continents lisibles). */
const WORLD: Bbox = [-165, -56, 180, 78];

// Frontières mondiales : fichier statique (Natural Earth), chargé UNE fois par session de page.
let worldPromise: Promise<ZoneCollection> | null = null;
function loadWorld(): Promise<ZoneCollection> {
  worldPromise ??= fetch("/geo/world-countries.geojson").then((r) => {
    if (!r.ok) throw new Error("world");
    return r.json() as Promise<ZoneCollection>;
  }).catch((e) => { worldPromise = null; throw e; });
  return worldPromise;
}

/**
 * International : effectifs exacts par pays (hors Cameroun) sur fond OpenStreetMap (MapTiler).
 * Pas de vue par ville : aucun référentiel international de localités n'est importé (geo_places ne contient
 * que le Cameroun) — aucune coordonnée n'est déduite d'un nom de ville saisi.
 */
export function InternationalMemberMap({ scope, onSummary }: { scope: AdminMapScope; onSummary: (s: MemberSummary) => void }) {
  const basemap = useMemo(() => getBasemap(), []);
  const [world, setWorld] = useState<ZoneCollection | null>(null);
  const [worldError, setWorldError] = useState(false);
  const [data, setData] = useState<InternationalMapResponse | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const req = useRef(0);

  useEffect(() => {
    let alive = true;
    setWorldError(false);
    loadWorld().then((w) => { if (alive) setWorld(w); }).catch(() => { if (alive) setWorldError(true); });
    return () => { alive = false; };
  }, [retry]);

  useEffect(() => {
    const id = ++req.current;
    setDataError(null);
    (async () => {
      try {
        const r = await fetch(`/api/admin/geography/international?scope=${scope}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (id !== req.current) return;
        if (r.status === 401) { setDataError("Session d'administration expirée : reconnectez-vous."); return; }
        if (!r.ok) { setDataError(j.error || "Impossible de charger les effectifs."); return; }
        setData(j as InternationalMapResponse);
        onSummary((j as InternationalMapResponse).summary);
      } catch {
        if (id === req.current) setDataError("Connexion impossible. Vérifiez le réseau puis réessayez.");
      }
    })();
  }, [scope, retry, onSummary]);

  const byCode = useMemo(() => new Map((data?.countries ?? []).map((c) => [c.code, c])), [data]);
  // Pays sans membre = 0 (donnée connue) ; « pas de données » seulement si les effectifs n'ont pas pu être lus.
  const values = useMemo(() => {
    const m = new Map<string, number>();
    if (!data || !world) return m;
    for (const f of world.features) m.set(String(f.properties.iso2), byCode.get(String(f.properties.iso2))?.count ?? 0);
    return m;
  }, [data, world, byCode]);
  const classes = useMemo(() => classBreaks((data?.countries ?? []).map((c) => c.count)), [data]);
  const legend = useMemo(() => legendFor(classes, { noData: !data }), [classes, data]);

  const missingGeometry = useMemo(
    () => (world && data ? countriesWithoutGeometry(world.features.map((f) => String(f.properties.iso2)), data.countries) : []),
    [world, data],
  );

  const fitTo = useMemo<Bbox | null>(() => {
    if (!selected || !world) return WORLD;
    const f = world.features.find((x) => x.properties.iso2 === selected);
    return f ? bboxOf({ type: "FeatureCollection", features: [f] }) ?? WORLD : WORLD;
  }, [selected, world]);

  const rows: ZoneRowData[] = (data?.countries ?? []).map((c) => ({ id: c.code, name: c.name, count: c.count, color: colorFor(c.count, classes) }));
  const sel: CountryStat | null = selected
    ? byCode.get(selected) ?? { code: selected, name: world?.features.find((f) => f.properties.iso2 === selected)?.properties.name_fr as string ?? selected, count: 0, withCity: 0 }
    : null;

  if (worldError) return <ErrorState title="Frontières mondiales indisponibles" description="Le fichier public/geo/world-countries.geojson n'a pas pu être chargé." onRetry={() => setRetry((n) => n + 1)} />;

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile icon={Globe2} label="Membres à l'étranger" value={data.indicators.abroad} />
          <StatTile icon={Flag} label="Pays représentés" value={data.indicators.countriesRepresented} />
          <StatTile icon={Trophy} label="Premier pays" value={data.indicators.top ? data.indicators.top.name : "—"}
            hint={data.indicators.top ? membersLabel(data.indicators.top.count) : "Aucun membre à l'étranger"} />
          <StatTile icon={MapPinOff} tone={data.indicators.abroadWithoutCity ? "amber" : "green"} label="À l'étranger, ville non renseignée" value={data.indicators.abroadWithoutCity} />
        </div>
      )}

      {dataError && <ErrorState title="Effectifs indisponibles" description={dataError} onRetry={() => setRetry((n) => n + 1)} />}

      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {selected ? (
          <button type="button" onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-primary hover:bg-[#EEF5EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la vue mondiale
          </button>
        ) : (
          <span className="font-semibold text-[#1F2A23]">Vue mondiale</span>
        )}
        {sel && <span className="text-[#5F6B63]">› {sel.name}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {!world ? <MapSkeleton /> : mapFailed ? (
            <MapUnavailable text="La carte ne peut pas s'afficher sur cet appareil : le classement des pays présente les mêmes effectifs." />
          ) : (
            <AdminChoropleth
              geojson={world}
              values={values}
              classes={classes}
              idProp="iso2"
              nameProp="name_fr"
              selectedId={selected}
              fitTo={fitTo}
              basemapStyleUrl={basemap.styleUrl}
              ariaLabel="Carte du monde des membres résidant hors du Cameroun, par pays. Le classement des pays présente les mêmes effectifs."
              onSelect={(z) => setSelected(z.id)}
              onFail={() => setMapFailed(true)}
            />
          )}
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-[#6B746E]">
            {basemap.styleUrl
              ? BASEMAP_ATTRIBUTIONS.map((a) => <a key={a.href} href={a.href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{a.label}</a>)
              : <span>Fond de carte non configuré (NEXT_PUBLIC_MAPTILER_KEY) : frontières seules.</span>}
            <a href={BORDERS_ATTRIBUTION.href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{BORDERS_ATTRIBUTION.label}</a>
          </p>
        </div>

        <Card className="lg:col-span-4 space-y-5 p-4">
          {sel ? (
            <div className="space-y-2">
              <FocusFigure label={`${sel.name} (${sel.code})`} value={sel.count} sub={sel.count ? "membres dans ce pays" : "Aucun membre dans ce pays"} />
              {sel.count > 0 && (
                <dl className="grid grid-cols-2 gap-2 text-[12.5px]">
                  <div className="rounded-lg bg-[#FAF8F5] px-3 py-2"><dt className="text-[#5F6B63]">Ville renseignée</dt><dd className="font-semibold tabular-nums text-[#1F2A23]">{sel.withCity.toLocaleString("fr-FR")}</dd></div>
                  <div className="rounded-lg bg-[#FAF8F5] px-3 py-2"><dt className="text-[#5F6B63]">Sans ville</dt><dd className="font-semibold tabular-nums text-[#1F2A23]">{(sel.count - sel.withCity).toLocaleString("fr-FR")}</dd></div>
                </dl>
              )}
            </div>
          ) : (
            <FocusFigure label="Membres résidant à l'étranger" value={data ? data.indicators.abroad : null}
              sub={data ? `${data.indicators.countriesRepresented} pays représenté${data.indicators.countriesRepresented > 1 ? "s" : ""}` : undefined} />
          )}
          <MapLegend items={legend} title="Membres par pays" />
          {data && data.countries.length === 0 ? (
            <EmptyBlock icon={Globe2} title="Aucun membre à l'étranger" description="Aucun compte retenu par ce filtre n'est localisé hors du Cameroun." />
          ) : (
            <ZoneList
              caption={`Classement des pays (${rows.length})`}
              rows={rows}
              selectedId={selected}
              onPick={(r) => setSelected(r.id)}
              codeOf={(r) => r.id}
              footer={
                <div className="mt-2 space-y-1.5 text-[12.5px]">
                  {missingGeometry.length > 0 && (
                    <p className="rounded-lg bg-[#FFF8EC] px-3 py-2 text-[#8A4F05]">
                      Absents du fond de frontières (comptés ci-dessus) : {missingGeometry.map((c) => `${c.name} (${c.code}) ${c.count}`).join(", ")}
                    </p>
                  )}
                  {data && data.undetermined.length > 0 && (
                    <p className="rounded-lg bg-[#FDF0F0] px-3 py-2 text-[#B83333]">
                      Pays indéterminé (code non reconnu, jamais placé sur la carte) : {data.undetermined.map((u) => `${u.code} ${u.count}`).join(", ")}
                    </p>
                  )}
                  <p className="text-[11.5px] text-[#6B746E]">
                    Vue par ville non disponible : aucun référentiel international de localités n&apos;est importé.
                  </p>
                </div>
              }
            />
          )}
        </Card>
      </div>
    </div>
  );
}
