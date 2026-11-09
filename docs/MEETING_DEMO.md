# Free meeting demonstration

This is the current public-release guide. The new November 9 brief postpones employee login and requires exactly two functional fictional policies. Earlier employee documentation describes an optional local/future mode; it is not the public meeting interface.

## Walkthrough

1. Open Home or Policies. The only initialized fictional policies are **DEMO — Affordable Housing Application Checklist** and **DEMO — Housing Program Reporting Update**. Both show **DEMO POLICY — FICTIONAL EXAMPLE**, actual short fictional source text, and no invented official source link.
2. Open either policy and select Analyze Policy. The prepared sample explanation uses exact passages from that example. It explicitly states no live AI was called. Review summary, potential administrative impact, actions and uncertainties.
3. Select Create Action Plan. Edit names/labels, task titles, priorities and optional staff target dates; confirm. Saving the plan again updates the same task IDs and preserves progress rather than duplicating tasks.
4. Tasks and Home share the same records. Change status: Not Started 0%, In Progress 50%, Completed 100% with green checkmark, Blocked retains the previous saved value. A newly blocked general task starts at 0%. Reopening a completed task recalculates its progress.
5. Initial checklist tasks are 50% and 0%; reporting tasks are 100% and 50%. Assignments use labels, not authenticated employees. Reviews also record an unverified entered name, date and notes.
6. Reset Demo asks for confirmation and restores only the two designated policies and demo-linked tasks. It preserves public uploads and unrelated tasks. There is no whole-workspace deletion/reset button.
7. Import Policy accepts PDF, DOCX and UTF-8 TXT up to 5 MB. The extraction endpoint validates bytes, limits document complexity and rejects unreadable PDFs. Review/correct extracted text before saving. Or use Copy & Paste Policy. Enter title, source, reported unverified date, notes/bill number. Save and analyze the same record.
8. Arbitrary uploads receive a labeled source excerpt in offline mode, not fabricated interpretations/actions. Live AI is not enabled and no AI usage is billed. Useful generated analysis of arbitrary documents remains unfinished until an approved provider is configured/tested.
9. New public uploads can be saved as versions of existing uploaded policies, inspected in history, archived with confirmation, and restored in Policies → View Archived Policies. Demo policy archiving is disabled to keep both designated examples available.
10. Export Browser Records downloads a JSON backup. Keep this outside the browser before clearing site data. Backup import/recovery UI is not implemented.

## Free persistence and privacy limits

The meeting interface uses **IndexedDB in the visitor's browser**, with save confirmation only after its database transaction completes. It survives normal refreshes, browser reopening, application restarts and same-origin redeployments while that browser keeps its site data. It does not use Render's temporary filesystem for visitor records. Each browser/profile has separate data. Other visitors do not see these changes. Clearing site data, using a different origin/profile, private browsing cleanup or browser storage eviction can lose records. This is not the brief's requested shared persistent server database; that requirement remains partial. No paid hosting or external storage service is activated.

Use public sources and demonstration names only. No confidential City records or genuine employee credentials belong in this environment. Extraction sends the chosen file to the app server solely for bounded raw-text extraction; source files are not persisted by that endpoint. Existing private employee API routes remain protected and are blocked in public-preview mode. Public workspace/session responses are allowlisted public data, never a database export.

## Deployment

Keep the existing service on **Free**. Build using the frozen pnpm lockfile and `pnpm build`. Set its Start Command to `node scripts/start-free-preview.mjs` (render.yaml documents this). The launcher fixes public preview mode, disables all training/account seeding and live AI, removes the AI key from the child process, and does not migrate, seed, reset or query employee databases. Do not activate render.employee.yaml or a paid disk. The available owner-approved service URL is https://bakersfield-housing-policy-navigator.onrender.com; the separate -iw1k service is not accessible in this Render account.

## Validation

26 unit/storage/document/evidence checks and 11 isolated public API checks pass, including exact two-policy initialization, four stable initial task IDs, source quotes, safe reset isolation, blocked/reopened progress and offline upload behavior. Production build and TypeScript pass. Browser QA covered both demo policies from analysis to editable action plan, assignment, Blocked 50% after refresh, and reset preserving an uploaded public source. Remaining live-deployment verification is recorded separately after Render completes. No claim of City approval or production certification is made.

## Remaining work

Shared server-side persistence, live AI for arbitrary imports, browser-backup import, richer version differences and general notifications remain unfinished. The local/future employee account implementation is preserved but not exposed on the public meeting website. No employee login is introduced in the public release.
