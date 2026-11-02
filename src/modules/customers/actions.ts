"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireActor } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertCanManageOperations, customerWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { customerContactSchema, customerSchema } from "@/modules/customers/schema";

function customerData(input: ReturnType<typeof customerSchema.parse>, organizationId: string) {
  return {
    companyName: input.companyName,
    contactPerson: input.contactPerson,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
    notes: input.notes,
    operationsManagerId: input.operationsManagerId,
    organizationId,
  };
}

async function assertOperationsManager(organizationId: string, userId: string | null) {
  if (!userId) return null;
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId,
      userId,
      role: { in: ["OPERATIONS_MANAGER", "ADMIN"] },
    },
    select: { userId: true },
  });
  if (!membership) throw new AppError("Seçilen operasyon sorumlusu geçersiz.");
  return userId;
}

export async function createCustomer(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageOperations(actor);
    const parsed = customerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    let operationsManagerId = await assertOperationsManager(
      actor.organizationId,
      parsed.data.operationsManagerId,
    );
    if (!operationsManagerId && actor.role === "OPERATIONS_MANAGER") {
      operationsManagerId = actor.userId;
    }

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          ...customerData({ ...parsed.data, operationsManagerId }, actor.organizationId),
          contacts: {
            create: {
              organizationId: actor.organizationId,
              fullName: parsed.data.contactPerson,
              email: parsed.data.email,
              phone: parsed.data.phone,
              isPrimary: true,
            },
          },
        },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "customer.create",
          entityType: "Customer",
          entityId: created.id,
        },
        tx,
      );
      return created;
    });
    id = customer.id;
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/musteriler");
  revalidatePath("/panel");
  redirect(`/musteriler/${id}`);
}

export async function updateCustomer(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageOperations(actor);
    id = String(formData.get("id") ?? "");
    const parsed = customerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const operationsManagerId = await assertOperationsManager(
      actor.organizationId,
      parsed.data.operationsManagerId,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: { AND: [{ id }, customerWhere(actor)] },
        select: { id: true },
      });
      if (!existing) return null;
      const result = await tx.customer.update({
        where: { id: existing.id },
        data: customerData({ ...parsed.data, operationsManagerId }, actor.organizationId),
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "customer.update",
          entityType: "Customer",
          entityId: result.id,
        },
        tx,
      );
      return result;
    });
    if (!updated) return { error: "Müşteri bulunamadı." };
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/musteriler");
  revalidatePath(`/musteriler/${id}`);
  redirect(`/musteriler/${id}`);
}

export async function deleteCustomer(formData: FormData) {
  const actor = await requireActor();
  assertCanManageOperations(actor);
  const id = String(formData.get("id") ?? "");
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findFirst({
        where: { AND: [{ id }, customerWhere(actor)] },
        select: { id: true },
      });
      if (!existing) return;
      await tx.customer.delete({ where: { id: existing.id } });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "customer.delete",
          entityType: "Customer",
          entityId: existing.id,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect(
        `/musteriler/${id}?hata=${encodeURIComponent("Bağlı ekipman veya servis kaydı olduğu için müşteri silinemiyor.")}`,
      );
    }
    throw error;
  }

  revalidatePath("/musteriler");
  revalidatePath("/panel");
  redirect("/musteriler");
}

export async function createCustomerContact(formData: FormData) {
  const actor = await requireActor();
  assertCanManageOperations(actor);
  const customerId = String(formData.get("customerId") ?? "");
  const parsed = customerContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/musteriler/${customerId}?hata=${encodeURIComponent("İletişim kişisi bilgileri geçersiz.")}`);
  }

  const customer = await prisma.customer.findFirst({
    where: { AND: [{ id: customerId }, customerWhere(actor)] },
    select: { id: true },
  });
  if (!customer) {
    redirect(`/musteriler?hata=${encodeURIComponent("Müşteri bulunamadı.")}`);
  }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx.customerContact.updateMany({
        where: { customerId: customer.id },
        data: { isPrimary: false },
      });
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          contactPerson: parsed.data.fullName,
          email: parsed.data.email,
          phone: parsed.data.phone,
        },
      });
    }
    const contact = await tx.customerContact.create({
      data: {
        organizationId: actor.organizationId,
        customerId: customer.id,
        fullName: parsed.data.fullName,
        jobTitle: parsed.data.jobTitle,
        phone: parsed.data.phone,
        email: parsed.data.email,
        notes: parsed.data.notes,
        isPrimary: parsed.data.isPrimary,
      },
    });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "customerContact.create",
        entityType: "CustomerContact",
        entityId: contact.id,
      },
      tx,
    );
  });

  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}`);
}

export async function deleteCustomerContact(formData: FormData) {
  const actor = await requireActor();
  assertCanManageOperations(actor);
  const id = String(formData.get("id") ?? "");
  const customerId = String(formData.get("customerId") ?? "");

  await prisma.$transaction(async (tx) => {
    const contact = await tx.customerContact.findFirst({
      where: {
        id,
        customerId,
        organizationId: actor.organizationId,
        customer: customerWhere(actor),
      },
      select: { id: true },
    });
    if (!contact) return;
    await tx.customerContact.delete({ where: { id: contact.id } });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "customerContact.delete",
        entityType: "CustomerContact",
        entityId: contact.id,
      },
      tx,
    );
  });

  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}`);
}
