import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  const [calendar, teams] = await Promise.all([
    prisma.calendarEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        entryDate: true,
        serviceVisitId: true,
        team: { select: { id: true, name: true } },
      },
    }),
    prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  console.log("recent calendar:", JSON.stringify(calendar, null, 2));
  console.log("teams:", JSON.stringify(teams, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
