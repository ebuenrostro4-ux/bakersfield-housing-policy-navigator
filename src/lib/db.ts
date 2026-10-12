import { PrismaClient } from "@prisma/client";

const globalDB = globalThis as unknown as { navigatorDB?: PrismaClient };
export const db = globalDB.navigatorDB ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDB.navigatorDB = db;
