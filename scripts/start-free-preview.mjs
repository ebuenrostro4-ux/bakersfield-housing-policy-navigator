import { spawn } from "node:child_process";
const origin = new URL(
  process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || "",
);
if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1")
  throw new Error("HTTPS is required outside localhost.");
Object.assign(process.env, {
  APP_URL: origin.origin,
  FREE_PUBLIC_PREVIEW: "true",
  AI_MODE: "demo",
  PUBLIC_DEMO: "false",
  NEXT_PUBLIC_SHARED_DEMO: "false",
  DEMO_MODE: "false",
  ALLOW_TRAINING_SEED: "false",
});
delete process.env.OPENAI_API_KEY;
// No database setup, seeding or migrations. Public catalog responses never read employee records.
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
  { env: process.env, stdio: "inherit" },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
