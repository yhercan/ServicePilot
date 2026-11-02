import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  const orphans = await prisma.serviceVisit.findMany({
    where: {
      teamId: { not: null },
      calendarEntries: { none: {} },
    },
    include: {
      assignments: { select: { userId: true } },
    },
  });

  console.log(`Orphan visits: ${orphans.length}`);
  for (const visit of orphans) {
    if (!visit.teamId) continue;
    await prisma.calendarEntry.create({
      data: {
        organizationId: visit.organizationId,
        teamId: visit.teamId,
        title: visit.title,
        description: visit.description,
        entryDate: visit.plannedDate,
        customerId: visit.customerId,
        equipmentId: visit.equipmentId,
        serviceVisitId: visit.id,
        serviceType: visit.serviceType,
        priority: visit.priority,
        status: visit.status,
        createdById: visit.createdById,
        assignments: {
          create: visit.assignments.map((item) => ({ userId: item.userId })),
        },
      },
    });
    console.log(`linked: ${visit.title}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
