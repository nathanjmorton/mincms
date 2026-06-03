import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// In dev (and on Vercel without Turso configured) we fall back to a local
// SQLite file. For production set DATABASE_URL + DATABASE_AUTH_TOKEN to a
// Turso (libSQL) database, which is serverless-friendly.
const url = process.env.DATABASE_URL ?? "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { schema };
