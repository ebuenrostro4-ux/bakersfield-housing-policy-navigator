import { db } from "./db";
import { hashPassword } from "./auth";
import {
  DEMO_POLICY_TEXT,
  DEMO_PREVIOUS_TEXT,
  DEMO_PROCEDURE_TEXT,
} from "./fixtures";

let pending: Promise<void> | undefined;

/** Explicitly opt-in training data only. Never creates accounts outside demo mode. */
export async function ensureSeed() {
  if (process.env.DEMO_MODE !== "true") return;
  if (!pending)
    pending = seedDemo().catch((error) => {
      pending = undefined;
      throw error;
    });
  await pending;
}

async function seedDemo() {
  if (await db.audit.findUnique({ where: { id: "demo-seed-v1" } })) return;
  await db.$transaction(
    async (tx) => {
      if (await tx.audit.findUnique({ where: { id: "demo-seed-v1" } })) return;
      const passwordHash = hashPassword("NavigatorDemo!2026");
      for (const user of [
        {
          id: "demo-admin",
          name: "Alex Morgan",
          email: "admin@bakersfield.demo",
          role: "ADMIN",
          department: "City Manager",
        },
        {
          id: "demo-reviewer",
          name: "Jordan Lee",
          email: "reviewer@bakersfield.demo",
          role: "REVIEWER",
          department: "City Attorney",
        },
        {
          id: "demo-staff",
          name: "Sam Rivera",
          email: "staff@bakersfield.demo",
          role: "STAFF",
          department: "Planning",
        },
      ])
        await tx.user.upsert({
          where: { email: user.email },
          update: {},
          create: { ...user, passwordHash },
        });
      const fixtures = [
        {
          id: "TRAINING-101",
          billNumber: "DEMO-PERMIT-002",
          title: "Housing application coordination",
          category: "Permitting",
          department: "Planning",
          implementationStatus: "Action Required",
          impact:
            "Explore a completeness checklist and department referral record using fictional material.",
          sourceText: DEMO_POLICY_TEXT,
        },
        {
          id: "TRAINING-102",
          billNumber: "TRAINING-102",
          title: "Accessory dwelling unit intake",
          category: "ADUs",
          department: "Building & Safety",
          implementationStatus: "Under Review",
          impact: "Practice reviewing an ADU intake handoff.",
          sourceText:
            "TRAINING EXAMPLE ONLY — NOT A LAW OR CITY POLICY. In this fictional classroom scenario, staff evaluate whether a simulated ADU intake form captures the information needed for a department handoff. This example creates no legal requirements, effective dates, or statutory deadlines.",
        },
        {
          id: "TRAINING-103",
          billNumber: "TRAINING-103",
          title: "Housing site review coordination",
          category: "Zoning",
          department: "Planning",
          implementationStatus: "Not Reviewed",
          impact:
            "Practice identifying questions about a fictional housing site review.",
          sourceText:
            "TRAINING EXAMPLE ONLY — NOT A LAW OR CITY POLICY. This fictional exercise asks a team to compare two simulated housing site review checklists and document unanswered questions. It makes no claim about current zoning law. No effective date or statutory deadline is supplied.",
        },
        {
          id: "TRAINING-104",
          billNumber: "TRAINING-104",
          title: "Affordable housing funding intake",
          category: "Funding",
          department: "Economic & Community Development",
          implementationStatus: "Under Review",
          impact:
            "Consider staff coordination around a fictional funding intake.",
          sourceText:
            "TRAINING EXAMPLE ONLY — NOT A LAW OR CITY POLICY. A simulated department receives a hypothetical affordable housing funding inquiry and records which staff member will follow up. No actual grant eligibility, funding availability, legal requirement, effective date, or statutory deadline is asserted.",
        },
        {
          id: "TRAINING-105",
          billNumber: "TRAINING-105",
          title: "Housing program progress review",
          category: "Housing Element",
          department: "Planning",
          implementationStatus: "Action Required",
          impact:
            "Practice collecting internal progress notes without asserting compliance.",
          sourceText:
            "TRAINING EXAMPLE ONLY — NOT A LAW OR CITY POLICY. In this classroom exercise, staff gather hypothetical program progress notes and prepare questions for a reviewer. This does not describe a real Housing Element requirement or determine compliance. No effective date or statutory deadline is provided.",
        },
        {
          id: "TRAINING-106",
          billNumber: "TRAINING-106",
          title: "Internal policy review record",
          category: "Administration",
          department: "City Manager",
          implementationStatus: "Completed",
          impact: "Demonstrate documenting a staff review decision.",
          sourceText:
            "TRAINING EXAMPLE ONLY — NOT A LAW OR CITY POLICY. The fictional team records its review notes and assigns an owner for a simulated policy update. This is a training workflow, not a legal requirement or adopted City procedure. No effective date or statutory deadline is established.",
        },
      ];
      for (const policy of fixtures) {
        await tx.policy.upsert({
          where: { id: policy.id },
          update: {},
          create: {
            ...policy,
            sample: true,
            sourceUrl: "",
            reviewNote:
              "Fictional classroom material. Human verification as law is disabled for samples.",
          },
        });
      }
      await tx.document.upsert({
        where: { id: "demo-procedure" },
        update: {},
        create: {
          id: "demo-procedure",
          name: "Training: simulated housing intake procedure",
          kind: "procedure",
          text: DEMO_PROCEDURE_TEXT,
        },
      });
      await tx.document.upsert({
        where: { id: "demo-previous" },
        update: {},
        create: {
          id: "demo-previous",
          name: "Training: previous coordination practice",
          kind: "previous",
          text: DEMO_PREVIOUS_TEXT,
        },
      });
      const tasks = [
        {
          title: "Review the simulated intake checklist",
          policyId: "TRAINING-101",
          department: "Planning",
          status: "In progress",
          days: 3,
        },
        {
          title: "Discuss fictional ADU handoff questions",
          policyId: "TRAINING-102",
          department: "Building & Safety",
          status: "To do",
          days: 7,
        },
        {
          title: "Prepare a funding intake discussion",
          policyId: "TRAINING-104",
          department: "Economic & Community Development",
          status: "To do",
          days: 10,
        },
        {
          title: "Gather sample program progress notes",
          policyId: "TRAINING-105",
          department: "Planning",
          status: "To do",
          days: 14,
        },
        {
          title: "Document the classroom review decision",
          policyId: "TRAINING-106",
          department: "City Manager",
          status: "Done",
          days: -1,
        },
      ];
      for (const [index, task] of tasks.entries()) {
        const { days, ...data } = task;
        const dueDate = new Date();
        dueDate.setUTCDate(dueDate.getUTCDate() + days);
        dueDate.setUTCHours(0, 0, 0, 0);
        await tx.task.upsert({
          where: { id: `demo-task-${index + 1}` },
          update: {},
          create: {
            id: `demo-task-${index + 1}`,
            ...data,
            dueDate,
            dateType: "Staff target",
            description:
              "Fictional training task. This due date is an internal staff target and is not a statutory deadline.",
            assignee: "Sam Rivera",
            supportingDocumentId: index === 0 ? "demo-procedure" : null,
          },
        });
      }
      await tx.audit.create({
        data: {
          id: "demo-seed-v1",
          actor: "Demo setup",
          action: "Training workspace created",
          entityType: "Workspace",
          entityId: "demo",
          detail:
            "Six fictional policies, five internal staff targets, two fictional documents, and three mock employee accounts. No legal claims or verified dates.",
        },
      });
    },
    { timeout: 20_000 },
  );
}
