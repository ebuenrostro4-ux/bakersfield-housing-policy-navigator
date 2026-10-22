# Project context and scope

## Purpose

Bakersfield Housing Policy Navigator is a student-developed internal proof of concept for California State University, Bakersfield's community-based project with the City of Bakersfield. It brings submitted policy text, cited draft explanations, comparison findings, staff review, and implementation tasks into one workflow.

The program supports policy research and coordination. It does not determine legal compliance, replace City Attorney review, or represent a live inventory of California housing law.

## User-provided source context

The workspace includes **Bakersfield Affordable Housing Strategy FINAL.pdf**, dated March 2023. The following references were checked against the text of the provided PDF:

| Printed report page | PDF viewer page | Historical context                                                                                                                                                                                                      | Application response                                                                                          |
| ------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 5                   | 6               | Strategy 2 concerns implementation capacity, partnerships, advocacy, and monitoring. Action 2-1 addresses coordination among housing organizations; Action 2-7 addresses tracking and assessment of housing strategies. | Department assignments, review queues, task status, and a decision history.                                   |
| 6                   | 7               | Strategy 3 concerns making housing easier to build. Action 3-1 addresses a more predictable and efficient housing development permitting process.                                                                       | Organize potential permitting impacts, compare source documents, and track review of existing procedures.     |
| 93–105, Appendix D  | 104–116         | A review of recent legislation affecting affordable housing development as understood when the March 2023 report was prepared.                                                                                          | Useful historical context and a starting point for later research; never used as verification of current law. |

Printed and PDF page numbers differ, particularly in the appendices. These references are to the supplied report, not an assertion that the strategies have since been adopted, completed, or left incomplete. The historical legislative summaries in Appendix D were not imported as verified current requirements.

## Decisions and assumptions

- Phase 1 is an internal staff application. There is no public registration, developer role, public document endpoint, or automatic external access.
- Local demonstrations use simulated employee accounts and clearly fictional training documents. They do not impersonate real City employees or assert current legal requirements.
- Manual submission comes first: an employee enters a policy identifier and official URL and pastes text or uploads a supported document. An official-looking URL alone is not evidence that the submitted text matches that source.
- Automated monitoring, scraping, legislative status retrieval, and comprehensive bill search are future integrations. The library searches records already submitted to this installation.
- A source quote supports traceability; it does not by itself establish whether an interpretation is correct, current, complete, or applicable to a particular project.
- Missing procedure text produces a possible gap or a request for more documents. It is not a finding that the City is noncompliant.
- Staff review is explicit. Reviewer and administrator roles are permitted to approve verified information; ordinary staff can submit and coordinate work.
- Source edits or analysis changes require renewed review. Suggested actions and staff scheduling targets are kept distinct from verified statutory dates.
- The minimum maintainable stack is Next.js, React, TypeScript, server-side route handlers, and SQLite through Prisma. External identity, enterprise deployment, and a production database are future work.

## Delivery boundary

The deliverable is a working local student demonstration. Before municipal use, the City needs to approve hosting, identity integration, access boundaries, record retention, incident handling, document handling, and any external AI processing. Expansion to developers or the public requires a separate City decision and an explicit publication boundary; internal records must not simply be exposed through the present endpoints.
