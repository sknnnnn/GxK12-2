// Fake en memoria del subconjunto de la API de supabase-js que usan los
// servicios bajo test (from/select/insert/update/eq/in/maybeSingle/single/
// rpc). No es un PostgREST: los filtros sobre columnas embebidas
// ("products.status") se ignoran -- las filas de fixture ya traen los datos
// embebidos con la forma que devolvería el join real.
import type { GxkSupabaseClient } from "@/lib/supabase/types";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
type Result = { data: unknown; error: { code?: string; message: string } | null };

export type Mutation = { table: string; op: "insert" | "update"; values: Row };
export type RpcCall = { fn: string; args: Row };

export type FakeSupabaseOptions = {
  rpc?: (fn: string, args: Row) => Result;
  /** Fallo forzado de una operación: devuelve `error` en vez de ejecutarla. */
  failOn?: (table: string, op: "select" | "insert" | "update") => Result["error"];
  /** Se ejecuta después de cada operación: permite simular un proceso concurrente que modifica datos entre dos queries. */
  afterExecute?: (table: string, op: "select" | "insert" | "update", tables: Record<string, Row[]>) => void;
};

// Refleja uq_shipments_order_active (migración shipping_flow).
function violatesUnique(table: string, rows: Row[], candidate: Row): boolean {
  if (table !== "shipments" || candidate.status === "cancelled") return false;
  return rows.some((row) => row.order_id === candidate.order_id && row.status !== "cancelled");
}

const SHIPMENT_DEFAULTS: Row = {
  service_type: null,
  external_id: null,
  tracking_number: null,
  label_url: null,
  cost: null,
  status: null,
  destination_type: null,
  destination_data: {},
  last_error: null,
  attempts: 0,
  last_attempt_at: null,
};

export function createFakeSupabase(tables: Record<string, Row[]>, options: FakeSupabaseOptions = {}) {
  const mutations: Mutation[] = [];
  const rpcCalls: RpcCall[] = [];
  let idSeq = 0;

  class Query implements PromiseLike<Result> {
    private op: "select" | "insert" | "update" = "select";
    private filters: Filter[] = [];
    private payload: Row | null = null;
    private returning = false;
    private mode: "many" | "single" | "maybeSingle" = "many";
    private limitCount: number | null = null;

    constructor(private readonly table: string) {}

    select() {
      if (this.op !== "select") this.returning = true;
      return this;
    }
    insert(values: Row) {
      this.op = "insert";
      this.payload = values;
      return this;
    }
    update(values: Row) {
      this.op = "update";
      this.payload = values;
      return this;
    }
    eq(column: string, value: unknown) {
      if (!column.includes(".")) this.filters.push((row) => row[column] === value);
      return this;
    }
    in(column: string, values: unknown[]) {
      if (!column.includes(".")) this.filters.push((row) => values.includes(row[column]));
      return this;
    }
    lte(column: string, value: number) {
      if (!column.includes(".")) this.filters.push((row) => (row[column] as number) <= value);
      return this;
    }
    order() {
      return this;
    }
    limit(count: number) {
      this.limitCount = count;
      return this;
    }
    returns() {
      return this;
    }
    single() {
      this.mode = "single";
      return this;
    }
    maybeSingle() {
      this.mode = "maybeSingle";
      return this;
    }

    private shape(rows: Row[]): Result {
      const copies = rows.map((row) => structuredClone(row));
      if (this.mode === "many") return { data: this.limitCount === null ? copies : copies.slice(0, this.limitCount), error: null };
      if (copies.length > 1) return { data: null, error: { message: "multiple rows" } };
      if (copies.length === 0 && this.mode === "single") return { data: null, error: { code: "PGRST116", message: "no rows" } };
      return { data: copies[0] ?? null, error: null };
    }

    private execute(): Result {
      const forced = options.failOn?.(this.table, this.op);
      if (forced) return { data: null, error: forced };

      const rows = (tables[this.table] ??= []);
      const matches = () => rows.filter((row) => this.filters.every((filter) => filter(row)));

      if (this.op === "select") return this.shape(matches());

      if (this.op === "insert") {
        const row: Row = {
          ...(this.table === "shipments" ? SHIPMENT_DEFAULTS : {}),
          id: `${this.table}-${++idSeq}`,
          ...this.payload,
        };
        if (violatesUnique(this.table, rows, row)) {
          return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
        }
        rows.push(row);
        mutations.push({ table: this.table, op: "insert", values: { ...this.payload } });
        return this.returning ? this.shape([row]) : { data: null, error: null };
      }

      const updated = matches();
      for (const row of updated) Object.assign(row, this.payload);
      if (updated.length > 0) mutations.push({ table: this.table, op: "update", values: { ...this.payload } });
      return this.returning ? this.shape(updated) : { data: null, error: null };
    }

    then<T1 = Result, T2 = never>(
      onFulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
      onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
    ): PromiseLike<T1 | T2> {
      const result = this.execute();
      options.afterExecute?.(this.table, this.op, tables);
      return Promise.resolve(result).then(onFulfilled, onRejected);
    }
  }

  const client = {
    from: (table: string) => new Query(table),
    rpc: (fn: string, args: Row) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(options.rpc?.(fn, args) ?? { data: null, error: { message: `rpc ${fn} no simulada` } });
    },
  };

  return { client: client as unknown as GxkSupabaseClient, tables, mutations, rpcCalls };
}
