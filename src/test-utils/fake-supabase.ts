// Faux client Supabase en mémoire, pour les tests des notifications push (aucune base réelle).
// Couvre : select / insert / update / delete / upsert, filtres eq / in / or (sous-ensemble utile), order,
// maybeSingle, et résultat « thenable » comme le vrai client. Contraintes simulées : unicité déclarée
// par table, colonnes inconnues (→ erreur 42703) pour tester les replis « migration pas encore exécutée ».

type Row = Record<string, unknown>;
type Err = { code: string; message: string } | null;

export interface FakeDbOptions {
  /** Colonnes uniques par table (ex. { push_subscriptions: ["endpoint"], push_log: ["source+ref"] }). */
  unique?: Record<string, string[]>;
  /** Colonnes absentes par table : les lire ou les écrire renvoie 42703. */
  missingColumns?: Record<string, string[]>;
  /** Erreur forcée à la lecture d'une table. */
  failSelect?: Record<string, Err>;
}

export function createFakeDb(tables: Record<string, Row[]>, opts: FakeDbOptions = {}) {
  let seq = 0;
  const missing = (table: string, cols: string[]) => cols.some((c) => opts.missingColumns?.[table]?.includes(c));
  const uniqueClash = (table: string, row: Row, ignore?: Row) =>
    (opts.unique?.[table] ?? []).some((spec) => {
      const keys = spec.split("+");
      return (tables[table] ?? []).some((r) => r !== ignore && keys.every((k) => r[k] === row[k]));
    });

  function from(table: string) {
    tables[table] ??= [];
    const filters: ((r: Row) => boolean)[] = [];
    let op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    let cols: string[] = [];
    let payload: Row | Row[] | null = null;
    let conflict = "";
    let returning = false;
    let single = false;
    let wantCols: string[] = [];

    const q: Record<string, unknown> = {};
    q.select = (c = "*") => {
      const list = c === "*" ? [] : c.split(",").map((s) => s.trim());
      if (op === "select") cols = list;
      else { returning = true; wantCols = list; }
      return q;
    };
    q.insert = (r: Row | Row[]) => { op = "insert"; payload = r; return q; };
    q.update = (r: Row) => { op = "update"; payload = r; return q; };
    q.delete = () => { op = "delete"; return q; };
    q.upsert = (r: Row, o?: { onConflict?: string }) => { op = "upsert"; payload = r; conflict = o?.onConflict ?? "id"; return q; };
    q.eq = (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; };
    q.in = (c: string, v: unknown[]) => { filters.push((r) => v.includes(r[c])); return q; };
    // Sous-ensemble de la syntaxe PostgREST utilisé par push-claim : « status.eq.failed,… ».
    q.or = (expr: string) => { filters.push((r) => expr.includes(`status.eq.${String(r.status)}`) && r.status === "failed"); return q; };
    q.order = () => q;
    q.maybeSingle = () => { single = true; return run(); };
    q.single = () => { single = true; return run(); };
    q.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => run().then(res, rej);

    const match = () => tables[table].filter((r) => filters.every((f) => f(r)));
    const pick = (r: Row, list: string[]) => (list.length ? Object.fromEntries(list.map((k) => [k, r[k]])) : { ...r });

    async function run(): Promise<{ data: unknown; error: Err }> {
      const err = (code: string, message = code) => ({ data: null, error: { code, message } });
      if (op === "select") {
        if (opts.failSelect?.[table]) return { data: null, error: opts.failSelect[table] };
        if (missing(table, cols)) return err("42703", "column does not exist");
        const rows = match().map((r) => pick(r, cols));
        return { data: single ? rows[0] ?? null : rows, error: null };
      }
      if (op === "insert") {
        const rows = (Array.isArray(payload) ? payload : [payload]) as Row[];
        for (const r of rows) {
          if (missing(table, Object.keys(r))) return err("42703");
          if (uniqueClash(table, r)) return err("23505", "duplicate key");
          tables[table].push({ id: r.id ?? `id-${++seq}`, ...r });
        }
        return { data: returning ? rows : null, error: null };
      }
      if (op === "upsert") {
        const r = payload as Row;
        if (missing(table, Object.keys(r))) return err("42703");
        const existing = tables[table].find((x) => x[conflict] === r[conflict]);
        if (existing) Object.assign(existing, r);
        else tables[table].push({ id: `id-${++seq}`, ...r });
        return { data: null, error: null };
      }
      if (op === "update") {
        const patch = payload as Row;
        if (missing(table, Object.keys(patch))) return err("42703");
        const hit = match();
        for (const r of hit) if (uniqueClash(table, { ...r, ...patch }, r)) return err("23505", "duplicate key");
        hit.forEach((r) => Object.assign(r, patch));
        return { data: returning ? hit.map((r) => pick(r, wantCols)) : null, error: null };
      }
      // delete
      const hit = new Set(match());
      tables[table] = tables[table].filter((r) => !hit.has(r));
      return { data: null, error: null };
    }
    return q;
  }

  return { from, tables };
}
