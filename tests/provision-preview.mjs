// Explicit local test environment only. Never called during app startup or deployment.
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
if (process.env.RENDER) throw new Error("Preview provisioning is local-only.");
const dir = resolve("test-results/employee-preview");
mkdirSync(dir, { recursive: true });
const path = resolve(dir, "preview.db");
if (existsSync(path))
  throw new Error(
    "Preview database exists; preserve it and reuse its credentials.",
  );
process.env.DATABASE_URL = `file:${path}`;
execFileSync(process.execPath, ["scripts/migrate.mjs"], {
  env: process.env,
  stdio: "inherit",
});
const db = new PrismaClient();
try {
  const password = randomBytes(20).toString("hex"),
    salt = randomBytes(16).toString("hex");
  await db.user.create({
    data: {
      name: "Preview Employee",
      email: "preview@example.test",
      role: "ADMIN",
      department: "Planning",
      passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    },
  });
  writeFileSync(
    resolve(dir, "login.json"),
    JSON.stringify({ email: "preview@example.test", password }),
    { mode: 0o600 },
  );
  console.log(
    "Local test account created. Credentials are in the ignored test-results/employee-preview/login.json file.",
  );
} finally {
  await db.$disconnect();
}
