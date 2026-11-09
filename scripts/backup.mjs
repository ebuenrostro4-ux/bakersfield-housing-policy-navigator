import { DatabaseSync, backup } from "node:sqlite";
import { chmod, access, mkdir } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
const path = process.env.DATABASE_URL?.replace(/^file:/, ""),
  target = process.argv[2];
if (
  !process.env.DATABASE_URL?.startsWith("file:") ||
  !path ||
  !isAbsolute(path) ||
  !target ||
  !isAbsolute(target) ||
  resolve(path) === resolve(target)
)
  throw new Error(
    "Set DATABASE_URL=file:/absolute/database.db and provide a new absolute backup filename.",
  );
await access(path);
try {
  await access(target);
  throw new Error("Backup target already exists; choose a new filename.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
await mkdir(dirname(target), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path, { readOnly: true });
try {
  await backup(db, target);
  await chmod(target, 0o600);
  const copy = new DatabaseSync(target, { readOnly: true });
  try {
    if (copy.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw new Error("Backup integrity check failed.");
  } finally {
    copy.close();
  }
  console.log(
    "Consistent SQLite backup created and integrity-checked. Store it in an approved encrypted location outside the service.",
  );
} finally {
  db.close();
}
