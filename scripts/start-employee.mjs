import { spawnSync, spawn } from "node:child_process";
if (
  process.env.PUBLIC_DEMO === "true" ||
  process.env.DEMO_MODE === "true" ||
  process.env.ALLOW_TRAINING_SEED === "true"
)
  throw new Error(
    "Employee hosting refuses training accounts and public demo mode.",
  );
const origin = new URL(
  process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "",
);
if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1")
  throw new Error("HTTPS is required.");
process.env.APP_URL = origin.origin;
const migrated = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (migrated.status !== 0) process.exit(migrated.status || 1);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "0.0.0.0",
    "--port",
    process.env.PORT || "10000",
  ],
  { stdio: "inherit", env: process.env },
);
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code || 0));
