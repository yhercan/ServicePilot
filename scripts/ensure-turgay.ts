import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });
const demoPassword = "ServisPilot123!";

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: "Kuzey Teknik Servis" },
    select: { id: true },
  });
  if (!org) throw new Error("Kuzey Teknik Servis organizasyonu bulunamadı.");

  const passwordHash = await hash(demoPassword, 12);

  const turgay = await prisma.user.upsert({
    where: { email: "turgay@servispilot.local" },
    update: { name: "Turgay Bozdağ", passwordHash },
    create: {
      name: "Turgay Bozdağ",
      email: "turgay@servispilot.local",
      passwordHash,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: turgay.id },
    },
    update: { role: "TEAM_LEADER" },
    create: {
      organizationId: org.id,
      userId: turgay.id,
      role: "TEAM_LEADER",
    },
  });

  const engineers = await Promise.all(
    [
      ["Berk Yılmaz", "berk@servispilot.local"],
      ["Selin Kara", "selin@servispilot.local"],
    ].map(async ([name, email]) => {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, passwordHash },
        create: { name, email, passwordHash },
      });
      await prisma.membership.upsert({
        where: {
          organizationId_userId: { organizationId: org.id, userId: user.id },
        },
        update: { role: "SERVICE_ENGINEER" },
        create: {
          organizationId: org.id,
          userId: user.id,
          role: "SERVICE_ENGINEER",
        },
      });
      return user;
    }),
  );

  const team = await prisma.team.upsert({
    where: {
      organizationId_name: { organizationId: org.id, name: "Atomika - Panalytical" },
    },
    update: {
      leaderId: turgay.id,
      isActive: true,
      description: "Atomika / Panalytical ürün grubu saha ekibi",
    },
    create: {
      organizationId: org.id,
      name: "Atomika - Panalytical",
      description: "Atomika / Panalytical ürün grubu saha ekibi",
      leaderId: turgay.id,
      isActive: true,
    },
  });

  for (const user of [turgay, ...engineers]) {
    await prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: {},
      create: { teamId: team.id, userId: user.id },
    });
  }

  const customer = await prisma.customer.findFirst({
    where: { organizationId: org.id },
    include: { equipment: { take: 1 } },
  });

  if (customer?.equipment[0]) {
    const existingVisit = await prisma.serviceVisit.findFirst({
      where: {
        organizationId: org.id,
        title: "Atomika kalibrasyon kontrolü",
      },
      select: { id: true },
    });
    if (!existingVisit) {
      await prisma.serviceVisit.create({
        data: {
          organizationId: org.id,
          customerId: customer.id,
          equipmentId: customer.equipment[0].id,
          teamId: team.id,
          title: "Atomika kalibrasyon kontrolü",
          description: "Panalytical cihaz kalibrasyon ve saha kontrolü.",
          serviceType: "MAINTENANCE",
          priority: "NORMAL",
          status: "ASSIGNED",
          plannedDate: new Date("2026-11-04T09:00:00+03:00"),
          createdById: turgay.id,
          assignments: {
            create: [{ userId: engineers[0].id }, { userId: turgay.id }],
          },
          statusHistory: {
            create: {
              changedById: turgay.id,
              previousStatus: null,
              newStatus: "ASSIGNED",
              note: "Atomika ekibi ziyareti oluşturuldu.",
            },
          },
        },
      });
    }
  }

  console.log("Turgay Bozdağ hazır.");
  console.log("  e-posta: turgay@servispilot.local");
  console.log(`  şifre:   ${demoPassword}`);
  console.log(`  ekip:    ${team.name}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
