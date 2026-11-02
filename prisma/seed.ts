import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import { localFileStorage } from "../src/server/storage/local-storage";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });
const demoPassword = "ServisPilot123!";

function at(month: number, day: number, hour = 9) {
  return new Date(
    `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+03:00`,
  );
}

async function main() {
  const existing = await prisma.organization.findFirst({
    where: { name: "Kuzey Teknik Servis" },
    select: { id: true },
  });
  if (existing) {
    console.log("Demo organization already exists. Seed skipped.");
    return;
  }

  const passwordHash = await hash(demoPassword, 12);
  const north = await prisma.organization.create({ data: { name: "Kuzey Teknik Servis" } });
  const south = await prisma.organization.create({ data: { name: "Güney Bakım Hizmetleri" } });

  const [admin, manager, elif, can, other] = await Promise.all(
    [
      ["Ayşe Demir", "admin@servispilot.local"],
      ["Mehmet Kaya", "yonetici@servispilot.local"],
      ["Elif Şahin", "teknisyen@servispilot.local"],
      ["Can Öztürk", "teknisyen2@servispilot.local"],
      ["Deniz Acar", "diger@servispilot.local"],
    ].map(([name, email]) =>
      prisma.user.create({ data: { name, email, passwordHash }, select: { id: true, email: true } }),
    ),
  );

  await prisma.membership.createMany({
    data: [
      { organizationId: north.id, userId: admin.id, role: "ADMIN" },
      { organizationId: north.id, userId: manager.id, role: "OPERATIONS_MANAGER" },
      { organizationId: north.id, userId: elif.id, role: "SERVICE_ENGINEER" },
      { organizationId: north.id, userId: can.id, role: "SERVICE_ENGINEER" },
      { organizationId: south.id, userId: other.id, role: "ADMIN" },
    ],
  });

  const marmara = await prisma.customer.create({
    data: {
      organizationId: north.id,
      companyName: "Marmara Gıda A.Ş.",
      contactPerson: "Selin Aydın",
      email: "selin.aydin@example.com",
      phone: "0212 555 01 01",
      city: "İstanbul",
      address: "Tuzla OSB 4. Cadde No: 12",
      notes: "Soğuk oda bakımı öncelikli.",
      operationsManagerId: manager.id,
    },
  });
  const ege = await prisma.customer.create({
    data: {
      organizationId: north.id,
      companyName: "Ege Soğutma Ltd.",
      contactPerson: "Kerem Usta",
      email: "kerem@example.com",
      phone: "0232 555 02 02",
      city: "İzmir",
      address: "Çiğli Sanayi Sitesi B Blok",
      operationsManagerId: manager.id,
    },
  });
  await prisma.customer.create({
    data: {
      organizationId: south.id,
      companyName: "Anadolu Enerji",
      contactPerson: "Burcu Tan",
      email: "burcu@example.com",
      phone: "0312 555 03 03",
      city: "Ankara",
      address: "OSTİM 100. Sokak",
    },
  });

  const chiller = await prisma.equipment.create({
    data: {
      organizationId: north.id,
      customerId: marmara.id,
      name: "Chiller Ünite 2",
      brand: "Carrier",
      model: "30RB",
      serialNumber: "CH-2024-118",
      installationDate: new Date("2024-05-14T00:00:00.000Z"),
      location: "Üretim holü",
    },
  });
  const compressor = await prisma.equipment.create({
    data: {
      organizationId: north.id,
      customerId: ege.id,
      name: "Vidalı Kompresör",
      brand: "Atlas Copco",
      model: "GA 37",
      serialNumber: "AC-77821",
      installationDate: new Date("2023-11-02T00:00:00.000Z"),
      location: "Kompresör odası",
    },
  });

  async function createVisit(input: Prisma.ServiceVisitCreateInput & { technicianIds?: string[] }) {
    const { technicianIds = [], ...data } = input;
    const status = data.status ?? (technicianIds.length > 0 ? "ASSIGNED" : "PLANNED");
    return prisma.serviceVisit.create({
      data: {
        ...data,
        status,
        assignments: { create: technicianIds.map((userId) => ({ userId })) },
        statusHistory: {
          create: {
            changedById: admin.id,
            previousStatus: null,
            newStatus: status,
            note: "Servis ziyareti oluşturuldu.",
          },
        },
      },
    });
  }

  const breakdown = await createVisit({
    organization: { connect: { id: north.id } },
    customer: { connect: { id: marmara.id } },
    equipment: { connect: { id: chiller.id } },
    createdBy: { connect: { id: manager.id } },
    title: "Chiller yüksek basınç arızası",
    description: "Ünite alarm veriyor, soğutma kesildi.",
    serviceType: "BREAKDOWN",
    priority: "URGENT",
    status: "IN_PROGRESS",
    plannedDate: at(11, 1, 8),
    actualStartDate: at(11, 1, 9),
    technicianIds: [elif.id, can.id],
  });

  await prisma.serviceComment.create({
    data: {
      serviceVisitId: breakdown.id,
      userId: elif.id,
      content: "Gaz kaçağı kontrolü başladı. Manometre değerleri kayda alındı.",
    },
  });
  await prisma.serviceStatusHistory.create({
    data: {
      serviceVisitId: breakdown.id,
      changedById: elif.id,
      previousStatus: "ASSIGNED",
      newStatus: "IN_PROGRESS",
      note: "Sahaya varıldı.",
    },
  });

  const maintenance = await createVisit({
    organization: { connect: { id: north.id } },
    customer: { connect: { id: marmara.id } },
    equipment: { connect: { id: chiller.id } },
    createdBy: { connect: { id: manager.id } },
    title: "Aylık periyodik bakım",
    description: "Filtre ve elektrik bağlantı kontrolü.",
    serviceType: "MAINTENANCE",
    priority: "NORMAL",
    status: "ASSIGNED",
    plannedDate: at(11, 5),
    technicianIds: [elif.id],
  });

  await createVisit({
    organization: { connect: { id: north.id } },
    customer: { connect: { id: ege.id } },
    equipment: { connect: { id: compressor.id } },
    createdBy: { connect: { id: admin.id } },
    title: "Yedek parça bekleniyor",
    description: "Conta seti siparişte.",
    serviceType: "BREAKDOWN",
    priority: "HIGH",
    status: "WAITING",
    plannedDate: at(11, 3),
    technicianIds: [can.id],
  });

  const installation = await createVisit({
    organization: { connect: { id: north.id } },
    customer: { connect: { id: ege.id } },
    equipment: { connect: { id: compressor.id } },
    createdBy: { connect: { id: admin.id } },
    title: "Kompresör devreye alma",
    description: "Kurulum tamamlandı ve test edildi.",
    serviceType: "INSTALLATION",
    priority: "NORMAL",
    status: "COMPLETED",
    plannedDate: at(10, 28),
    actualStartDate: at(10, 28, 10),
    actualEndDate: at(10, 28, 16),
    sapReferenceNumber: null,
    technicianIds: [elif.id],
  });

  const stream = "BT /F1 18 Tf 72 760 Td (ServisPilot servis formu) Tj ET\n";
  const pdf = Buffer.from(
    `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${Buffer.byteLength(stream)}>>stream
${stream}endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`,
  );
  const stored = await localFileStorage.savePdf({ organizationId: north.id, bytes: pdf });
  await prisma.attachment.create({
    data: {
      organizationId: north.id,
      serviceVisitId: installation.id,
      uploadedById: elif.id,
      originalFileName: "servis-formu.pdf",
      storagePath: stored.storagePath,
      mimeType: "application/pdf",
      fileSize: pdf.length,
      documentType: "SERVICE_REPORT",
    },
  });

  console.log("Seed completed.");
  console.log(`North org visits: breakdown ${breakdown.id}, maintenance ${maintenance.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
