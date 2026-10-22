# Testing and review

Run from the `housing-navigator` directory with Node.js 22.12 or newer.

```bash
npm test
npm run typecheck
npm run build
npm run test:api
```

The API suite creates a temporary SQLite database and starts its own local server on port 3101. It seeds fictional data, tests the workflow, stops the server, and removes only that temporary directory. It never reads or modifies the working `prisma/dev.db`. Set `TEST_PORT` if port 3101 is occupied. Run a new build before the API suite whenever application code changes.

The unit tests cover quotation validation, missing evidence, demo source handling, date uncertainty, source URL lookalikes, bounded request bodies, UTF-8 uploads, PDF extraction, fake PDFs, and oversized files.

The integration suite covers authentication, private document routes, staff/reviewer/admin permissions, source verification, statutory-date controls, comparison reports, task updates, account provisioning, account deactivation, session revocation, and audit records. Synthetic legal text used in these tests exists only in the temporary test database; it is not legislation.

Manual browser review should check the guided example, supporting-passage expansion, saved-report reopening, task creation and completion, keyboard focus in dialogs, and layouts at desktop and narrow widths.

Live OpenAI responses require a configured key and are not exercised by the default suite. Passing quotation checks does not establish semantic accuracy. Have staff evaluate representative official documents before any live use.

## Interface simplification review (October 18, 2026)

The change is limited to the interface, reusable modal controls, styles, and documentation. API handlers, database schema, analysis logic, evidence validation, role checks, and existing routes remain unchanged. `/help` adds a plain-language guide.

Validated locally: production build and TypeScript, all 35 integration checks (including PDF extraction and review permissions), five primary navigation items, category filtering, the guided explanation and saved result, policy overview sections and More Tools links, and 390px mobile layouts without horizontal overflow. The menu traps keyboard focus and closes after navigation; policy dialogs keep keyboard focus within visible controls.
