# Employee workspace change report

Validated November 9, 2026 on feature branch `sparks/presentation-readiness`.

## Validation

- Production build and TypeScript check passed.
- 22 unit/storage/document/evidence tests passed.
- 63 isolated employee API workflow checks passed.
- Production dependency audit after package fixes: zero reported vulnerabilities.
- Browser-tested login, public-source paste/save, offline analysis disclosure, human review, history loading, task date save, 50% progress, Blocked retaining 50%, Completed 100%, refresh persistence, archive confirmation and archive listing.
- Automated restore passed; final browser restore and tablet layout remain unverified. No full accessibility certification is claimed.
- Current GitHub main remains a8e37ad8ef5f7ec0777e9a2596006b8b8e65a44e before publishing this branch.

## Outstanding rollout

Live AI, administrator MFA/SSO, email delivery, off-service scheduled backups, Render migration/deployment and City security/privacy approval are outstanding. The existing website has not received this branch. Preserve and inventory live data before any storage change. A reviewed paid Render proposal is supplied; no paid plan has been activated.

Setup, role management, imports, tasks/progress, backup/recovery, Git/Render rollout, configuration and cost instructions: [EMPLOYEE_WORKSPACE.md](EMPLOYEE_WORKSPACE.md).

## Modified and added files

- `.env.example`
- `README.md`
- `Start Navigator.command`
- `docs/DEMO-GUIDE.md`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `prisma/schema.prisma`
- `scripts/start-hosted-demo.mjs`
- `src/app/api/analyze/route.ts`
- `src/app/api/compare/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/app/api/documents/route.ts`
- `src/app/api/policies/[id]/route.ts`
- `src/app/api/policies/route.ts`
- `src/app/api/session/route.ts`
- `src/app/api/tasks/[id]/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/users/[id]/route.ts`
- `src/app/api/users/route.ts`
- `src/app/api/workspace/route.ts`
- `src/app/globals.css`
- `src/components/navigator.tsx`
- `src/lib/analysis.ts`
- `src/lib/api.ts`
- `src/lib/auth.ts`
- `src/lib/documents.ts`
- `src/lib/seed.ts`
- `src/lib/task-input.ts`
- `src/lib/types.ts`
- `tests/api-smoke.mjs`
- `docs/EMPLOYEE_WORKSPACE.md`
- `prisma/migrations/001_baseline/migration.sql`
- `prisma/migrations/002_employee_workflow/migration.sql`
- `render.employee.yaml`
- `scripts/backup.mjs`
- `scripts/bootstrap-admin.mjs`
- `scripts/issue-reset.mjs`
- `scripts/migrate.mjs`
- `scripts/start-employee.mjs`
- `src/app/api/archive/route.ts`
- `src/app/api/demo/actions/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/password-reset/route.ts`
- `src/app/api/policies/[id]/action-plan/route.ts`
- `src/app/api/policies/[id]/export/route.ts`
- `src/app/api/policies/[id]/follow/route.ts`
- `src/app/api/policies/[id]/review/route.ts`
- `src/app/api/policies/[id]/versions/route.ts`
- `src/app/api/users/[id]/reset/route.ts`
- `src/components/employee.tsx`
- `src/components/presentation.tsx`
- `src/lib/notifications.ts`
- `src/lib/policy-catalog.ts`
- `src/lib/public-demo.ts`
- `src/lib/task-progress.ts`
- `tests/catalog.test.ts`
- `tests/docx.test.ts`
- `tests/employee-smoke.mjs`
- `tests/provision-preview.mjs`
- `tests/public-demo-smoke.mjs`
- `tests/storage.test.ts`
- `docs/CHANGE_REPORT.md`
