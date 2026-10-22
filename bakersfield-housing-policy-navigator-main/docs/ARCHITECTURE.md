# Architecture

## Request flow

```text
Employee browser
  -> Next.js React interface
  -> Authenticated server route handlers
       -> Session and role checks
       -> Input, origin, file, and citation validation
       -> Prisma -> private local SQLite database
       -> Administrator refresh -> approved official California source pages
       -> Analysis service -> deterministic demo engine
                           -> OpenAI API (explicit live configuration only)
```

The browser never receives the API key or password hashes. Policy text, internal notes, extracted document text, tasks, comparisons, and review history are stored on the server. Normal read and write APIs require an authenticated employee session. Public registration is absent.

## Components

| Location               | Responsibility                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `src/app`              | Next.js application entry points, layout, and API route handlers.                                  |
| `src/components`       | Employee navigation, dashboard, library, analyzer, comparisons, tasks, and administration views.   |
| `src/lib/types.ts`     | Shared display contracts, categories, departments, and statuses.                                   |
| `src/lib/db.ts`        | Shared Prisma client and local database access.                                                    |
| `src/lib/auth.ts`      | Password hashing, opaque sessions, public user projection, and role guards.                        |
| `src/lib/api.ts`       | API errors, bounded JSON input, source URL rules, date handling, origin checks, and audit helpers. |
| `src/lib/fixtures.ts`  | Exact fictional source texts synchronized with `examples/`.                                        |
| `prisma/schema.prisma` | Persistent model definitions.                                                                      |
| `tests`                | Automated analysis and API behavior checks.                                                        |

## Data model

- **User / Session:** staff identity, role, department, active flag, password hash, hashed random session tokens, and expiration.
- **Policy:** source text and URL; bill/source identifier; session or guidance year; record type; category; proposed/enacted status; source-check status; relevance; draft analysis; review state; verified dates; last checked date; assigned department; implementation stage.
- **PolicyUpdate:** detected imports, source changes, and unavailable-source events with the source hash, changed fields, and optional before/after snapshots.
- **Document:** private extracted text and document metadata for comparisons and supporting documentation.
- **Task:** policy relation, assignee, department, notes, status, optional supporting document, and a due date classified as a staff target, AI suggestion, or verified statutory date.
- **Comparison:** stored gap or version comparison result associated with a policy.
- **Audit:** actor, action, affected record, time, description, and before/after data for significant changes.

SQLite is appropriate for a local demonstration. A future PostgreSQL move should preserve these relationships and replace `db push` with reviewed migrations and operational backup procedures.

## Roles

| Capability                                                       | Staff | Reviewer | Administrator |
| ---------------------------------------------------------------- | ----- | -------- | ------------- |
| Read internal workspace and documents                            | Yes   | Yes      | Yes           |
| Submit policies, draft analysis, compare documents, manage tasks | Yes   | Yes      | Yes           |
| Approve a policy interpretation or verified information          | No    | Yes      | Yes           |
| Create or change employee accounts and roles                     | No    | No       | Yes           |

All three roles are internal. A reviewer is a workflow permission, not evidence of an individual's legal qualifications. This MVP shares one internal workspace; it does not provide matter-level, department-level, or attorney-client-privilege segregation.

## Analysis and review boundary

AI output is structured into policy summary, changes, plain-English explanation, possible impacts, suggested actions, dates, unanswered questions, and warnings. Material claims carry a source identifier and an exact supporting passage when available. Invalid or missing evidence must remain unverified. Quotes are checked against submitted text; this prevents fabricated quotations, but cannot guarantee that a model's paraphrase is legally correct or that the supplied text is authoritative.

Demo mode recognizes the bundled fictional fixture and returns a labeled example analysis. It must not present a fictional explanation of an arbitrary uploaded document as live AI. Live mode is a separate server-side path requiring `AI_MODE=live` and an API key. It sends submitted source text to OpenAI; using it with actual internal records requires the City's approval of that processing.

Gap comparison evaluates a policy against a supplied procedure excerpt. Version comparison evaluates new and prior policy text. Both retain supporting excerpts and distinguish documented text differences from possible procedural gaps. No engine output automatically makes a legal compliance determination or verifies a statutory date.

## Extension points

The current ingestion service retrieves a curated allowlist of official California Legislature and HCD pages, de-duplicates by source identifier, session/year, and source URL, stores a content hash, and places changes in the staff review queue. An administrator-only endpoint and `pnpm policies:refresh` script support host-specific daily scheduling; the app does not run a background worker by itself.

Production identity should replace mock local credentials with City-approved SSO, MFA, and provisioning. Hosting should add TLS, secret management, reliable backups, log retention, request throttling, document scanning, and security monitoring. A separate approved-public-content model and publication workflow would be required before any external audience is enabled.

## Usability decisions

Home offers a guided fictional example for first-time users. Navigation describes the employee's action: understand a policy, check a procedure, compare versions, or manage tasks. Forms provide defaults and put optional task evidence in a disclosure section. Analysis offers a direct next step into procedure review. Comparison results are saved and can be reopened; exports use readable text. Date-only values render without timezone shifts. Text sizes, contrast, keyboard focus, dialog focus trapping, loading feedback, and small-screen layouts are included in the prototype.

The API is intentionally internal-only. Disabling demo mode also rejects existing built-in mock accounts. Editing verified source evidence revokes dependent statutory-date verification. That date becomes **Needs Verification**, even when a reviewer immediately verifies the revised policy, until a reviewer separately checks the task evidence.

## Implementation references

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Prisma 6 SQLite configuration](https://www.prisma.io/docs/orm/v6/reference/connection-urls)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [PDFParse usage](https://github.com/mehmet-kozan/pdf-parse)

The live integration uses the OpenAI Responses API with a structured schema, `store: false`, a server-side key, a time limit, and explicit errors. Exact quote validation is an additional check after generation, not a guarantee of interpretation quality.
