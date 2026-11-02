-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarPath" TEXT;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "warrantyEndDate" DATE,
ADD COLUMN "contractEndDate" DATE;

-- CreateIndex
CREATE INDEX "Equipment_organizationId_warrantyEndDate_idx" ON "Equipment"("organizationId", "warrantyEndDate");

-- CreateIndex
CREATE INDEX "Equipment_organizationId_contractEndDate_idx" ON "Equipment"("organizationId", "contractEndDate");

-- AlterTable
ALTER TABLE "ServiceVisit" ADD COLUMN "nextVisitEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nextVisitDate" TIMESTAMP(3),
ADD COLUMN "nextVisitType" "ServiceType",
ADD COLUMN "nextVisitNotifiedAt" TIMESTAMP(3),
ADD COLUMN "nextVisitReminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ServiceVisit_organizationId_nextVisitEnabled_nextVisitDate_idx" ON "ServiceVisit"("organizationId", "nextVisitEnabled", "nextVisitDate");

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEXT_VISIT_SCHEDULED', 'NEXT_VISIT_REMINDER', 'VISIT_ASSIGNED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notifyNextVisitScheduled" BOOLEAN NOT NULL DEFAULT true,
    "notifyNextVisitReminder" BOOLEAN NOT NULL DEFAULT true,
    "notifyVisitAssigned" BOOLEAN NOT NULL DEFAULT true,
    "showUpcomingOnDashboard" BOOLEAN NOT NULL DEFAULT true,
    "showFollowUpsOnDashboard" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_organizationId_userId_key" ON "UserSettings"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
