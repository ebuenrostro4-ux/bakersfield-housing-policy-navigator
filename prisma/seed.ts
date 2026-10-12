import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
async function main() {
  if (existsSync(".env")) loadEnvFile(".env");
  const { ensureSeed } = await import("../src/lib/seed");
  const { db } = await import("../src/lib/db");
  await ensureSeed();
  await db.$disconnect();
  console.log(
    process.env.DEMO_MODE === "true"
      ? "Training workspace ready."
      : "Demo mode disabled; no training data created.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
