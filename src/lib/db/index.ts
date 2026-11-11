import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;
type DatabaseGlobals = typeof globalThis & {
  __podslushanoDatabase?: Database;
  __podslushanoPostgres?: ReturnType<typeof postgres>;
};

const globalForDatabase = globalThis as DatabaseGlobals;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForDatabase.__podslushanoDatabase) {
    const client =
      globalForDatabase.__podslushanoPostgres ??
      postgres(connectionString, {
        max: process.env.NODE_ENV === "development" ? 10 : 1,
        prepare: false,
      });

    globalForDatabase.__podslushanoPostgres = client;
    globalForDatabase.__podslushanoDatabase = drizzle(client, { schema });
  }

  return globalForDatabase.__podslushanoDatabase;
}
