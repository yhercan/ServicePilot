import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: "Uğur", mode: "insensitive" } },
        { name: { contains: "Hercan", mode: "insensitive" } },
        { name: { contains: "Tazesavaş", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      teamMemberships: { include: { team: { select: { id: true, name: true } } } },
      ledTeams: { select: { id: true, name: true } },
    },
  });
  console.log("users", JSON.stringify(users, null, 2));

  const start = new Date("2026-11-09T21:00:00.000Z");
  const end = new Date("2026-11-10T20:59:59.999Z");
  const visits = await prisma.serviceVisit.findMany({
    where: { plannedDate: { gte: start, lte: end } },
    select: {
      id: true,
      title: true,
      plannedDate: true,
      teamId: true,
      team: { select: { name: true } },
      assignments: { include: { user: { select: { name: true } } } },
      calendarEntries: {
        select: { id: true, teamId: true, entryDate: true, team: { select: { name: true } } },
      },
    },
  });
  console.log("nov10 visits", JSON.stringify(visits, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
