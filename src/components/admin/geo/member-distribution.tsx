"use client";

import { useCallback, useState } from "react";
import { Globe2, HelpCircle, MapPin, MapPinOff, Users } from "lucide-react";
import { FilterTabs, SectionTitle, StatTile } from "@/components/admin/admin-ui";
import type { AdminMapScope, MemberSummary } from "@/lib/geo/admin-map";
import { CameroonMemberMap } from "./cameroon-member-map";
import { InternationalMemberMap } from "./international-member-map";

type View = "cameroon" | "international";

/**
 * Admin → Géographie : répartition RÉELLE des comptes membres (effectifs exacts, sans seuil), indépendante
 * des consentements de découverte. Deux vues, un même filtre de statut et les mêmes indicateurs généraux.
 */
export function MemberDistribution() {
  const [view, setView] = useState<View>("cameroon");
  const [scope, setScope] = useState<AdminMapScope>("approved");
  const [summary, setSummary] = useState<MemberSummary | null>(null);
  const onSummary = useCallback((s: MemberSummary) => setSummary(s), []);

  return (
    <section className="space-y-4" aria-labelledby="member-distribution-title">
      <SectionTitle
        id="member-distribution-title"
        title="Répartition des membres"
        subtitle="Tous les comptes membres retenus par le filtre, qu'ils aient ou non activé la recherche par zone. Effectifs exacts ; aucune identité ni position individuelle."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <FilterTabs<View>
          label="Carte"
          value={view}
          onChange={setView}
          options={[{ value: "cameroon", label: "Cameroun", icon: MapPin }, { value: "international", label: "International", icon: Globe2 }]}
        />
        <FilterTabs<AdminMapScope>
          label="Comptes pris en compte"
          value={scope}
          onChange={setScope}
          options={[{ value: "approved", label: "Comptes approuvés" }, { value: "all", label: "Approuvés, en attente et suspendus" }]}
        />
      </div>

      {summary && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <StatTile icon={Users} label="Membres retenus" value={summary.total} />
          <StatTile icon={MapPin} label="Au Cameroun" value={summary.cameroon} />
          <StatTile icon={Globe2} label="À l'étranger" value={summary.abroad} />
          <StatTile icon={HelpCircle} tone={summary.undetermined ? "amber" : "green"} label="Pays indéterminé" value={summary.undetermined} />
          <StatTile icon={MapPinOff} tone={summary.noLocation ? "amber" : "green"} label="Sans localisation" value={summary.noLocation} />
        </div>
      )}

      {view === "cameroon"
        ? <CameroonMemberMap scope={scope} onSummary={onSummary} />
        : <InternationalMemberMap scope={scope} onSummary={onSummary} />}
    </section>
  );
}
