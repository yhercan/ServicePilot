"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireActor } from "@/lib/auth";
import { parseDateOnly } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { assertCanManageOperations, equipmentWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { equipmentSchema } from "@/modules/equipment/schema";

function equipmentFields(input: ReturnType<typeof equipmentSchema.parse>) {
  return {
    customerId: input.customerId,
    name: input.name,
    brand: input.brand,
    model: input.model,
    serialNumber: input.serialNumber,
    installationDate: input.installationDate ? parseDateOnly(input.installationDate) : null,
    warrantyEndDate: input.warrantyEndDate ? parseDateOnly(input.warrantyEndDate) : null,
    contractEndDate: input.contractEndDate ? parseDateOnly(input.contractEndDate) : null,
    location: input.location,
    notes: input.notes,
  };
}

function parseEquipment(formData: FormData) {
  return equipmentSchema.safeParse({
    ...Object.fromEntries(formData),
    teamIds: formData.getAll("teamIds").map(String).filter(Boolean),
  });
}

async function customerInOrganization(organizationId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { id: true },
  });
  return Boolean(customer);
}

async function assertTeamsInOrganization(organizationId: string, teamIds: string[]) {
  const unique = [...new Set(teamIds)];
  if (unique.length === 0) return [];
  const teams = await prisma.team.findMany({
    where: { organizationId, id: { in: unique }, isActive: true },
    select: { id: true },
  });
  if (teams.length !== unique.length) {
    throw new AppError("Seçilen ekiplerden bazıları bulunamadı.");
  }
  return unique;
}

export async function createEquipment(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageOperations(actor);
    const parsed = parseEquipment(formData);
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    if (!(await customerInOrganization(actor.organizationId, parsed.data.customerId))) {
      return { error: "Seçilen müşteri bu organizasyona ait değil." };
    }
    const teamIds = await assertTeamsInOrganization(actor.organizationId, parsed.data.teamIds);

    const equipment = await prisma.$transaction(async (tx) => {
      const created = await tx.equipment.create({
        data: {
          ...equipmentFields(parsed.data),
          organizationId: actor.organizationId,
          teamLinks: {
            create: teamIds.map((teamId) => ({ teamId })),
          },
        },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "equipment.create",
          entityType: "Equipment",
          entityId: created.id,
        },
        tx,
      );
      return created;
    });
    id = equipment.id;
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/ekipmanlar");
  revalidatePath("/panel");
  redirect(`/ekipmanlar/${id}`);
}

export async function updateEquipment(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageOperations(actor);
    id = String(formData.get("id") ?? "");
    const parsed = parseEquipment(formData);
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    if (!(await customerInOrganization(actor.organizationId, parsed.data.customerId))) {
      return { error: "Seçilen müşteri bu organizasyona ait değil." };
    }
    const teamIds = await assertTeamsInOrganization(actor.organizationId, parsed.data.teamIds);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.equipment.findFirst({
        where: { AND: [{ id }, equipmentWhere(actor)] },
        select: { id: true },
      });
      if (!existing) return null;
      await tx.equipmentTeam.deleteMany({ where: { equipmentId: existing.id } });
      const result = await tx.equipment.update({
        where: { id: existing.id },
        data: {
          ...equipmentFields(parsed.data),
          teamLinks: {
            create: teamIds.map((teamId) => ({ teamId })),
          },
        },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "equipment.update",
          entityType: "Equipment",
          entityId: result.id,
        },
        tx,
      );
      return result;
    });
    if (!updated) return { error: "Ekipman bulunamadı." };
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/ekipmanlar");
  revalidatePath(`/ekipmanlar/${id}`);
  redirect(`/ekipmanlar/${id}`);
}

export async function deleteEquipment(formData: FormData) {
  const actor = await requireActor();
  assertCanManageOperations(actor);
  const id = String(formData.get("id") ?? "");
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.equipment.findFirst({
        where: { AND: [{ id }, equipmentWhere(actor)] },
        select: { id: true },
      });
      if (!existing) return;
      await tx.equipment.delete({ where: { id: existing.id } });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "equipment.delete",
          entityType: "Equipment",
          entityId: existing.id,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect(
        `/ekipmanlar/${id}?hata=${encodeURIComponent("Bu ekipmana bağlı servis kaydı olduğu için silinemiyor.")}`,
      );
    }
    throw error;
  }

  revalidatePath("/ekipmanlar");
  revalidatePath("/panel");
  redirect("/ekipmanlar");
}
