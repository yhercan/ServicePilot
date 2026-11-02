export type StoredFile = {
  storagePath: string;
};

export interface FileStorage {
  savePdf(input: { organizationId: string; bytes: Buffer }): Promise<StoredFile>;
  saveImage(input: {
    organizationId: string;
    bytes: Buffer;
    extension: "jpg" | "jpeg" | "png" | "webp";
  }): Promise<StoredFile>;
  read(storagePath: string): Promise<Buffer>;
  remove(storagePath: string): Promise<void>;
}
