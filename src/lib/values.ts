// Valeurs / croyances choisies à l'inscription (étape « Vos valeurs »).
// Source unique partagée entre l'inscription et le profil.

export interface MarriageValue {
  id: string;
  label: string;
  icon: string;
}

export const MARRIAGE_VALUES: MarriageValue[] = [
  { id: "priere", label: "Prière Quotidienne", icon: "🙏" },
  { id: "famille", label: "Foyer Uni", icon: "🏠" },
  { id: "travail", label: "Ambition & Travail", icon: "💼" },
  { id: "respect", label: "Respect Mutuel", icon: "⚖️" },
  { id: "enfants", label: "Éducation Chrétienne", icon: "👶" },
  { id: "service", label: "Service à l'Église", icon: "⛪" },
];

export function getValue(id: string): MarriageValue {
  return MARRIAGE_VALUES.find((v) => v.id === id) ?? { id, label: id, icon: "🕊️" };
}
