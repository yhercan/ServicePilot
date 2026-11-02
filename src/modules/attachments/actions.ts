"use server";

import { revalidatePath } from "next/cache";
import { actionError, type ActionState } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireActor } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { visitWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fileStorage } from "@/server/storage";
import { assertPdfUpload } from "@/server/storage/local-storage";

export async function uploadServiceReport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const visitId = String(formData.get("id") ?? "");
  try {
    const actor = await requireActor();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Yüklenecek PDF dosyasını seçin." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    assertPdfUpload(file, bytes);

    const visit = await prisma.serviceVisit.findFirst({
      where: { AND: [{ id: visitId }, visitWhere(actor)] },
      select: { id: true },
    });
    if (!visit) return { error: "Servis ziyareti bulunamadı." };

    const stored = await fileStorage.savePdf({
      organizationId: actor.organizationId,
      bytes,
    });
    try {
      await prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            organizationId: actor.organizationId,
            serviceVisitId: visit.id,
            uploadedById: actor.userId,
            originalFileName: file.name,
            storagePath: stored.storagePath,
            mimeType: "application/pdf",
            fileSize: bytes.length,
            documentType: "SERVICE_REPORT",
          },
        });
        await writeAudit(
          {
            organizationId: actor.organizationId,
            userId: actor.userId,
            action: "attachment.upload",
            entityType: "Attachment",
            entityId: attachment.id,
          },
          tx,
        );
      });
    } catch (error) {
      await fileStorage.remove(stored.storagePath).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return actionError(error);
  }

  revalidatePath(`/servisler/${visitId}`);
  return {};
}

export async function deleteAttachment(formData: FormData) {
  const actor = await requireActor();
  const id = String(formData.get("id") ?? "");
  const attachment = await prisma.attachment.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      serviceVisit: visitWhere(actor),
    },
  });
  if (!attachment) {
    throw new AppError("Dosya bulunamadı.");
  }
  const canDelete =
    assertAllowed(actor.role, actor.userId, attachment.uploadedById) ;
  if (!canDelete) {
    throw new AppError("Bu dosyayı silme yetkiniz yok.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id: attachment.id } });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "attachment.delete",
        entityType: "Attachment",
        entityId: attachment.id,
      },
      tx,
    );
  });
  try {
    await fileStorage.remove(attachment.storagePath);
  } catch {
    console.error("Stored file could not be removed after attachment delete.");
  }
  revalidatePath(`/servisler/${attachment.serviceVisitId}`);
}

function assertAllowed(
  role: "ADMIN" | "OPERATIONS_MANAGER" | "TEAM_LEADER" | "SERVICE_ENGINEER",
  userId: string,
  uploadedById: string,
) {
  if (role === "ADMIN" || role === "OPERATIONS_MANAGER" || role === "TEAM_LEADER") return true;
  return userId === uploadedById;
}
