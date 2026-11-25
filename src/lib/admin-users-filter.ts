// Filtres de la liste des utilisateurs (admin), partagés par la liste et l'export Excel :
// l'export contient exactement les membres que la liste affiche avec les mêmes filtres.

/** Requête Supabase filtrable (profiles) : on n'a besoin que de ces méthodes. */
interface Filterable<Q> {
  eq(column: string, value: string): Q;
  or(filters: string): Q;
  in(column: string, values: string[]): Q;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Plafond du filtre « En ligne » (liste d'identifiants transmise dans l'adresse). */
export const MAX_ID_FILTER = 300;
/** Identifiant qui ne correspond à aucun membre : filtre « En ligne » sans personne en ligne. */
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

export interface UserFilters {
  status?: string | null;
  plan?: string | null;
  search?: string | null;
  /** Filtre « En ligne » : identifiants des membres présents (null = pas de filtre). */
  ids?: string[] | null;
}

export function readUserFilters(params: URLSearchParams): UserFilters {
  const rawIds = params.get("ids");
  const ids = rawIds === null ? null : rawIds.split(",").filter((id) => UUID.test(id)).slice(0, MAX_ID_FILTER);
  return { status: params.get("status"), plan: params.get("plan"), search: params.get("search"), ids };
}

export function applyUserFilters<Q extends Filterable<Q>>(query: Q, { status, plan, search, ids }: UserFilters): Q {
  if (ids) query = query.in("id", ids.length ? ids : [NO_MATCH_ID]);
  if (status && status !== "all") {
    query = status === "verification_pending" ? query.eq("verification_status", "under_review") : query.eq("status", status);
  }
  if (plan && plan !== "all") query = query.eq("subscription_plan", plan);
  // Virgules et parenthèses font partie de la syntaxe du filtre « or » : on les retire de la saisie.
  const term = search?.replace(/[,()]/g, " ").trim();
  if (term) {
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%`);
  }
  return query;
}
