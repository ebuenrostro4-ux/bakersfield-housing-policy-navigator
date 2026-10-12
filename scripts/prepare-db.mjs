import { loadEnvFile } from "node:process";
import { existsSync, mkdirSync, openSync, closeSync } from "node:fs";
import { resolve, dirname, isAbsolute } from "node:path";
if (existsSync(".env")) loadEnvFile(".env");
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:"))
  throw new Error("Set DATABASE_URL to a local SQLite file URL in .env.");
const file = url.slice(5);
const path = isAbsolute(file) ? file : resolve("prisma", file);
mkdirSync(dirname(path), { recursive: true });
// Prisma 6 can return an empty schema-engine error for a missing SQLite file.
// Append mode creates it without truncating an existing database.
closeSync(openSync(path, "a", 0o600));
