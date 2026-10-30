// Filtres de la liste des utilisateurs (admin), partagés par la liste et l'export Excel :
// l'export contient exactement les membres que la liste affiche avec les mêmes filtres.

/** Requête Supabase filtrable (profiles) : on n'a besoin que de ces méthodes. */
interface Filterable<Q> {
  eq(column: string, value: string): Q;
  or(filters: string): Q;
}

export interface UserFilters {
  status?: string | null;
  plan?: string | null;
  search?: string | null;
}

export function readUserFilters(params: URLSearchParams): UserFilters {
  return { status: params.get("status"), plan: params.get("plan"), search: params.get("search") };
}

export function applyUserFilters<Q extends Filterable<Q>>(query: Q, { status, plan, search }: UserFilters): Q {
  if (status && status !== "all") {
    query = status === "verification_pending" ? query.eq("verification_status", "under_review") : query.eq("status", status);
  }
  if (plan && plan !== "all") query = query.eq("subscription_plan", plan);
  // Virgules et parenthèses font partie de la syntaxe du filtre « or » : on les retire de la saisie.
  const term = search?.replace(/[,()]/g, " ").trim();
  if (term) {
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%`);
  }
  return query;
}
