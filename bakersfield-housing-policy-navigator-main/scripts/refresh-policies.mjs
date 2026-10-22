import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // Environment variables may be provided by a scheduler or hosting service.
}

const { refreshOfficialPolicies } = await import("../src/lib/policy-refresh.ts");
const result = await refreshOfficialPolicies("Scheduled policy refresh");
console.log(JSON.stringify(result, null, 2));
