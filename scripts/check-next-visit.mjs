import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });

const hercan = await prisma.user.findFirst({
  where: { name: { contains: "Hercan" } },
  select: { id: true, name: true },
});
const turgay = await prisma.user.findFirst({
  where: { name: { contains: "Turgay" } },
  select: { id: true, name: true },
});
console.log("users", hercan, turgay);

const visits = await prisma.serviceVisit.findMany({
  where: { nextVisitEnabled: true },
  select: {
    id: true,
    title: true,
    teamId: true,
    nextVisitDate: true,
    nextVisitType: true,
    nextVisitEnabled: true,
    nextVisitNotifiedAt: true,
    team: { select: { name: true, leaderId: true } },
    assignments: { select: { user: { select: { name: true } } } },
    customer: { select: { companyName: true } },
  },
  orderBy: { updatedAt: "desc" },
  take: 10,
});
console.log("next visits", JSON.stringify(visits, null, 2));

if (turgay) {
  const notifs = await prisma.notification.findMany({
    where: { userId: turgay.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  console.log("turgay notifs", JSON.stringify(notifs, null, 2));

  const led = await prisma.team.findMany({
    where: { leaderId: turgay.id },
    select: { id: true, name: true },
  });
  console.log("turgay teams", led);
}

await prisma.$disconnect();
