# Bakersfield Housing Policy Navigator

An internal, student-developed housing policy research and coordination prototype for the CSUB community project with the City of Bakersfield. It connects manually submitted policy text to cited draft analysis, document comparisons, staff review, and implementation tasks.

**Local demonstration only.** Seeded policies are fictional training examples. The app does not monitor all legislation, determine legal compliance, or replace City Attorney review. Public registration and developer access are not enabled.

## Run locally

On this Mac, double-click **Start Navigator.command**, keep its Terminal window open, and visit [Navigator](http://127.0.0.1:3000). Choose **Planner**, then **Try a guided example**. The launcher uses installed Node.js or the available Codex runtime and preserves your saved work.

Use Node.js 22.12 or newer and npm (Node 24 is recommended). Run these commands from this directory:

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open [the local application](http://127.0.0.1:3000). Keep `APP_URL` consistent with the address in your browser; mutation requests are checked against that origin. The development and start scripts bind to the local loopback address.

The default environment uses local SQLite and labeled demo analysis, so no OpenAI key is required. `db:setup` generates the Prisma client, creates the local schema, and runs the demo seed. Re-running the seed is not a database reset and should not be used to erase working data.

## Mock accounts

With `DEMO_MODE=true`, use one of these simulated internal accounts. All use **`NavigatorDemo!2026`**.

| Email                       | Role          |
| --------------------------- | ------------- |
| `staff@bakersfield.demo`    | Staff         |
| `reviewer@bakersfield.demo` | Reviewer      |
| `admin@bakersfield.demo`    | Administrator |

Staff can submit and organize work. Reviewers and administrators can approve verified information when evidence requirements are met. Only administrators can manage employee access. These accounts must not be used for a real municipal deployment.

## Features

- Dashboard showing manually tracked policies, review needs, upcoming verified dates, and task workload.
- Searchable legislation library with category, legislative status, relevance, and implementation information.
- Policy analyzer for pasted text and supported document uploads, with structured findings and source passages.
- Policy version comparison and preliminary procedure gap comparison.
- Human review and correction of draft analysis, source verification controls, and audit history.
- Department assignments, task notes, progress tracking, supporting documents, and explicit due-date types.
- Internal session authentication and staff, reviewer, and administrator permissions.

The library searches submitted records. Official-source URLs are stored as references; the MVP does not fetch or verify arbitrary websites. A source quote must be checked in context. Neither an exact quote nor an official hostname proves that an interpretation is current or legally correct.

## AI configuration

```dotenv
DATABASE_URL="file:./dev.db"
APP_URL="http://127.0.0.1:3000"
DEMO_MODE="true"
AI_MODE="demo"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

`DEMO_MODE` enables local mock accounts and seed data. `AI_MODE` chooses the analysis path independently. Demo analysis recognizes the supplied training fixtures and is visibly labeled. Arbitrary input must remain unverified instead of receiving a fabricated demonstration result.

To use live analysis, explicitly set `AI_MODE=live`, add a valid server-side `OPENAI_API_KEY`, and restart the app. Submitted source text is then sent to OpenAI. Do not enter actual internal or confidential documents until the City has approved that processing and the application's security controls. Never put an API key in a `NEXT_PUBLIC_` variable or commit `.env`.

## Build and checks

```bash
npm run typecheck
npm test
npm run build
npm start
```

The API suite creates its own temporary SQLite database and local test server; it does not use your demo database. Run `npm run test:api` after a successful build. See [Testing](docs/TESTING.md).

## Project guide

- [Demonstration walkthrough](docs/DEMO-GUIDE.md)
- [Architecture and extension points](docs/ARCHITECTURE.md)
- [Project assumptions and March 2023 source context](docs/PROJECT-CONTEXT.md)
- [Training policy](examples/training-policy.txt), [prior version](examples/training-previous-policy.txt), and [procedure excerpt](examples/training-procedure.txt)

## Known limitations and deployment gates

This is a local proof of concept with one shared internal workspace. SQLite, mock password login, local rate limits, and the present audit implementation are not a completed municipal security or records-management solution. There is no public sharing workflow, automated legislative monitoring, SSO/MFA integration, OCR pipeline, or automatic legal source verification. Uploaded PDFs must contain extractable text; scanned and encrypted documents may require preparation outside this app.

AI may misunderstand source material even when a quotation is valid. A gap finding based on an incomplete document is preliminary. Effective dates, deadlines, enacted status, and interpretations require authoritative evidence and human review. The March 2023 Affordable Housing Strategy is historical context; its Appendix D is not treated as a current legislative database.

Before deployment, City IT and responsible City personnel should approve identity integration and provisioning, hosting and TLS, threat assessment and security testing, document handling and scanning, AI data processing, backups, retention and deletion, audit integrity, accessibility, operational support, and access segregation. Disable and remove all mock accounts and training data as part of an approved deployment process. Any future developer or public access requires a separate publication workflow and explicit City authorization.
