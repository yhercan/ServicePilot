import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPid?: number;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }
  return new PrismaClient({
    adapter: new PrismaPg(connectionString),
  });
}

/** Dev HMR can keep a stale client after `prisma generate`; recreate per process. */
function getPrisma() {
  if (process.env.NODE_ENV !== "production") {
    if (!globalForPrisma.prisma || globalForPrisma.prismaPid !== process.pid) {
      void globalForPrisma.prisma?.$disconnect().catch(() => undefined);
      globalForPrisma.prisma = createPrismaClient();
      globalForPrisma.prismaPid = process.pid;
    }
    return globalForPrisma.prisma;
  }
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
