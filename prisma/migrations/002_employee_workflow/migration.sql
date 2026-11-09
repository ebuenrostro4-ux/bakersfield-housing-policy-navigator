-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    CONSTRAINT "Follow_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Administration',
    "legislativeStatus" TEXT NOT NULL DEFAULT 'Needs Verification',
    "relevance" TEXT NOT NULL DEFAULT 'Needs Review',
    "impact" TEXT NOT NULL DEFAULT '',
    "effectiveDate" DATETIME,
    "deadline" DATETIME,
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "sourceText" TEXT NOT NULL DEFAULT '',
    "sample" BOOLEAN NOT NULL DEFAULT false,
    "verification" TEXT NOT NULL DEFAULT 'Needs Verification',
    "implementationStatus" TEXT NOT NULL DEFAULT 'Not Reviewed',
    "department" TEXT NOT NULL DEFAULT 'Planning',
    "analysisJson" TEXT,
    "lastVerifiedAt" DATETIME,
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "reportedEffectiveDate" DATETIME,
    "notes" TEXT NOT NULL DEFAULT '',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'Pending Analysis',
    "reviewerName" TEXT NOT NULL DEFAULT '',
    "reviewedAt" DATETIME,
    "reviewComments" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_Policy" ("analysisJson", "billNumber", "category", "createdAt", "deadline", "department", "effectiveDate", "id", "impact", "implementationStatus", "lastVerifiedAt", "legislativeStatus", "relevance", "reviewNote", "sample", "sourceText", "sourceUrl", "title", "updatedAt", "verification") SELECT "analysisJson", "billNumber", "category", "createdAt", "deadline", "department", "effectiveDate", "id", "impact", "implementationStatus", "lastVerifiedAt", "legislativeStatus", "relevance", "reviewNote", "sample", "sourceText", "sourceUrl", "title", "updatedAt", "verification" FROM "Policy";
DROP TABLE "Policy";
ALTER TABLE "new_Policy" RENAME TO "Policy";
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT 'Planning',
    "assignee" TEXT NOT NULL DEFAULT '',
    "assigneeId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATETIME,
    "dateType" TEXT NOT NULL DEFAULT 'Staff target',
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "notes" TEXT NOT NULL DEFAULT '',
    "policyId" TEXT,
    "supportingDocumentId" TEXT,
    "sourceQuote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_supportingDocumentId_fkey" FOREIGN KEY ("supportingDocumentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assignee", "createdAt", "dateType", "department", "description", "dueDate", "id", "notes", "policyId", "sourceQuote", "status", "supportingDocumentId", "title", "updatedAt") SELECT "assignee", "createdAt", "dateType", "department", "description", "dueDate", "id", "notes", "policyId", "sourceQuote", "status", "supportingDocumentId", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_policyId_number_key" ON "PolicyVersion"("policyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_policyId_key" ON "Follow"("userId", "policyId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_key_key" ON "Notification"("key");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");


-- Preserve and isolate known fictional records. No policy or task is deleted.
UPDATE "Policy" SET "archived" = true WHERE "sample" = true;
UPDATE "User" SET "active" = false WHERE "id" IN ('demo-admin','demo-reviewer','demo-staff');
DELETE FROM "Session" WHERE "userId" IN ('demo-admin','demo-reviewer','demo-staff');
UPDATE "Task" SET "status" = 'Not Started', "progress" = 0 WHERE "status" = 'To do';
UPDATE "Task" SET "status" = 'In Progress', "progress" = 50 WHERE "status" = 'In progress';
UPDATE "Task" SET "status" = 'Completed', "progress" = 100 WHERE "status" = 'Done';
UPDATE "Policy" SET "reviewStatus" = 'Pending Review' WHERE "analysisJson" IS NOT NULL;
