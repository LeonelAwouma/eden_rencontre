"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isGenericCityLabel } from "@/lib/geo/public-label";
import { CountryCityInline } from "./country-city-inline";
import type { LocationChoice } from "./cameroon-city-picker";
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

  // La ville vient de profiles (toujours affichée sur le profil). « Non précisée » = champ vide à remplir.
  useEffect(() => {
    setLocation({ displayLevel: "city" });
    setCity(isGenericCityLabel(initialCity) ? "" : initialCity);
    setReady(true);
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
          displayLevel: "city",
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

  if (!ready) return null;
  return (
    <div className="space-y-3 sm:col-span-3">
      <CountryCityInline
        country={country}
        city={city}
        onChangeCountry={(c) => { setCountry(c); setTouched(true); }}
        onChangeCity={(c) => { setCity(c); setTouched(true); }}
        location={location}
        onChangeLocation={(l) => { setLocation({ ...(l ?? {}), displayLevel: "city" }); setTouched(true); }}
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
      <GeoConsentPanel refreshKey={savedCount} />
    </div>
  );
}
