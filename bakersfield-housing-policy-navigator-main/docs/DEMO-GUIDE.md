# Demonstration guide

## Before the meeting

Follow the README installation instructions and use `DEMO_MODE=true` with `AI_MODE=demo`. Open the application on the local computer. Keep the demonstration on fictional training data. The seeded examples and all files in `examples/` are classroom material, not California legislation or adopted City procedures.

All three mock accounts use password `NavigatorDemo!2026`:

| Account                     | Role          | Suggested demonstration                                  |
| --------------------------- | ------------- | -------------------------------------------------------- |
| `staff@bakersfield.demo`    | Staff         | Submission, analysis, comparison, and task coordination. |
| `reviewer@bakersfield.demo` | Reviewer      | Human review workflow and evidence requirements.         |
| `admin@bakersfield.demo`    | Administrator | Employee access management.                              |

These credentials belong only to the local student prototype. They are not real employee accounts.

## A short end-to-end walkthrough

1. **Sign in as staff.** Show the three Home actions: View Policies, Analyze a Policy, and View Tasks. Below them are a compact status summary, policies needing attention, and upcoming tasks. Explain that the library contains manually submitted records, and demo labels identify examples. A missing effective date or statutory deadline is intentionally shown as needing verification.
2. **Open Policies.** Search the fictional permitting example (`DEMO-PERMIT-002`) and filter by category or implementation stage. Review the source text and the distinction between legislative status, review state, and implementation progress.
3. **Analyze the training policy.** Use the seeded permitting example or submit the full contents of `examples/training-policy.txt`. Run the analyzer. Show the demo indicator, source passages, plain-English explanation, recommended staff actions, and unanswered questions. Point out that no effective date or statutory deadline has been fabricated.
4. **Compare policy versions.** Open a policy and expand **More Tools → Compare Versions**. Select the training policy as the new version and supply `examples/training-previous-policy.txt` as the prior text. The written completeness-checklist instruction is unchanged; the new text adds department referral and a staff owner. Show both excerpts and explain that a textual difference is only the starting point for legal review.
5. **Look for possible gaps.** Use **More Tools → Check City Procedures** in a policy. Compare the same policy with `examples/training-procedure.txt`. The procedure excerpt covers an intake log. It does not demonstrate whether checklist, routing, or ownership instructions exist elsewhere. Discuss what additional procedures, forms, and records staff would need before making a determination.
6. **Create a task.** Add a task to review the procedure with Planning and Building & Safety. Assign a staff member or department, record the next step, and choose a staff target if scheduling a demonstration follow-up. Do not call that target a statutory deadline. Move the task through its status values and show that changes persist.
7. **Demonstrate human review.** Sign out and sign in as reviewer. Inspect the draft and its source support. The fictional training example should remain unverified as current law. Choose **Review or Update Status** inside a policy to demonstrate the review controls and their safeguards; do not add a real government URL to fictional text to force approval. For an actual policy, a reviewer must examine the exact official source and record a reasoned decision before verification.
8. **Demonstrate administration.** Sign in as administrator and open **More Tools → People & Recent Activity** to show employee management. Explain that staff cannot grant themselves permissions and that there is no public sign-up. Avoid deactivating the account currently needed for the presentation.

## Useful accuracy checks to show

- Paste unrelated text in demo mode. The application should report that the bundled example does not establish an analysis of that text, instead of pretending to have run a model.
- Compare with an incomplete procedure. The finding should be a possible gap or request for documents, not an assertion of City noncompliance.
- Use a source without an effective date. The app should preserve uncertainty.
- Open the workspace after signing out. Private records should require authentication.
- Explain that a government-domain link is a source pointer, not automatic validation of uploaded content or legal status.

## Live AI demonstration, if separately approved

Set `AI_MODE=live`, configure `OPENAI_API_KEY` server-side, and restart the server. Use approved, nonconfidential source material. The text sent for analysis or comparison will be transmitted to OpenAI. Keep the original government document open for comparison and review every material interpretation. If the API call fails, treat the error as a failed live analysis; do not describe a demo response as a live result.

## Closing the demonstration

The prototype demonstrates a workflow: policy submission, draft interpretation, potential impact, comparison, human review, and task tracking. It does not show continuous monitoring or establish that the City's practices comply with current law. Feedback should focus on staff workflow, evidence review, department ownership, missing integrations, and the criteria City IT would require for evaluation.

## Friendly starting point

From **Home**, choose **Analyze a Policy**, then **Try a guided example**. The existing policy is selected for you. Choose **Explain This Policy**, expand a supporting passage, and choose **View Policy**. In the policy details, expand **More Tools → Check City Procedures**. Choose **Load training procedure**, compare the documents, and create a review task from a finding. Use **Tasks** to update its progress.

The analyzer starts with two choices: **Choose Existing Policy** and **Upload Document**. Optional bill numbers, source links, category selection, and pasted text are available under **More Options**. A new explanation is saved as a separate policy record; the original remains available.

To revisit comparisons, expand **More Tools** in the menu, open **Check City Procedures** or **Compare Versions**, and choose a saved report. **Export report** downloads a readable text file with findings, quotations, next steps, missing documents, and the demo/live label. **Help** explains the basic workflow and status meanings.
