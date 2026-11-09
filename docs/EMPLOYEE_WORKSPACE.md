# Authorized employee workspace — implementation and rollout

Prepared November 8, 2026. University SPARKS prototype, not a City-approved or production-certified system. Development branch: `sparks/presentation-readiness`.

## What is implemented

- Administrator-created accounts; Employee, Viewer, Administrator, and the retained designated Reviewer role. Backend role checks protect writes. Government email does not grant access.
- Salted scrypt password hashes, hashed eight-hour session tokens, HttpOnly/SameSite=Strict cookies (Secure on HTTPS), logout, persistent per-email login throttling, same-origin writes, and expiring single-use password resets. Reset consumes outstanding links and revokes sessions.
- Clean employee policy library with Import Policy and Copy & Paste Policy, search/filter controls, uploader/source provenance, reported dates labeled unverified, and editable extraction preview.
- PDF, DOCX, UTF-8 TXT extraction; 5 MB uploads, 60,000-character analysis documents, bounded request streams and Word expansion, PDF page limits. Little-readable-text PDFs are rejected for OCR/manual review. Original binary files are not retained; reviewed text and metadata are stored privately in SQLite.
- Source-grounded existing analyzer with exact quotation checks, no inferred legal deadlines, human review, and staff-confirmed action plans saved as tasks. Repeating the same version/action request does not duplicate tasks.
- General tasks without a policy, authorized assignees, priority, due date, description, notes, and automatic progress: Not Started 0%, In Progress 50%, Completed 100%, Blocked preserves previous percentage. Dashboard and Tasks share the same progress component and persisted records.
- Uploaded document versions, previous text, conservative paragraph differences, manual follow notifications, review requests, assignment notices, due-soon/overdue reminders, administrator archive/restore and JSON export.
- Non-destructive SQL migrations, pre-migration backup, explicit backup script, audit records, and a separate Render employee configuration proposal.

## Important limits

- **Live AI is not configured or end-to-end tested.** `AI_MODE=demo` on arbitrary uploaded material provides labeled source excerpts, not invented summaries or suggested obligations. Five manually researched public-source explanations remain available as prepared catalog code, with fixed November 5 source-check dates; they are not automatically inserted into the employee library. An administrator must approve a provider, data handling and spending before setting a server-side key and `AI_MODE=live`. Validate a public document end-to-end before relying on live outputs. Quotations establish provenance, not semantic/legal accuracy.
- No administrator MFA, City SSO, external penetration test, malware-scanning service, automated off-service backups, OCR, or email delivery. Password assistance alerts administrators; an administrator verifies identity and privately delivers a reset link. Never describe this as a full production security certification.
- Notifications are in-app and materialize on workspace requests. Deadline reminders are deduplicated by task, assignee, due date and due-soon/overdue stage. Old notifications remain an activity history; edits do not erase them.
- Human review is a workflow status, not independent legal verification. Analyses move directly from Pending Analysis to Pending Review when complete; there is no unnecessary extra click for an intermediate “Analysis Completed” status.
- Viewer accounts see source text and reviewed analyses, and cannot alter policies/tasks/accounts. Their own follow and notification-read preferences are allowed. Comparison drafts have no separate approval workflow and are withheld from Viewers.
- A document version is an uploaded revision, not verification that a law changed or is current. Paragraph differences do not model paragraph ordering or duplicates. Version exports retain source, analysis, tasks and versions; they are not full database backups.
- SQLite is suitable for this single-instance prototype. Do not enable multiple instances or autoscaling against it. PostgreSQL is an option for future concurrency/availability needs, requiring a separate tested migration.
- Render deployment, genuine account provisioning, live AI testing, and City security/privacy approval remain outstanding. No confidential City information or actual employee passwords were used in development tests.

## Local setup and first administrator

Use Node 24.14.0 (or compatible Node with `node:sqlite`) and pnpm 11.25.0. Keep `.env`, databases, backups, test credentials and API keys out of Git.

1. Install with `pnpm install --frozen-lockfile` and `pnpm exec prisma generate`.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL=file:/absolute/path/to/navigator.db`; use an absolute path owned by the operator. Set `APP_URL=http://127.0.0.1:3000` locally, or the exact HTTPS origin when hosted. Keep all demo/training switches false.
3. Run `node --env-file=.env scripts/migrate.mjs`. Existing baseline databases are backed up before migration; genuine records remain. Identified `sample=true` policies are archived, their tasks are excluded from active views, and known built-in demo accounts are disabled. No automatic seed runs in employee mode.
4. From the trusted operator shell, run `node --env-file=.env scripts/bootstrap-admin.mjs approved-email@example.org "Administrator name"`. Use an actual approved address only when operating the real deployment. This command refuses to replace an existing active administrator and never takes a password on the command line.
5. Open the printed **private setup link within 30 minutes**, set a unique password of at least 12 characters, then sign in. Do not paste the link in a shared chat, issue or build log. Only its hash is stored in the database. If it expires, an existing admin can issue a reset; if this was the only account, a trusted operator can verify identity and run `node --env-file=.env scripts/issue-reset.mjs approved-email@example.org` to issue a fresh link. Do not delete the account or database.
6. Start with `pnpm dev`, or build and use `node --env-file=.env scripts/start-employee.mjs` with `PORT=3000`. The macOS launcher also runs migrations rather than `db push` or seeding. Existing `.env` files are not overwritten; review their old demo settings yourself.

## Add employees and reset passwords

Open **Settings → Add employee** as Administrator. Enter name, approved email, department, role and a unique initial password (12+ characters). Verify authorization independently of the email domain. Deliver credentials privately, or issue a one-time reset so the employee can choose their password. Use **Issue Reset Link** after verifying identity; copy the private link through an approved channel. No email is sent by this prototype. Disable/enable accounts and change roles in Settings; disabling/role changes revoke sessions. Viewers cannot upload, analyze or change tasks. Reviewers can record human review and source verification; ordinary employees cannot approve their own analyses merely by editing status.

## Import, analyze, review, and assign work

1. **Policies → Import Policy**: choose PDF/DOCX/TXT, Preview Extracted Text, review/correct completeness, enter title/source/identifier/notes, and Save Policy. Scanned or partly unreadable PDFs require OCR or a complete text-only section first.
2. Or select **Copy & Paste Policy** and supply at least 40 characters of source text. A reported effective date stays unverified until a reviewer checks explicit official evidence.
3. Choose **Analyze Policy** on the saved record. With live AI disabled, the screen explains its limited excerpt behavior. Never treat an offline excerpt as a useful live interpretation.
4. Administrator/Reviewer opens the policy, reviews the original evidence and analysis, records comments and **Reviewed** or **Needs Revision**. Source verification remains a separate human decision.
5. **Create Action Plan** becomes available for reviewed analyses with source-supported actions. Review/edit each title, owner, priority and optional staff target date, then confirm. These are proposed planning tasks, not automatic legal mandates.
6. **Tasks → Create Task** also supports general responsibilities: leave Related Policy blank. Set owner/priority/date/notes. Updating status persists its automatic percentage; no manual percentage control exists. Completed shows a green bar and checkmark; reopening recalculates percentage. My Tasks and Dashboard use the same database values.
7. Import an update with **Save as → Updated version of …**. It preserves previous source text, increments version, clears outdated analysis/review/verified dates, and downgrades linked statutory task dates for renewed review. Analyze the new version. Open **Document History** to inspect previous uploads and text differences.
8. Follow Policy Updates for in-app notices. Administrators can confirm Archive from policy details and restore in Settings → Archived Policies. Nothing is permanently deleted. JSON export is available to administrators for active and archived employee policies.

## Render cost and deployment approval

Current user-specified URL: https://bakersfield-housing-policy-navigator-iw1k.onrender.com/tracker . This is the existing site, **not a claim that these changes are deployed**.

The old configuration uses temporary SQLite under `/tmp`. That cannot meet persistence requirements. Render persistent disks require a paid service. Official pricing checked November 8 lists $7/month for the smallest paid web compute and $0.25/GB/month for a disk. A 1 GB disk plus that compute is approximately **$7.25/month**, before taxes, usage overages, optional workspace charges and AI usage. See [pricing](https://render.com/pricing) and [persistent disk requirements](https://render.com/docs/disks). Memory-intensive PDF processing may require a larger instance after load testing; no larger plan is authorized here.

Simplest no-new-hosting-cost alternative: run the tested employee workspace locally with durable local SQLite and backups, while keeping the current public demo unchanged. It will not provide an always-available shared employee website. A free temporary hosted database does not satisfy durable employee record storage.

`render.employee.yaml` is a review template only. Do not create a duplicate service from it. Existing `render.yaml` remains the old configuration for reference; **do not merge/deploy this branch with that configuration unchanged**. The legacy start command now refuses public/training settings. Complete the following cutover only after approval of the PR and cost:

1. Review the feature branch/PR and tests. Keep automatic deploys off. Confirm the exact existing Render service for the `-iw1k` URL; do not assume an older service ID belongs to it.
2. Inventory actual current records and obtain a consistent, private export/backup **before any restart, disk attachment, service upgrade or redeploy** can discard temporary storage. A live ephemeral database may already have been lost after a previous restart; do not invent recovery claims. If current service access cannot produce a backup, stop cutover until the owner confirms what data must be preserved. Do not upload a local developer database as a substitute.
3. With owner approval, configure the existing service's paid compute and 1 GB disk mounted at `/var/data`. Restore the genuine backup to `/var/data/navigator.db` using a trusted operator channel. Keep the old backup safely outside the service. A blank database is allowed only after the owner confirms that no genuine records need migration.
4. Set `DATABASE_URL=file:/var/data/navigator.db`, exact HTTPS `APP_URL`, `DEMO_MODE=false`, `PUBLIC_DEMO=false`, `ALLOW_TRAINING_SEED=false`, `NEXT_PUBLIC_SHARED_DEMO=false`, `AI_MODE=demo` initially. Configure Node 24.14.0; build using the frozen lockfile and `pnpm build`; start with `node scripts/start-employee.mjs`. The startup guard refuses temporary Render paths and training mode.
5. Merge the approved PR into main, then manually deploy that exact commit on the **existing service** to retain its link. Migrations run at startup on the attached disk; never run `prisma db push` in production. Bootstrap the first admin only if no active genuine admin exists.
6. Verify sign-in with approved test accounts, role restrictions, a public source import, task status/progress, version history, archive/restore, and persistence after a controlled restart. Check build/deploy logs and commit identity. Remove/disable temporary test accounts. Only then report the URL as updated and verified.

## Backup, restore and rollback

Create a consistent SQLite snapshot with `node --env-file=.env scripts/backup.mjs /absolute/private/backup-YYYY-MM-DD.db`. On Render, variables are already supplied, so omit `--env-file`. The destination must be new; the command never overwrites a backup. It uses SQLite's backup API, sets restrictive permissions and checks integrity. Keep encrypted copies in an owner-approved location outside the Render service/disk, with a documented retention schedule. Same-disk pre-migration backups do not protect against losing the whole disk. No upload of backups or recurring automation is configured by this change.

Restore drill: copy a backup to a new isolated database path, run integrity and foreign-key checks, point a separate test app to it, apply migrations, and verify record counts, roles and tasks before touching production. The automated storage test exercises a backup reopened as a restored database. For actual recovery, stop application writes first, preserve the failed/current database and SQLite sidecars, restore the validated copy to the configured path, then start once. Do not overwrite a live SQLite database or roll an old schema backward in place.

Rollback requires both a matching prior application commit and its pre-migration database backup, restored while writes are stopped. Retain any post-migration changes for reconciliation; restoring an earlier backup loses later work. Never re-enable the old public demo credentials as a rollback shortcut.

## Validation record

Automated checks cover authorization, government-email rejection, Viewer restrictions, random test credentials, source imports, approved/unapproved analysis visibility, review and action plans, task progress/reopen/blocked behavior, assignment validation, version history, owner-scoped notifications, archive/restore/export, password resets, session revocation, CSRF, repeated migrations, restart persistence, PDF/DOCX parsing, malicious/oversized input, evidence validation, legacy data preservation and backup integrity. See `tests/employee-smoke.mjs`, `tests/analysis.test.ts`, `tests/docx.test.ts`, `tests/storage.test.ts`, and `tests/catalog.test.ts`.

Run `pnpm test`, `pnpm build`, `pnpm test:api`, and `pnpm audit --prod`. The API test requires a local listening port (3104), creates and removes an isolated temporary database, and never touches live records. Browser QA and final exact test counts are recorded in the change report.
