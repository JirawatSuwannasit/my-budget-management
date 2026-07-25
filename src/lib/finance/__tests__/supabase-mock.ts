/**
 * Shared fluent mock of the Supabase query-builder surface the finance layer
 * uses. This is the ONE mock implementation for the repo's Supabase-I/O tests —
 * `transaction-effects.test.ts` and `cascade-delete.test.ts` both consume it, so
 * extend this rather than forking a second one.
 *
 * Rows are held in memory and mutated in place, so an update or delete is
 * visible to a later read in the same test — which is what makes sequential
 * balance reversal (a read-modify-write per account) observable.
 *
 * Every operation is appended to an ordered `calls` log, so a test can assert on
 * the real call SEQUENCE ("reverted before deleted", "card row deleted last")
 * rather than only on final state.
 */

export type MockRow = Record<string, unknown>;
export type MockTables = Record<string, MockRow[]>;

export type MockCall = {
  op: "select" | "update" | "delete" | "insert";
  table: string;
  filters: Record<string, unknown>;
  payload?: MockRow;
};

type QueryResult = { data: unknown; error: { message: string } | null; count?: number };

/** Fails the next matching operation, to exercise abort/rollback paths. */
export type FailureRule = { op: MockCall["op"]; table: string; message: string; when?: (filters: Record<string, unknown>) => boolean };

function matchesFilters(row: MockRow, filters: Record<string, unknown>): boolean {
  return Object.entries(filters).every(([column, value]) => {
    if (column === "__in") {
      const { column: inColumn, values } = value as { column: string; values: unknown[] };
      return values.includes(row[inColumn]);
    }
    if (column === "__or") {
      return (value as Array<{ column: string; value: unknown }>).some((clause) => row[clause.column] === clause.value);
    }
    if (column === "__notNull") return row[value as string] !== null && row[value as string] !== undefined;
    return row[column] === value;
  });
}

export function createSupabaseMock(initialTables: MockTables = {}, failures: FailureRule[] = []) {
  const tables: MockTables = {};
  for (const [name, rows] of Object.entries(initialTables)) tables[name] = rows.map((row) => ({ ...row }));

  const calls: MockCall[] = [];
  const pendingFailures = [...failures];

  function rowsFor(table: string): MockRow[] {
    if (!tables[table]) tables[table] = [];
    return tables[table];
  }

  function takeFailure(op: MockCall["op"], table: string, filters: Record<string, unknown>): string | null {
    const index = pendingFailures.findIndex((rule) => rule.op === op && rule.table === table && (!rule.when || rule.when(filters)));
    if (index === -1) return null;
    const [rule] = pendingFailures.splice(index, 1);
    return rule.message;
  }

  function createBuilder(op: MockCall["op"], table: string, payload: MockRow | undefined, resolveResult: (filters: Record<string, unknown>, single: boolean, headCount: boolean) => QueryResult) {
    const filters: Record<string, unknown> = {};
    let single = false;
    let headCount = false;

    const builder = {
      eq(column: string, value: unknown) {
        filters[column] = value;
        return builder;
      },
      in(column: string, values: unknown[]) {
        filters.__in = { column, values };
        return builder;
      },
      or(expression: string) {
        // Mirrors PostgREST's "a.eq.X,b.eq.Y" form, the only shape used here.
        filters.__or = expression.split(",").map((clause) => {
          const [column, , value] = clause.split(".");
          return { column, value };
        });
        return builder;
      },
      not(column: string) {
        filters.__notNull = column;
        return builder;
      },
      order() {
        return builder;
      },
      single() {
        single = true;
        return builder;
      },
      maybeSingle() {
        single = true;
        return builder;
      },
      select() {
        return builder;
      },
      then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
        calls.push({ op, table, filters: { ...filters }, ...(payload ? { payload } : {}) });
        const failure = takeFailure(op, table, filters);
        if (failure) return Promise.resolve({ data: null, error: { message: failure }, count: 0 }).then(resolve, reject);
        return Promise.resolve(resolveResult(filters, single, headCount)).then(resolve, reject);
      }
    };

    return {
      builder,
      markHeadCount() {
        headCount = true;
      }
    };
  }

  const supabase = {
    from(table: string) {
      return {
        select(_columns?: string, options?: { count?: string; head?: boolean }) {
          const { builder, markHeadCount } = createBuilder("select", table, undefined, (filters, single, headCount) => {
            const matched = rowsFor(table).filter((row) => matchesFilters(row, filters));
            if (headCount) return { data: null, error: null, count: matched.length };
            if (single) {
              const [row] = matched;
              return row ? { data: { ...row }, error: null } : { data: null, error: { message: "no rows found in " + table } };
            }
            return { data: matched.map((row) => ({ ...row })), error: null, count: matched.length };
          });
          if (options?.head || options?.count) markHeadCount();
          return builder;
        },
        update(payload: MockRow) {
          return createBuilder("update", table, payload, (filters) => {
            for (const row of rowsFor(table)) {
              if (matchesFilters(row, filters)) Object.assign(row, payload);
            }
            return { data: null, error: null };
          }).builder;
        },
        delete() {
          return createBuilder("delete", table, undefined, (filters) => {
            tables[table] = rowsFor(table).filter((row) => !matchesFilters(row, filters));
            return { data: null, error: null };
          }).builder;
        },
        insert(payload: MockRow) {
          return createBuilder("insert", table, payload, () => {
            rowsFor(table).push({ ...payload });
            return { data: null, error: null };
          }).builder;
        }
      };
    }
  };

  return {
    supabase,
    tables,
    calls,
    /** Ordered "op table" strings — the sequence assertions read off this. */
    sequence: () => calls.map((call) => call.op + " " + call.table)
  };
}

/** Casts the mock to whatever Supabase server-client type a function expects. */
export function asSupabaseClient<T>(supabase: unknown): T {
  return supabase as T;
}
