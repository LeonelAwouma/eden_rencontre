"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CountryCityInline } from "./country-city-inline";
import type { LocationChoice } from "./cameroon-city-picker";
import type { DisplayLevel } from "@/lib/geo/public-label";
import { GeoConsentPanel } from "./geo-consent-panel";

/**
 * Édition de MA localisation depuis le profil. Seul chemin d'écriture : PUT /api/member/location
 * (profiles.city/country ne sont plus modifiés directement). Enregistre indépendamment du reste du
 * formulaire, et ne supprime aucune autre information du profil.
 */
export function MemberLocationEditor({
  country: initialCountry,
  city: initialCity,
  onSaved,
}: {
  country: string;
  city: string;
  onSaved: () => void;
}) {
  const [country, setCountry] = useState(initialCountry);
  const [city, setCity] = useState("");
  const [location, setLocation] = useState<LocationChoice | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Précharge le niveau d'affichage actuel ; la ville affichée vient de profiles (déjà publique).
  useEffect(() => {
    let alive = true;
    (async () => {
      let level: DisplayLevel | null = null;
      try {
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        const token = data.session?.access_token;
        const res = await fetch("/api/member/location", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.ok) level = (await res.json()).location?.display_level ?? null;
      } catch { /* repli : valeurs de profiles */ }
      if (!alive) return;
      // Un membre qui n'a jamais fait de choix et dont la ville est déjà publique : on conserve cet affichage
      // (aucune exposition supplémentaire) ; sinon « ne pas afficher ».
      const hasRealCity = !!initialCity && initialCity.toLowerCase() !== "non précisée";
      setLocation({ displayLevel: level ?? (hasRealCity ? "city" : "none") });
      setCity(initialCity);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [initialCity]);

  const [touched, setTouched] = useState(false);
  const dirty = touched;

  const save = async () => {
    if (!country || city.trim().length < 2) { setStatus("error"); setMessage("Choisissez un pays et une ville."); return; }
    setStatus("saving"); setMessage("");
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      const res = await fetch("/api/member/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          country,
          city: city.trim(),
          regionId: location?.regionId ?? null,
          departmentId: location?.departmentId ?? null,
          arrondissementId: location?.arrondissementId ?? null,
          placeId: location?.placeId ?? null,
          displayLevel: location?.displayLevel ?? "none",
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Erreur");
      setStatus("saved");
      setSavedCount((n) => n + 1);
      onSaved();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Erreur");
    }
  };

  // Le niveau d'affichage peut être changé depuis le panneau de confidentialité : on le relit pour ne jamais
  // l'écraser avec une valeur périmée au prochain enregistrement de la ville.
  const resyncDisplayLevel = async () => {
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      const res = await fetch("/api/member/location", { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const level = res.ok ? (await res.json()).location?.display_level : null;
      if (level) setLocation((l) => ({ ...(l ?? {}), displayLevel: level }));
    } catch { /* le prochain enregistrement relira l'état */ }
  };

  if (!ready) return null;
  return (
    <div className="space-y-3 sm:col-span-3">
      <CountryCityInline
        country={country}
        city={city}
        onChangeCountry={(c) => { setCountry(c); setTouched(true); }}
        onChangeCity={(c) => { setCity(c); setTouched(true); }}
        location={location}
        onChangeLocation={(l) => { setLocation(l ?? { displayLevel: location?.displayLevel ?? "none" }); setTouched(true); }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === "saving"}
          className="rounded-xl bg-[#486B46] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {status === "saving" ? "…" : "Enregistrer la localisation"}
        </button>
        {status === "saved" && <span className="text-xs text-[#486B46]">Localisation enregistrée.</span>}
        {status === "error" && <span className="text-xs text-red-700">{message}</span>}
      </div>
      <GeoConsentPanel refreshKey={savedCount} onChanged={resyncDisplayLevel} />
    </div>
  );
}
