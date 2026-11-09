# Bakersfield Housing Policy Navigator

**Current public release: [Free meeting demonstration](docs/MEETING_DEMO.md).** Exactly two interactive fictional policies, no employee login, browser-saved tasks and public imports. No paid services. The employee setup below is retained for local/future use.


An employee-focused university SPARKS prototype for imported housing-policy evidence, human-reviewed analysis and task tracking. City approval or production readiness is not implied.

**Start with [the employee setup and deployment guide](docs/EMPLOYEE_WORKSPACE.md).** It covers first-admin setup, employee access, imports, analysis limits, task progress, document history, backups, costs and safe Render cutover.

- Authorized accounts only; administrators provision access.
- Import PDF/DOCX/TXT or paste policy text, then review and analyze the saved source.
- Create general tasks or tasks from reviewed recommendations. Status controls progress automatically: 0%, 50%, 100%; Blocked retains previous progress.
- Versions, human review, notifications, audit history and archive/restore preserve records.
- SQLite data must live on durable storage. Render's existing temporary database requires an approved migration before deployment.
- No accounts or fictional policies are automatically seeded in employee mode. Explicit isolated tests use randomly generated credentials.

## Local development

Use Node 24.14.0 and pnpm 11.25.0. Copy `.env.example`, set an absolute SQLite path and local APP_URL, then:

```sh
pnpm install --frozen-lockfile
pnpm db:setup
node --env-file=.env scripts/bootstrap-admin.mjs approved-email@example.org "Administrator name"
pnpm dev
```

Privately open the one-time setup link and set your password. Never commit `.env`, credentials or databases. `AI_MODE=demo` gives labeled source excerpts for arbitrary documents; useful live AI requires an approved provider/key and separate validation.

## Checks

```sh
pnpm test
pnpm build
pnpm test:api
pnpm audit --prod
```

Do not automatically deploy the feature branch. The reviewed `render.employee.yaml` proposal must be applied to the existing service only after a genuine-data backup and hosting-cost approval. See the deployment guide before merging.
