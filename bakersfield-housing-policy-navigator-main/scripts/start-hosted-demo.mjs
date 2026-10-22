import { spawnSync, spawn } from "node:child_process";

// This deployment starts a separate, disposable demonstration database.
if (process.env.DEMO_MODE !== "true" || process.env.AI_MODE !== "demo") {
  throw new Error("The shared demo requires DEMO_MODE=true and AI_MODE=demo.");
}
const origin = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
if (!origin) throw new Error("Set APP_URL to the public HTTPS website address.");
const url = new URL(origin);
if (url.protocol !== "https:" && url.hostname !== "127.0.0.1") {
  throw new Error("Hosted demos require HTTPS.");
}
process.env.APP_URL = url.origin;
process.env.DATABASE_URL ||= "file:/tmp/navigator-demo/demo.db";
// Never enable paid live analysis on the public demonstration.
delete process.env.OPENAI_API_KEY;
for (const args of [
  ["scripts/prepare-db.mjs"],
  ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
  ["--import", "tsx", "prisma/seed.ts"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
const server = spawn(process.execPath, [
  "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0",
  "--port", process.env.PORT || "10000",
], { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code || 0));
