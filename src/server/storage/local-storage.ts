import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";
import type { FileStorage } from "@/server/storage/types";

const PDF_MAGIC = "%PDF";
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IMAGE_MIME: Record<"jpg" | "jpeg" | "png" | "webp", string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function storageRoot() {
  const configured = process.env.STORAGE_DIR?.trim() || "storage/uploads";
  const root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
  const publicDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "public");
  if (root === publicDir || root.startsWith(publicDir + path.sep)) {
    throw new Error("Storage directory must stay outside the public web directory.");
  }
  return root;
}

export function resolveStoragePath(storagePath: string) {
  if (!storagePath || storagePath.includes("\0") || path.isAbsolute(storagePath)) {
    throw new AppError("Geçersiz dosya yolu.");
  }
  const root = storageRoot();
  const full = path.resolve(/*turbopackIgnore: true*/ root, storagePath);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new AppError("Geçersiz dosya yolu.");
  }
  return full;
}

export function assertPdfUpload(file: File, bytes: Buffer) {
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) {
    throw new AppError("PDF dosyası boş olamaz ve 10 MB sınırını aşamaz.");
  }
  if (path.extname(file.name).toLowerCase() !== ".pdf") {
    throw new AppError("Yalnızca .pdf uzantılı dosyalar yüklenebilir.");
  }
  if (file.type && file.type !== "application/pdf") {
    throw new AppError("Dosyanın MIME türü application/pdf olmalıdır.");
  }
  if (!bytes.subarray(0, 4).toString("utf8").startsWith(PDF_MAGIC)) {
    throw new AppError("Dosya içeriği geçerli bir PDF değil.");
  }
}

export function safeDownloadName(name: string) {
  const base = path
    .basename(name)
    .replace(/[^\w.\- ()ğıüşöçİĞÜŞÖÇ]/g, "_")
    .slice(0, 120);
  if (!base) return "servis-formu.pdf";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export function assertImageUpload(file: File, bytes: Buffer) {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new AppError("Profil fotoğrafı boş olamaz ve 2 MB sınırını aşamaz.");
  }
  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    throw new AppError("Yalnızca JPG, PNG veya WEBP yüklenebilir.");
  }
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (file.type && !allowed.includes(file.type)) {
    throw new AppError("Dosya türü desteklenmiyor.");
  }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!(isJpeg || isPng || isWebp)) {
    throw new AppError("Dosya içeriği geçerli bir görsel değil.");
  }
  return ext as "jpg" | "jpeg" | "png" | "webp";
}

export function imageMimeFromPath(storagePath: string) {
  const ext = path.extname(storagePath).toLowerCase().replace(".", "") as keyof typeof IMAGE_MIME;
  return IMAGE_MIME[ext] ?? "application/octet-stream";
}

export const localFileStorage: FileStorage = {
  async savePdf({ organizationId, bytes }) {
    if (!UUID_PATTERN.test(organizationId)) {
      throw new AppError("Geçersiz organizasyon.");
    }
    const storagePath = path.posix.join(organizationId, `${randomUUID()}.pdf`);
    const fullPath = resolveStoragePath(storagePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, bytes);
    return { storagePath };
  },
  async saveImage({ organizationId, bytes, extension }) {
    if (!UUID_PATTERN.test(organizationId)) {
      throw new AppError("Geçersiz organizasyon.");
    }
    const normalized = extension === "jpeg" ? "jpg" : extension;
    const storagePath = path.posix.join(organizationId, "avatars", `${randomUUID()}.${normalized}`);
    const fullPath = resolveStoragePath(storagePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, bytes);
    return { storagePath };
  },
  async read(storagePath) {
    return readFile(resolveStoragePath(storagePath));
  },
  async remove(storagePath) {
    await rm(resolveStoragePath(storagePath), { force: true });
  },
};
