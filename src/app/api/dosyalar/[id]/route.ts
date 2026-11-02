import { getActor } from "@/lib/auth";
import { visitWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fileStorage } from "@/server/storage";
import { safeDownloadName } from "@/server/storage/local-storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor) {
    return new Response("Oturum gerekli.", { status: 401 });
  }

  const { id } = await context.params;
  const attachment = await prisma.attachment.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      serviceVisit: visitWhere(actor),
    },
  });
  if (!attachment || attachment.mimeType !== "application/pdf") {
    return new Response("Dosya bulunamadı.", { status: 404 });
  }

  const bytes = await fileStorage.read(attachment.storagePath);
  const filename = safeDownloadName(attachment.originalFileName);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename.replaceAll('"', "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
