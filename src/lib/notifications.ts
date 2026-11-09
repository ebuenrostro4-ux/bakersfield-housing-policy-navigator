import { db } from "./db";
export async function employeeNotifications(userId: string) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
  const horizon = new Date(`${today}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 7);
  const soon = horizon.toISOString().slice(0, 10);
  const tasks = await db.task.findMany({
    where: {
      assigneeId: userId,
      status: { not: "Completed" },
      dueDate: { not: null },
      OR: [{ policyId: null }, { policy: { sample: false, archived: false } }],
    },
  });
  for (const t of tasks) {
    const date = t.dueDate!.toISOString().slice(0, 10);
    if (date > soon) continue;
    const stage = date < today ? "Overdue" : "Due soon",
      key = `deadline-${t.id}-${userId}-${date}-${stage}`;
    await db.notification.upsert({
      where: { key },
      update: {},
      create: {
        key,
        userId,
        title: `${stage}: ${t.title} (${date})`,
        href: "/tracker?mine=1",
      },
    });
  }
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
