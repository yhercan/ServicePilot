import "server-only";
import { localFileStorage } from "@/server/storage/local-storage";
import type { FileStorage } from "@/server/storage/types";

export const fileStorage: FileStorage = localFileStorage;
