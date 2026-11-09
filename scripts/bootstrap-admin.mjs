// Run only from the trusted server shell, after migration. Never accepts a password on the command line.
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash, scryptSync } from "node:crypto";
const [email, name] = process.argv.slice(2);
if (!email || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error(
    'Usage: node scripts/bootstrap-admin.mjs approved-email "Administrator name"',
  );
if (!process.env.APP_URL || !process.env.DATABASE_URL)
  throw new Error(
    "Set APP_URL and DATABASE_URL in the secure server environment.",
  );
const db = new PrismaClient();
try {
  const token = randomBytes(32).toString("hex");
  await db.$transaction(async (tx) => {
    if (await tx.user.count({ where: { role: "ADMIN", active: true } }))
      throw new Error(
        "An active administrator already exists. Use account management; bootstrap refuses to replace it.",
      );
    const salt = randomBytes(16).toString("hex");
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: "ADMIN",
        department: "City Manager",
        passwordHash: `${salt}:${scryptSync(randomBytes(32), salt, 64).toString("hex")}`,
      },
    });
    await tx.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    await tx.audit.create({
      data: {
        actor: "Trusted server operator",
        action: "First administrator provisioned",
        entityType: "User",
        entityId: user.id,
        detail:
          "Initial password must be set through a single-use 30-minute reset link.",
      },
    });
  });
  console.log(
    "PRIVATE, single-use setup link; expires in 30 minutes. Deliver through an approved private channel. Do not save in shared logs.",
  );
  console.log(`${new URL(process.env.APP_URL).origin}/#reset=${token}`);
} finally {
  await db.$disconnect();
}
