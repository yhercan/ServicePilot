-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'TEAMS');

-- Remap membership roles without dropping data
CREATE TYPE "MembershipRole_new" AS ENUM ('ADMIN', 'OPERATIONS_MANAGER', 'TEAM_LEADER', 'SERVICE_ENGINEER');

ALTER TABLE "Membership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Membership"
  ALTER COLUMN "role" TYPE "MembershipRole_new"
  USING (
    CASE "role"::text
      WHEN 'SERVICE_MANAGER' THEN 'OPERATIONS_MANAGER'
      WHEN 'TECHNICIAN' THEN 'SERVICE_ENGINEER'
      ELSE "role"::text
    END
  )::"MembershipRole_new";

DROP TYPE "MembershipRole";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leaderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementTeam" (
    "id" UUID NOT NULL,
    "announcementId" UUID NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "AnnouncementTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEntry" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entryDate" DATE NOT NULL,
    "customerId" UUID,
    "equipmentId" UUID,
    "serviceVisitId" UUID,
    "serviceType" "ServiceType",
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "ServiceStatus" NOT NULL DEFAULT 'PLANNED',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEntryAssignment" (
    "id" UUID NOT NULL,
    "calendarEntryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEntryAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "operationsManagerId" UUID;

-- AlterTable
ALTER TABLE "ServiceVisit" ADD COLUMN "teamId" UUID;

-- Backfill primary contacts from legacy contactPerson
INSERT INTO "CustomerContact" (
  "id", "organizationId", "customerId", "fullName", "phone", "email", "isPrimary", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  c."organizationId",
  c."id",
  c."contactPerson",
  c."phone",
  c."email",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Customer" c
WHERE NOT EXISTS (
  SELECT 1 FROM "CustomerContact" cc WHERE cc."customerId" = c."id"
);

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "Team_organizationId_isActive_idx" ON "Team"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "Team_leaderId_idx" ON "Team"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_organizationId_name_key" ON "Team"("organizationId", "name");

-- CreateIndex
CREATE INDEX "TeamMembership_userId_idx" ON "TeamMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_teamId_userId_key" ON "TeamMembership"("teamId", "userId");

-- CreateIndex
CREATE INDEX "CustomerContact_organizationId_idx" ON "CustomerContact"("organizationId");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_isPrimary_idx" ON "CustomerContact"("customerId", "isPrimary");

-- CreateIndex
CREATE INDEX "Customer_operationsManagerId_idx" ON "Customer"("operationsManagerId");

-- CreateIndex
CREATE INDEX "ServiceVisit_teamId_idx" ON "ServiceVisit"("teamId");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_idx" ON "Announcement"("organizationId");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_status_publishedAt_idx" ON "Announcement"("organizationId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_createdById_idx" ON "Announcement"("createdById");

-- CreateIndex
CREATE INDEX "AnnouncementTeam_teamId_idx" ON "AnnouncementTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementTeam_announcementId_teamId_key" ON "AnnouncementTeam"("announcementId", "teamId");

-- CreateIndex
CREATE INDEX "CalendarEntry_organizationId_idx" ON "CalendarEntry"("organizationId");

-- CreateIndex
CREATE INDEX "CalendarEntry_teamId_entryDate_idx" ON "CalendarEntry"("teamId", "entryDate");

-- CreateIndex
CREATE INDEX "CalendarEntry_organizationId_entryDate_idx" ON "CalendarEntry"("organizationId", "entryDate");

-- CreateIndex
CREATE INDEX "CalendarEntry_serviceVisitId_idx" ON "CalendarEntry"("serviceVisitId");

-- CreateIndex
CREATE INDEX "CalendarEntry_customerId_idx" ON "CalendarEntry"("customerId");

-- CreateIndex
CREATE INDEX "CalendarEntry_createdById_idx" ON "CalendarEntry"("createdById");

-- CreateIndex
CREATE INDEX "CalendarEntryAssignment_userId_idx" ON "CalendarEntryAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEntryAssignment_calendarEntryId_userId_key" ON "CalendarEntryAssignment"("calendarEntryId", "userId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_operationsManagerId_fkey" FOREIGN KEY ("operationsManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVisit" ADD CONSTRAINT "ServiceVisit_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTeam" ADD CONSTRAINT "AnnouncementTeam_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTeam" ADD CONSTRAINT "AnnouncementTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_serviceVisitId_fkey" FOREIGN KEY ("serviceVisitId") REFERENCES "ServiceVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntryAssignment" ADD CONSTRAINT "CalendarEntryAssignment_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "CalendarEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEntryAssignment" ADD CONSTRAINT "CalendarEntryAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
