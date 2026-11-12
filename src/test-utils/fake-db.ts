/**
 * Faux client Supabase pour les tests (aucune connexion, aucune clé).
 * Il applique réellement filtres, tri multi-clés, `count`, `limit` et PROJECTION DE COLONNES : une route qui
 * demanderait une colonne interdite (ou `*`) la recevrait vraiment, et chaque lecture est consignée dans `log`
 * pour pouvoir prouver ce qui a été demandé.
 */
export type Row = Record<string, unknown>;
export interface DbError { code?: string; message: string }

export interface QueryLog {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  columns: string;
  filters: [string, string, unknown][];
}

export interface FakeWorld {
  tables: Record<string, Row[]>;
  user: { id: string; email: string } | null;
  rpc?: (fn: string, args: Record<string, unknown>) => { data: unknown; error: DbError | null };
  /** Retourne une erreur pour simuler une panne de lecture/écriture ciblée. */
  failWhen?: (q: QueryLog) => DbError | null;
  log: QueryLog[];
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  /** Appels d'administration d'Auth (déconnexion forcée, blocage, suppression) : doivent rester vides si rien ne le justifie. */
  authAdminCalls?: string[];
  /** Si défini, `auth.getUser(token)` ne reconnaît QUE ces jetons (sinon : n'importe quel jeton, comme avant). */
  validTokens?: string[];
  /** Valeurs par défaut de la base (ex. `published_at: null`) fusionnées sous le contenu d'un insert, par table. */
  insertDefaults?: Record<string, Record<string, unknown>>;
}

export const newWorld = (): FakeWorld => ({ tables: {}, user: null, log: [], rpcCalls: [], authAdminCalls: [] });

type Order = { col: string; asc: boolean };

function compare(a: unknown, b: unknown, asc: boolean): number {
  const an = a === null || a === undefined;
  const bn = b === null || b === undefined;
  // Postgres : NULL en dernier en croissant, en premier en décroissant.
  if (an && bn) return 0;
  if (an) return asc ? 1 : -1;
  if (bn) return asc ? -1 : 1;
  const r = (a as string | number) < (b as string | number) ? -1 : (a as string | number) > (b as string | number) ? 1 : 0;
  return asc ? r : -r;
}

export function createFakeDb(world: FakeWorld) {
  // Compteur porté par le « monde » : chaque getSupabaseAdmin() crée un NOUVEAU faux client, les identifiants ne doivent pas se répéter.
  const seq = world as FakeWorld & { idSeq?: number };
  const db = {
    auth: {
      getUser: async (token?: string) => {
        const known = !world.validTokens || (typeof token === "string" && world.validTokens.includes(token));
        return { data: { user: known ? world.user : null }, error: null };
      },
      admin: {
        signOut: async () => { world.authAdminCalls?.push("signOut"); return { error: null }; },
        updateUserById: async () => { world.authAdminCalls?.push("updateUserById"); return { error: null }; },
        deleteUser: async () => { world.authAdminCalls?.push("deleteUser"); return { error: null }; },
      },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      world.rpcCalls.push({ fn, args });
      const out = world.rpc?.(fn, args) ?? { data: null, error: { message: "rpc non simulé" } };
      return { data: out.data, error: out.error };
    },
    from: (table: string) => {
      let op: QueryLog["op"] = "select";
      let columns = "*";
      let countExact = false;
      let head = false;
      let payload: Row = {};
      let limitN: number | null = null;
      const filters: [string, string, unknown][] = [];
      const orders: Order[] = [];
      let single = false;
      let returning: string | null = null; // colonnes demandées par .select() APRÈS un insert / update

      const q: Record<string, unknown> = {};
      const exec = () => {
        const entry: QueryLog = { table, op, columns, filters: [...filters] };
        world.log.push(entry);
        const err = world.failWhen?.(entry) ?? null;
        if (err) return { data: null, error: err, count: null };

        const all = world.tables[table] ?? (world.tables[table] = []);
        // `.or("col.op.val,col2.op2.val2")` : une seule clause (ANDée avec les autres filtres), vraie si AU MOINS
        // une des conditions séparées par virgule est vraie. Seuls `ilike` (sous-chaîne, insensible à la casse,
        // bornes `*` optionnelles) et `eq` sont simulés — suffisant pour les filtres de recherche testés ici.
        const matchesOrClause = (r: Row, expr: string) => expr.split(",").some((part) => {
          const d1 = part.indexOf(".");
          const d2 = part.indexOf(".", d1 + 1);
          if (d1 < 0 || d2 < 0) return false;
          const column = part.slice(0, d1);
          const op = part.slice(d1 + 1, d2);
          const raw = part.slice(d2 + 1);
          const cell = r[column];
          if (op === "ilike") {
            const pattern = raw.replace(/^\*/, "").replace(/\*$/, "");
            return typeof cell === "string" && cell.toLowerCase().includes(pattern.toLowerCase());
          }
          if (op === "eq") return String(cell) === raw;
          return false;
        });
        const matches = (r: Row) => filters.every(([kind, col, val]) => {
          if (kind === "eq") return r[col] === val;
          if (kind === "neq") return r[col] !== val;
          if (kind === "in") return Array.isArray(val) && val.includes(r[col]);
          if (kind === "is") return (r[col] ?? null) === val;
          if (kind === "or") return matchesOrClause(r, col);
          return true;
        });

        const projectCols = (cols: string, r: Row): Row => {
          const wantedCols = cols === "*" ? null : cols.split(",").map((c) => c.trim()).filter(Boolean);
          return wantedCols ? Object.fromEntries(wantedCols.filter((c) => c in r).map((c) => [c, r[c]])) : { ...r };
        };
        if (op === "insert") {
          // Identifiants de forme UUID : les routes les valident (isUuid).
          const row = { id: `00000000-0000-4000-8000-${String((seq.idSeq = (seq.idSeq ?? 0) + 1)).padStart(12, "0")}`, ...(world.insertDefaults?.[table] ?? {}), ...payload };
          all.push(row);
          if (returning !== null) {
            const out = projectCols(returning, row);
            return { data: single ? out : [out], error: null, count: null };
          }
          return { data: null, error: null, count: null };
        }
        if (op === "update") {
          const hits = all.filter(matches);
          hits.forEach((r) => Object.assign(r, payload));
          if (returning !== null) {
            const out = hits.map((r) => projectCols(returning!, r));
            return { data: single ? (out[0] ?? null) : out, error: null, count: null };
          }
          const hit = hits[0];
          return { data: single ? (hit ? { id: hit.id } : null) : null, error: null, count: null };
        }
        if (op === "delete") {
          world.tables[table] = all.filter((r) => !matches(r));
          return { data: null, error: null, count: null };
        }

        let rows = all.filter(matches);
        if (orders.length) {
          rows = [...rows].sort((a, b) => {
            for (const o of orders) { const c = compare(a[o.col], b[o.col], o.asc); if (c !== 0) return c; }
            return 0;
          });
        }
        const count = rows.length;
        if (limitN !== null) rows = rows.slice(0, limitN);
        const wanted = columns === "*" ? null : columns.split(",").map((c) => c.trim()).filter(Boolean);
        const project = (r: Row): Row => (wanted ? Object.fromEntries(wanted.filter((c) => c in r).map((c) => [c, r[c]])) : { ...r });
        const projected = rows.map(project);
        const data = head ? null : single ? (projected[0] ?? null) : projected;
        return { data, error: null, count: countExact ? count : null };
      };

      Object.assign(q, {
        select: (cols?: string, opts?: { count?: string; head?: boolean }) => {
          if (op === "select") columns = cols ?? "*";
          else if (op === "insert" || op === "update") returning = cols ?? "*";
          countExact = opts?.count === "exact";
          head = !!opts?.head;
          return q;
        },
        insert: (p: Row) => { op = "insert"; payload = p; return q; },
        update: (p: Row) => { op = "update"; payload = p; return q; },
        delete: () => { op = "delete"; return q; },
        eq: (c: string, v: unknown) => { filters.push(["eq", c, v]); return q; },
        neq: (c: string, v: unknown) => { filters.push(["neq", c, v]); return q; },
        or: (expr: string) => { filters.push(["or", expr, null]); return q; },
        in: (c: string, v: unknown[]) => { filters.push(["in", c, v]); return q; },
        is: (c: string, v: unknown) => { filters.push(["is", c, v]); return q; },
        order: (c: string, o?: { ascending?: boolean }) => { orders.push({ col: c, asc: o?.ascending !== false }); return q; },
        limit: (n: number) => { limitN = n; return q; },
        maybeSingle: () => { single = true; return q; },
        single: () => { single = true; return q; },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(exec()).then(res, rej),
      });
      return q;
    },
  };
  return db;
}

/** Toutes les clés présentes à n'importe quelle profondeur d'une valeur JSON. */
export function deepKeys(value: unknown, acc: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) { value.forEach((v) => deepKeys(v, acc)); return acc; }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) { acc.add(k); deepKeys(v, acc); }
  }
  return acc;
}
