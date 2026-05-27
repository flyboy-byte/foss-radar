import { join } from "path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { resolveDataDir } from "./runtime";

const sqlitePath = join(resolveDataDir(), "fossradar.db");
const sqlite = new Database(sqlitePath);
export const db = drizzle(sqlite, { schema });
