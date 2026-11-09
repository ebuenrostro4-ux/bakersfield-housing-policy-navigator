import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, readFile, chmod } from "node:fs/promises";
import { dirname, resolve, isAbsolute } from "node:path";
const value = process.env.DATABASE_URL;
if (!value?.startsWith("file:"))
  throw new Error(
    "Set DATABASE_URL to an absolute file: path on durable storage.",
  );
const path = value.slice(5);
if (!isAbsolute(path))
  throw new Error("DATABASE_URL must use an absolute filesystem path.");
if (process.env.RENDER && !path.startsWith("/var/data/"))
  throw new Error(
    "Render employee deployments require the persistent disk mounted at /var/data. Temporary storage is refused.",
  );
await mkdir(dirname(path), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path);
await chmod(path, 0o600);
db.exec("PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON;");
const existing = !!db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Policy'",
  )
  .get();
const hasMigrationTable = !!db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='_NavigatorMigration'",
  )
  .get();
const pending =
  !hasMigrationTable ||
  !db
    .prepare(
      "SELECT name FROM _NavigatorMigration WHERE name='002_employee_workflow'",
    )
    .get();
if (existing && pending) {
  await mkdir(resolve(dirname(path), "backups"), {
    recursive: true,
    mode: 0o700,
  });
  const target = resolve(
    dirname(path),
    "backups",
    `pre-migration-${Date.now()}.db`,
  );
  await backup(db, target);
  await chmod(target, 0o600);
}
db.exec(
  "CREATE TABLE IF NOT EXISTS _NavigatorMigration (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)",
);
for (const name of ["001_baseline", "002_employee_workflow"]) {
  if (db.prepare("SELECT name FROM _NavigatorMigration WHERE name=?").get(name))
    continue;
  db.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
  try {
    // Adopt only the existing baseline; all later migrations execute normally.
    if (!(name === "001_baseline" && existing))
      db.exec(
        await readFile(
          new URL(
            `../prisma/migrations/${name}/migration.sql`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
    if (db.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("Migration has foreign-key violations; rolling back.");
    db.prepare("INSERT INTO _NavigatorMigration VALUES (?,?)").run(
      name,
      new Date().toISOString(),
    );
    db.exec("COMMIT;");
  } catch (e) {
    db.exec("ROLLBACK;");
    throw e;
  } finally {
    db.exec("PRAGMA foreign_keys=ON;");
  }
}
db.close();
console.log("Database migrations applied. Existing records preserved.");
