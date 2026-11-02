import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });

const team = await prisma.team.findUnique({
  where: { id: "b37d9567-8ca8-4536-b7e8-6f3dd34afdbc" },
  include: {
    leader: { select: { id: true, name: true, email: true } },
    memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
  },
});
console.log("team", JSON.stringify(team, null, 2));

const turgayMem = await prisma.membership.findMany({
  where: { userId: "4b0c6c04-a1e3-4a0d-aad0-8b21f3f0a064" },
  select: { role: true, organizationId: true },
});
console.log("turgay membership", turgayMem);

const turgayTeams = await prisma.teamMembership.findMany({
  where: { userId: "4b0c6c04-a1e3-4a0d-aad0-8b21f3f0a064" },
  include: { team: { select: { id: true, name: true, leaderId: true } } },
});
console.log("turgay team memberships", JSON.stringify(turgayTeams, null, 2));

await prisma.$disconnect();
