import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
test("legacy migration preserves genuine records, isolates known demos, and backup restores intact", () => {
  const dir = mkdtempSync(join(tmpdir(), "navigator-migration-")),
    path = join(dir, "legacy.db"),
    env = { ...process.env, DATABASE_URL: `file:${path}` };
  try {
    let db = new DatabaseSync(path);
    db.exec(
      readFileSync("prisma/migrations/001_baseline/migration.sql", "utf8"),
    );
    db.exec(`INSERT INTO User (id,email,name,passwordHash,updatedAt) VALUES ('real','test@example.test','Test account','not-a-real-credential',CURRENT_TIMESTAMP),('demo-admin','admin@bakersfield.demo','Demo','disabled',CURRENT_TIMESTAMP);
 INSERT INTO Policy (id,title,sourceText,updatedAt) VALUES ('real-policy','Preserved public source','A genuine manually entered record must remain intact.',CURRENT_TIMESTAMP);
 INSERT INTO Policy (id,title,sample,updatedAt) VALUES ('fiction','Identified training record',1,CURRENT_TIMESTAMP);
 INSERT INTO Task (id,title,policyId,status,updatedAt) VALUES ('real-task','Preserved task','real-policy','In progress',CURRENT_TIMESTAMP);
 INSERT INTO Session (id,tokenHash,userId,expiresAt) VALUES ('demo-session','token-test','demo-admin','2099-01-01');`);
    db.close();
    execFileSync(process.execPath, ["scripts/migrate.mjs"], {
      env,
      stdio: "pipe",
    });
    db = new DatabaseSync(path);
    assert.equal(
      db.prepare("SELECT sourceText FROM Policy WHERE id='real-policy'").get()!
        .sourceText,
      "A genuine manually entered record must remain intact.",
    );
    assert.equal(
      db.prepare("SELECT archived FROM Policy WHERE id='fiction'").get()!
        .archived,
      1,
    );
    assert.equal(
      db.prepare("SELECT active FROM User WHERE id='demo-admin'").get()!.active,
      0,
    );
    assert.equal(
      db
        .prepare("SELECT count(*) AS n FROM Session WHERE userId='demo-admin'")
        .get()!.n,
      0,
    );
    assert.deepEqual(
      {
        ...db
          .prepare("SELECT status,progress FROM Task WHERE id='real-task'")
          .get(),
      },
      { status: "In Progress", progress: 50 },
    );
    db.close();
    const backups = readdirSync(join(dir, "backups")).length;
    execFileSync(process.execPath, ["scripts/migrate.mjs"], {
      env,
      stdio: "pipe",
    });
    assert.equal(
      readdirSync(join(dir, "backups")).length,
      backups,
      "No redundant backups when there is no migration",
    );
    const restored = join(dir, "restore-test.db");
    execFileSync(process.execPath, ["scripts/backup.mjs", restored], {
      env,
      stdio: "pipe",
    });
    db = new DatabaseSync(restored, { readOnly: true });
    assert.equal(
      db.prepare("PRAGMA integrity_check").get()!.integrity_check,
      "ok",
    );
    assert.equal(
      db.prepare("SELECT progress FROM Task WHERE id='real-task'").get()!
        .progress,
      50,
    );
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
