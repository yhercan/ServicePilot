-- CreateTable
CREATE TABLE "EquipmentTeam" (
    "id" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentTeam_teamId_idx" ON "EquipmentTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentTeam_equipmentId_teamId_key" ON "EquipmentTeam"("equipmentId", "teamId");

-- AddForeignKey
ALTER TABLE "EquipmentTeam" ADD CONSTRAINT "EquipmentTeam_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentTeam" ADD CONSTRAINT "EquipmentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
