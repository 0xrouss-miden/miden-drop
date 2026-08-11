import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase() {
  if (database) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to store encrypted drops.");
  }

  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  database = drizzle(client, { schema });
  return database;
}
