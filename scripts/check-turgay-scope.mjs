import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });

const turgay = await prisma.user.findFirst({
  where: { email: "turgay@gmail.com" },
  select: {
    id: true,
    name: true,
    email: true,
    memberships: { select: { role: true } },
    ledTeams: { select: { id: true, name: true, isActive: true } },
    teamMemberships: { include: { team: { select: { id: true, name: true, leaderId: true } } } },
  },
});

console.log(JSON.stringify(turgay, null, 2));

const allTeams = await prisma.team.findMany({
  where: { organizationId: "6f4c1780-3d34-4867-bf0f-eed09b33e538", isActive: true },
  select: { name: true, leader: { select: { name: true, email: true } } },
  orderBy: { name: "asc" },
});
console.log("all teams leaders:", JSON.stringify(allTeams, null, 2));

await prisma.$disconnect();
