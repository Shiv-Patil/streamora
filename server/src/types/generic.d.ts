import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";

type ReturnData<T> =
    | { success: true; data: T }
    | { success: false; error: string; feedback?: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
type Transaction = PgTransaction<
    NodePgQueryResultHKT,
    any,
    ExtractTablesWithRelations<any>
>;
