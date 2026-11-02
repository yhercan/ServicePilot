import { getActor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fileStorage } from "@/server/storage";
import { imageMimeFromPath } from "@/server/storage/local-storage";

export async function GET() {
  const actor = await getActor();
  if (!actor) {
    return new Response("Oturum gerekli.", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { avatarPath: true },
  });
  if (!user?.avatarPath) {
    return new Response("Profil fotoğrafı yok.", { status: 404 });
  }

  const bytes = await fileStorage.read(user.avatarPath);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": imageMimeFromPath(user.avatarPath),
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
