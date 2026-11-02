import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });

const REAL = "4b0c6c04-a1e3-4a0d-aad0-8b21f3f0a064"; // turgay@gmail.com
const DEMO = "fd497dcb-f2ce-4c3e-8533-9b58b178210f"; // turgay@servispilot.local
const TEAM = "b37d9567-8ca8-4536-b7e8-6f3dd34afdbc";

const before = await prisma.team.findUnique({
  where: { id: TEAM },
  select: { name: true, leaderId: true, leader: { select: { email: true } } },
});
console.log("before", before);

await prisma.team.update({
  where: { id: TEAM },
  data: { leaderId: REAL },
});

// Demo Turgay'ı ekipten çıkar (çift kayıt)
await prisma.teamMembership.deleteMany({
  where: { teamId: TEAM, userId: DEMO },
});

const after = await prisma.team.findUnique({
  where: { id: TEAM },
  select: {
    name: true,
    leaderId: true,
    leader: { select: { id: true, name: true, email: true } },
  },
});
console.log("after", after);

// Eksik bildirim: sıradaki ziyaret için gerçek lidere
const visit = await prisma.serviceVisit.findFirst({
  where: { id: "c783f4af-d4db-4d49-b54f-eaa8f6845bb6" },
  include: { customer: { select: { companyName: true } } },
});
if (visit?.nextVisitEnabled && visit.nextVisitDate && visit.nextVisitType) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId: REAL,
      type: "NEXT_VISIT_SCHEDULED",
      href: `/servisler/${visit.id}`,
    },
  });
  if (!existing) {
    await prisma.notification.create({
      data: {
        organizationId: visit.organizationId,
        userId: REAL,
        type: "NEXT_VISIT_SCHEDULED",
        title: "Sıradaki ziyaret planlandı",
        body: `${visit.customer.companyName} · ${visit.title} için sıradaki ziyaret kaydı oluşturuldu.`,
        href: `/servisler/${visit.id}`,
      },
    });
    console.log("notification created for real Turgay");
  }
}

await prisma.$disconnect();
